package auth

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/yone-k/go-zaim"
)

type fakeZaim struct {
	t             *testing.T
	callbackURL   string
	requestKey    string
	requestSecret string
	exchanged     []string
	saved         *zaim.OAuthConfig
}

func (f *fakeZaim) flow(in string, out *bytes.Buffer, browser func(authorizeURL string) error) *Flow {
	return &Flow{
		In:      strings.NewReader(in),
		Out:     out,
		Port:    0,
		Timeout: 5 * time.Second,
		RequestToken: func(_ context.Context, key, secret, callbackURL string) (string, string, error) {
			f.requestKey, f.requestSecret, f.callbackURL = key, secret, callbackURL
			return "request-token", "request-token-secret", nil
		},
		AuthorizeURL: func(token string) string { return "https://auth.example/users/auth?oauth_token=" + token },
		ExchangeAccessToken: func(_ context.Context, key, secret, token, tokenSecret, verifier string) (string, string, error) {
			f.exchanged = []string{key, secret, token, tokenSecret, verifier}
			return "access-token", "access-token-secret", nil
		},
		OpenBrowser: browser,
		Save: func(credentials zaim.OAuthConfig) (string, error) {
			f.saved = &credentials
			return "/saved/credentials.json", nil
		},
	}
}

func (f *fakeZaim) visit(query string) int {
	f.t.Helper()
	response, err := http.Get(f.callbackURL + query)
	if err != nil {
		f.t.Error(err)
		return 0
	}
	_ = response.Body.Close()
	return response.StatusCode
}

func setConsumer(t *testing.T, key, secret string) {
	t.Setenv("ZAIM_CONSUMER_KEY", key)
	t.Setenv("ZAIM_CONSUMER_SECRET", secret)
}

