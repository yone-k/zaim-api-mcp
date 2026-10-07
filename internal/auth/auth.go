package auth

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/yone-k/go-zaim"
	"github.com/yone-k/zaim-api-mcp/internal/config"
)

const usage = `使い方: zaim-api-mcp auth login [--port 8080]

ブラウザでZaimへのアクセスを許可し、取得した認証情報を保存します。
ZAIM_CONSUMER_KEYとZAIM_CONSUMER_SECRETが設定されていればそれを使い、なければ入力を求めます。
`

// Flow is the OAuth 1.0a authorization performed by "zaim-api-mcp auth login".
type Flow struct {
	In                  io.Reader
	Out                 io.Writer
	Port                int
	Timeout             time.Duration
	RequestToken        func(ctx context.Context, consumerKey, consumerSecret, callbackURL string) (string, string, error)
	AuthorizeURL        func(oauthToken string) string
	ExchangeAccessToken func(ctx context.Context, consumerKey, consumerSecret, oauthToken, oauthTokenSecret, oauthVerifier string) (string, string, error)
	OpenBrowser         func(url string) error
	Save                func(zaim.OAuthConfig) (string, error)
}

type callback struct {
	verifier string
	err      error
}

// Main runs the auth subcommand and returns the process exit code.
func Main(ctx context.Context, args []string, in io.Reader, out, errOut io.Writer) int {
	if len(args) == 0 || args[0] != "login" {
		fmt.Fprint(errOut, usage)
		return 2
	}
	flags := flag.NewFlagSet("zaim-api-mcp auth login", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	port := flags.Int("port", 8080, "callback port")
	if err := flags.Parse(args[1:]); err != nil || flags.NArg() != 0 {
		if errors.Is(err, flag.ErrHelp) {
			fmt.Fprint(out, usage)
			return 0
		}
		fmt.Fprint(errOut, usage)
		return 2
	}
	flow := &Flow{
		In:                  in,
		Out:                 out,
		Port:                *port,
		Timeout:             5 * time.Minute,
		RequestToken:        zaim.RequestToken,
		AuthorizeURL:        zaim.GetAuthorizeURL,
		ExchangeAccessToken: zaim.ExchangeAccessToken,
		OpenBrowser:         openBrowser,
		Save:                config.Save,
	}
	if err := flow.Login(ctx); err != nil {
		fmt.Fprintln(errOut, "認証に失敗しました:", err)
		return 1
	}
	return 0
}

// Login authorizes in the browser and saves the four credentials.
func (f *Flow) Login(ctx context.Context) error {
	reader := bufio.NewReader(f.In)
	consumerKey, err := f.consumerCredential(ctx, reader, "ZAIM_CONSUMER_KEY", "Consumer Key")
	if err != nil {
		return err
	}
	consumerSecret, err := f.consumerCredential(ctx, reader, "ZAIM_CONSUMER_SECRET", "Consumer Secret")
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, f.Timeout)
	defer cancel()
	listener, err := (&net.ListenConfig{}).Listen(ctx, "tcp", fmt.Sprintf("localhost:%d", f.Port))
	if err != nil {
		return fmt.Errorf("コールバック用ポートを開けません: %w", err)
	}
	callbackURL := fmt.Sprintf("http://localhost:%d/callback", listener.Addr().(*net.TCPAddr).Port)

	var oauthToken string
	received := make(chan callback, 1)
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/callback" {
			http.NotFound(w, r)
			return
		}
		token, verifier := r.URL.Query().Get("oauth_token"), r.URL.Query().Get("oauth_verifier")
		if token == "" || verifier == "" {
			http.Error(w, "oauth_token and oauth_verifier are required", http.StatusBadRequest)
			return
		}
		result := callback{verifier: verifier}
		if token != oauthToken {
			result.err = errors.New("コールバックのoauth_tokenが認可要求と一致しません")
			http.Error(w, "oauth_token does not match", http.StatusBadRequest)
		} else {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = io.WriteString(w, "<!doctype html><meta charset=\"utf-8\"><p>Zaimの認可が完了しました。このウィンドウを閉じてください。</p>")
		}
		select {
		case received <- result:
		default:
		}
	})}
	defer func() {
		// Close would cut the completion page that the browser may still be receiving.
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if server.Shutdown(shutdownCtx) != nil {
			_ = server.Close()
		}
	}()

	oauthToken, oauthTokenSecret, err := f.RequestToken(ctx, consumerKey, consumerSecret, callbackURL)
	if err != nil {
		_ = listener.Close()
		return fmt.Errorf("リクエストトークンを取得できません: %w", err)
	}
	go func() { _ = server.Serve(listener) }()

	authorizeURL := f.AuthorizeURL(oauthToken)
	fmt.Fprintf(f.Out, "ブラウザで次のURLを開き、Zaimへのアクセスを許可してください:\n%s\n", authorizeURL)
	if err := f.OpenBrowser(authorizeURL); err != nil {
		fmt.Fprintf(f.Out, "ブラウザを自動で開けませんでした（%v）。上のURLを手動で開いてください。\n", err)
	}

	var result callback
	select {
	case result = <-received:
	case <-ctx.Done():
		return fmt.Errorf("コールバックを受信できませんでした: %w", ctx.Err())
	}
	if result.err != nil {
		return result.err
	}

	accessToken, accessTokenSecret, err := f.ExchangeAccessToken(ctx, consumerKey, consumerSecret, oauthToken, oauthTokenSecret, result.verifier)
	if err != nil {
		return fmt.Errorf("アクセストークンを取得できません: %w", err)
	}
	path, err := f.Save(zaim.OAuthConfig{ConsumerKey: consumerKey, ConsumerSecret: consumerSecret, AccessToken: accessToken, AccessTokenSecret: accessTokenSecret})
	if err != nil {
		return fmt.Errorf("認証情報を保存できません: %w", err)
	}
	fmt.Fprintf(f.Out, "認証情報を保存しました: %s\n", path)
	return nil
}

func (f *Flow) consumerCredential(ctx context.Context, reader *bufio.Reader, name, label string) (string, error) {
	if value := os.Getenv(name); strings.TrimSpace(value) != "" {
		return value, nil
	}
	fmt.Fprintf(f.Out, "%s: ", label)
	type line struct {
		text string
		err  error
	}
	// Reading on the caller's goroutine would ignore Ctrl+C, which the signal context intercepts.
	read := make(chan line, 1)
	go func() {
		text, err := reader.ReadString('\n')
		read <- line{text, err}
	}()
	var input line
	select {
	case input = <-read:
	case <-ctx.Done():
		return "", ctx.Err()
	}
	value := strings.TrimSpace(input.text)
	if value == "" {
		if input.err != nil && !errors.Is(input.err, io.EOF) {
			return "", fmt.Errorf("%sを読み取れません: %w", label, input.err)
		}
		return "", fmt.Errorf("%sが入力されていません", label)
	}
	return value, nil
}

func openBrowser(url string) error {
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", url).Start()
	case "windows":
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}