func TestLoginSavesAccessTokenReceivedByCallback(t *testing.T) {
	setConsumer(t, "env-key", "env-secret")
	fake := &fakeZaim{t: t}
	var out bytes.Buffer
	var opened string
	err := fake.flow("", &out, func(authorizeURL string) error {
		opened = authorizeURL
		if status := fake.visit("/extra"); status != http.StatusNotFound {
			t.Errorf("unrelated path status = %d", status)
		}
		if status := fake.visit("?oauth_token=request-token"); status != http.StatusBadRequest {
			t.Errorf("missing verifier status = %d", status)
		}
		if status := fake.visit("?oauth_token=request-token&oauth_verifier=verifier"); status != http.StatusOK {
			t.Errorf("callback status = %d", status)
		}
		return nil
	}).Login(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if fake.requestKey != "env-key" || fake.requestSecret != "env-secret" || !strings.HasPrefix(fake.callbackURL, "http://localhost:") || !strings.HasSuffix(fake.callbackURL, "/callback") {
		t.Errorf("request token args = %q %q %q", fake.requestKey, fake.requestSecret, fake.callbackURL)
	}
	if opened != "https://auth.example/users/auth?oauth_token=request-token" || !strings.Contains(out.String(), opened) {
		t.Errorf("opened = %q, out = %s", opened, out.String())
	}
	if strings.Join(fake.exchanged, ",") != "env-key,env-secret,request-token,request-token-secret,verifier" {
		t.Errorf("exchange args = %v", fake.exchanged)
	}
	want := zaim.OAuthConfig{ConsumerKey: "env-key", ConsumerSecret: "env-secret", AccessToken: "access-token", AccessTokenSecret: "access-token-secret"}
	if fake.saved == nil || *fake.saved != want {
		t.Errorf("saved = %+v", fake.saved)
	}
	if !strings.Contains(out.String(), "/saved/credentials.json") {
		t.Errorf("out = %s", out.String())
	}
	if strings.Contains(out.String(), "access-token") || strings.Contains(out.String(), "env-secret") {
		t.Errorf("credential printed: %s", out.String())
	}
}

func TestLoginPromptsForMissingConsumerCredentials(t *testing.T) {
	setConsumer(t, "", " ")
	fake := &fakeZaim{t: t}
	var out bytes.Buffer
	err := fake.flow(" prompt-key \nprompt-secret\n", &out, func(string) error {
		fake.visit("?oauth_token=request-token&oauth_verifier=verifier")
		return nil
	}).Login(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if fake.requestKey != "prompt-key" || fake.requestSecret != "prompt-secret" {
		t.Errorf("consumer = %q %q", fake.requestKey, fake.requestSecret)
	}
	if !strings.Contains(out.String(), "Consumer Key: ") || !strings.Contains(out.String(), "Consumer Secret: ") {
		t.Errorf("prompts = %s", out.String())
	}
}

func TestLoginRejectsEmptyPromptedCredential(t *testing.T) {
	setConsumer(t, "", "")
	fake := &fakeZaim{t: t}
	var out bytes.Buffer
	err := fake.flow("\n", &out, nil).Login(t.Context())
	if err == nil || !strings.Contains(err.Error(), "Consumer Key") || fake.requestKey != "" {
		t.Errorf("err = %v, requested = %q", err, fake.requestKey)
	}
}

func TestLoginStopsPromptWhenCancelled(t *testing.T) {
	setConsumer(t, "", "")
	fake := &fakeZaim{t: t}
	reader, writer := io.Pipe()
	defer writer.Close()
	flow := fake.flow("", &bytes.Buffer{}, nil)
	flow.In = reader
	ctx, cancel := context.WithCancel(t.Context())
	time.AfterFunc(20*time.Millisecond, cancel)
	if err := flow.Login(ctx); !errors.Is(err, context.Canceled) || fake.requestKey != "" {
		t.Errorf("err = %v, requested = %q", err, fake.requestKey)
	}
}

func TestLoginRejectsCallbackForAnotherRequestToken(t *testing.T) {
	setConsumer(t, "env-key", "env-secret")
	fake := &fakeZaim{t: t}
	var out bytes.Buffer
	err := fake.flow("", &out, func(string) error {
		if status := fake.visit("?oauth_token=forged&oauth_verifier=verifier"); status != http.StatusBadRequest {
			t.Errorf("forged callback status = %d", status)
		}
		return nil
	}).Login(t.Context())
	if err == nil || !strings.Contains(err.Error(), "oauth_token") {
		t.Fatalf("err = %v", err)
	}
	if fake.exchanged != nil || fake.saved != nil {
		t.Errorf("exchanged = %v, saved = %+v", fake.exchanged, fake.saved)
	}
}

func TestLoginContinuesWhenBrowserCannotOpen(t *testing.T) {
	setConsumer(t, "env-key", "env-secret")
	fake := &fakeZaim{t: t}
	var out bytes.Buffer
	status := make(chan int, 1)
	err := fake.flow("", &out, func(string) error {
		go func() {
			response, err := http.Get(fake.callbackURL + "?oauth_token=request-token&oauth_verifier=verifier")
			if err != nil {
				status <- 0
				return
			}
			_, _ = io.ReadAll(response.Body)
			_ = response.Body.Close()
			status <- response.StatusCode
		}()
		return errors.New("no browser")
	}).Login(t.Context())
	if err != nil || fake.saved == nil {
		t.Fatalf("err = %v, saved = %+v", err, fake.saved)
	}
	if !strings.Contains(out.String(), "no browser") {
		t.Errorf("out = %s", out.String())
	}
	if code := <-status; code != http.StatusOK {
		t.Errorf("browser did not receive the completion page: status %d", code)
	}
}

func TestLoginStopsWaitingAtTimeoutOrCancellation(t *testing.T) {
	setConsumer(t, "env-key", "env-secret")
	t.Run("timeout", func(t *testing.T) {
		fake := &fakeZaim{t: t}
		var out bytes.Buffer
		flow := fake.flow("", &out, func(string) error { return nil })
		flow.Timeout = 50 * time.Millisecond
		if err := flow.Login(t.Context()); !errors.Is(err, context.DeadlineExceeded) || fake.saved != nil {
			t.Errorf("err = %v, saved = %+v", err, fake.saved)
		}
	})
	t.Run("cancel", func(t *testing.T) {
		fake := &fakeZaim{t: t}
		var out bytes.Buffer
		ctx, cancel := context.WithCancel(t.Context())
		err := fake.flow("", &out, func(string) error { cancel(); return nil }).Login(ctx)
		if !errors.Is(err, context.Canceled) || fake.saved != nil {
			t.Errorf("err = %v, saved = %+v", err, fake.saved)
		}
	})
}

func TestLoginReportsRequestTokenFailureWithoutOpeningBrowser(t *testing.T) {
	setConsumer(t, "env-key", "env-secret")
	fake := &fakeZaim{t: t}
	var out bytes.Buffer
	flow := fake.flow("", &out, func(string) error { t.Error("browser opened"); return nil })
	flow.RequestToken = func(context.Context, string, string, string) (string, string, error) {
		return "", "", errors.New("zaim unavailable")
	}
	if err := flow.Login(t.Context()); err == nil || !strings.Contains(err.Error(), "zaim unavailable") {
		t.Errorf("err = %v", err)
	}
}

func TestMainRejectsUnknownUsage(t *testing.T) {
	for _, args := range [][]string{nil, {"logout"}, {"login", "--port", "x"}, {"login", "extra"}} {
		var out, errOut bytes.Buffer
		if code := Main(t.Context(), args, strings.NewReader(""), &out, &errOut); code != 2 {
			t.Errorf("Main(%v) = %d, want 2", args, code)
		}
		if !strings.Contains(errOut.String(), "zaim-api-mcp auth login") {
			t.Errorf("Main(%v) stderr = %s", args, errOut.String())
		}
	}
}
