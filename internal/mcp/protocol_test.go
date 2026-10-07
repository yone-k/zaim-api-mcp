package mcp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"syscall"
	"testing"
	"time"

	"github.com/modelcontextprotocol/go-sdk/jsonrpc"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/yone-k/zaim-cli/pkg/zaim"
)

var protocolVersions = []string{"2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"}

type wireResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int             `json:"id"`
	Result  json.RawMessage `json:"result"`
	Error   *struct {
		Code    int             `json:"code"`
		Message string          `json:"message"`
		Data    json.RawMessage `json:"data"`
	} `json:"error"`
}

type wirePeer struct {
	input  io.Writer
	output chan []byte
	nextID int
}

func newWirePeer(input io.Writer, output io.Reader) *wirePeer {
	peer := &wirePeer{input: input, output: make(chan []byte, 32)}
	go func() {
		defer close(peer.output)
		scanner := bufio.NewScanner(output)
		scanner.Buffer(make([]byte, 4096), 4<<20)
		for scanner.Scan() {
			peer.output <- bytes.Clone(scanner.Bytes())
		}
	}()
	return peer
}

func modernParams(version string, params map[string]any) map[string]any {
	if params == nil {
		params = make(map[string]any)
	}
	params["_meta"] = map[string]any{mcp.MetaKeyProtocolVersion: version, mcp.MetaKeyClientInfo: map[string]string{"name": "protocol-test", "version": "1"}, mcp.MetaKeyClientCapabilities: map[string]any{}}
	return params
}

func (peer *wirePeer) send(t *testing.T, message any) {
	t.Helper()
	data, err := json.Marshal(message)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := peer.input.Write(append(data, '\n')); err != nil {
		t.Fatal(err)
	}
}

func (peer *wirePeer) request(t *testing.T, method string, params any) wireResponse {
	t.Helper()
	peer.nextID++
	peer.send(t, map[string]any{"jsonrpc": "2.0", "id": peer.nextID, "method": method, "params": params})
	timer := time.NewTimer(5 * time.Second)
	defer timer.Stop()
	for {
		select {
		case data, ok := <-peer.output:
			if !ok {
				t.Fatal("server output closed before response")
			}
			var result wireResponse
			if err := json.Unmarshal(data, &result); err != nil {
				t.Fatalf("non-JSON stdout: %q: %v", data, err)
			}
			if result.JSONRPC != "2.0" {
				t.Fatalf("invalid JSON-RPC: %s", data)
			}
			if result.ID == peer.nextID {
				return result
			}
		case <-timer.C:
			t.Fatalf("timeout waiting for %s", method)
		}
	}
}

func resultObject(t *testing.T, response wireResponse) map[string]json.RawMessage {
	t.Helper()
	if response.Error != nil {
		t.Fatalf("protocol error: %+v", response.Error)
	}
	var result map[string]json.RawMessage
	if err := json.Unmarshal(response.Result, &result); err != nil {
		t.Fatal(err)
	}
	return result
}

func checkToolDefinitions(t *testing.T, result map[string]json.RawMessage) {
	t.Helper()
	var actual []struct {
		Name         string               `json:"name"`
		Description  string               `json:"description"`
		InputSchema  map[string]any       `json:"inputSchema"`
		OutputSchema map[string]any       `json:"outputSchema"`
		Annotations  *mcp.ToolAnnotations `json:"annotations"`
	}
	if err := json.Unmarshal(result["tools"], &actual); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile("../../testdata/tool-definitions.json")
	if err != nil {
		t.Fatal(err)
	}
	var expected []struct {
		Name        string         `json:"name"`
		Description string         `json:"description"`
		InputSchema map[string]any `json:"inputSchema"`
	}
	if err := json.Unmarshal(data, &expected); err != nil {
		t.Fatal(err)
	}
	if len(actual) != len(expected) {
		t.Fatalf("tools = %d, want %d", len(actual), len(expected))
	}
	byName := make(map[string]int)
	for i, tool := range actual {
		byName[tool.Name] = i
	}
	for _, old := range expected {
		i, ok := byName[old.Name]
		if !ok {
			t.Fatalf("missing tool: %s", old.Name)
		}
		tool := actual[i]
		if amount, ok := old.InputSchema["properties"].(map[string]any)["amount"].(map[string]any); ok {
			amount["exclusiveMinimum"] = float64(0)
		}
		if tool.Description != old.Description || !reflect.DeepEqual(tool.InputSchema, old.InputSchema) {
			t.Errorf("definition changed: %s", old.Name)
		}
		if tool.OutputSchema["type"] != "object" {
			t.Errorf("missing outputSchema: %s", old.Name)
		}
		readOnly := !strings.Contains(old.Name, "create_") && !strings.Contains(old.Name, "update_") && old.Name != "zaim_delete_money_record"
		destructive := strings.Contains(old.Name, "update_") || old.Name == "zaim_delete_money_record"
		if tool.Annotations == nil || tool.Annotations.ReadOnlyHint != readOnly || tool.Annotations.DestructiveHint == nil || *tool.Annotations.DestructiveHint != destructive || tool.Annotations.OpenWorldHint == nil || !*tool.Annotations.OpenWorldHint {
			t.Errorf("wrong annotations: %s: %+v", old.Name, tool.Annotations)
		}
	}
}

func TestStdioServer(t *testing.T) {
	image := os.Getenv("ZAIM_MCP_TEST_IMAGE")
	binary := filepath.Join(t.TempDir(), "zaim-api-mcp")
	if image == "" {
		build := exec.CommandContext(t.Context(), "go", "build", "-o", binary, "./cmd/zaim-api-mcp")
		build.Dir = "../.."
		if output, err := build.CombinedOutput(); err != nil {
			t.Fatalf("build: %v: %s", err, output)
		}
	}
	start := func(t *testing.T) (*wirePeer, func(os.Signal)) {
		t.Helper()
		cmd := exec.Command(binary)
		if image != "" {
			cmd = exec.Command("docker", "run", "--rm", "-i", "--network", "none", image)
		}
		cmd.Env = append(os.Environ(), "ZAIM_CONSUMER_KEY=", "ZAIM_CONSUMER_SECRET=", "ZAIM_ACCESS_TOKEN=", "ZAIM_ACCESS_TOKEN_SECRET=")
		stdin, err := cmd.StdinPipe()
		if err != nil {
			t.Fatal(err)
		}
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			t.Fatal(err)
		}
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err := cmd.Start(); err != nil {
			t.Fatal(err)
		}
		peer := newWirePeer(stdin, stdout)
		done := make(chan error, 1)
		go func() { done <- cmd.Wait() }()
		finished := false
		t.Cleanup(func() {
			if !finished {
				_ = stdin.Close()
				_ = cmd.Process.Kill()
				<-done
			}
		})
		return peer, func(signal os.Signal) {
			if signal == nil {
				_ = stdin.Close()
			} else if err := cmd.Process.Signal(signal); err != nil {
				t.Fatal(err)
			}
			select {
			case err := <-done:
				finished = true
				if err != nil {
					t.Errorf("exit: %v, stderr: %s", err, stderr.String())
				}
			case <-time.After(5 * time.Second):
				t.Fatal("server did not stop")
			}
			if !strings.Contains(stderr.String(), "Zaim API MCP Server started") {
				t.Errorf("startup log missing from stderr: %s", stderr.String())
			}
		}
	}
	for _, version := range protocolVersions {
		t.Run(version, func(t *testing.T) {
			peer, finish := start(t)
			params := func(values map[string]any) map[string]any {
				if version == protocolVersions[0] {
					return modernParams(version, values)
				}
				return values
			}
			if version == protocolVersions[0] {
				discovery := resultObject(t, peer.request(t, "server/discover", params(nil)))
				var supported []string
				_ = json.Unmarshal(discovery["supportedVersions"], &supported)
				if !reflect.DeepEqual(supported, protocolVersions) {
					t.Errorf("supported versions: %v", supported)
				}
				if string(discovery["resultType"]) != `"complete"` || string(discovery["ttlMs"]) != "0" || string(discovery["cacheScope"]) != `"public"` {
					t.Errorf("discovery metadata: %s", discovery)
				}
				var meta map[string]json.RawMessage
				_ = json.Unmarshal(discovery["_meta"], &meta)
				if len(meta[mcp.MetaKeyServerInfo]) == 0 {
					t.Error("missing serverInfo in _meta")
				}
			} else {
				initialized := resultObject(t, peer.request(t, "initialize", map[string]any{"protocolVersion": version, "capabilities": map[string]any{}, "clientInfo": map[string]string{"name": "legacy-test", "version": "1"}}))
				if string(initialized["protocolVersion"]) != strconvQuote(version) {
					t.Errorf("negotiated version: %s", initialized["protocolVersion"])
				}
				peer.send(t, map[string]any{"jsonrpc": "2.0", "method": "notifications/initialized"})
			}
			listed := resultObject(t, peer.request(t, "tools/list", params(nil)))
			checkToolDefinitions(t, listed)
			if version == protocolVersions[0] && (string(listed["resultType"]) != `"complete"` || string(listed["ttlMs"]) != "0" || string(listed["cacheScope"]) != `"public"`) {
				t.Errorf("list metadata: %s", listed)
			}
			called := resultObject(t, peer.request(t, "tools/call", params(map[string]any{"name": "zaim_get_user_info", "arguments": map[string]any{}})))
			if string(called["isError"]) != "true" {
				t.Errorf("missing credentials must be a tool error: %s", called)
			}
			if version == protocolVersions[0] && string(called["resultType"]) != `"complete"` {
				t.Errorf("call resultType: %s", called)
			}
			var content []struct {
				Text string `json:"text"`
			}
			_ = json.Unmarshal(called["content"], &content)
			if len(content) != 1 || !strings.Contains(content[0].Text, "Missing required environment variable: ZAIM_CONSUMER_KEY") || !sameJSON([]byte(content[0].Text), called["structuredContent"]) {
				t.Errorf("credential failure output: %s", called)
			}
			unknown := peer.request(t, "tools/call", params(map[string]any{"name": "does_not_exist", "arguments": map[string]any{}}))
			if unknown.Error == nil || unknown.Error.Code != -32602 {
				t.Errorf("unknown tool: %+v", unknown)
			}
			if version == protocolVersions[0] {
				unsupported := peer.request(t, "tools/list", modernParams("2099-01-01", nil))
				if unsupported.Error == nil || unsupported.Error.Code != mcp.CodeUnsupportedProtocolVersion {
					t.Errorf("unsupported version: %+v", unsupported)
				}
				initial := peer.request(t, "initialize", params(map[string]any{"protocolVersion": version}))
				if initial.Error == nil || initial.Error.Code != -32601 {
					t.Errorf("modern initialize: %+v", initial)
				}
			}
			finish(nil)
		})
	}
	for _, signal := range []os.Signal{os.Interrupt, syscall.SIGTERM} {
		t.Run(signal.String(), func(t *testing.T) {
			peer, finish := start(t)
			resultObject(t, peer.request(t, "server/discover", modernParams(protocolVersions[0], nil)))
			finish(signal)
		})
	}
}

func strconvQuote(value string) string { data, _ := json.Marshal(value); return string(data) }

func TestProtocolsWithMockAPI(t *testing.T) {
	for _, version := range protocolVersions {
		t.Run(version, func(t *testing.T) {
			started, cancelled := make(chan struct{}), make(chan struct{})
			api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch r.URL.Path {
				case "/v2/home/category":
					_, _ = w.Write([]byte(`{"categories":[{"id":1,"extra":true}]}`))
				case "/v2/home/genre":
					w.WriteHeader(401)
					_, _ = w.Write([]byte(`{"message":"denied"}`))
				case "/v2/home/account":
					close(started)
					<-r.Context().Done()
					close(cancelled)
				default:
					t.Errorf("unexpected API path: %s", r.URL.Path)
				}
			}))
			defer api.Close()
			provider := func() (*zaim.Client, error) {
				return zaim.NewWithOptions(zaim.OAuthConfig{ConsumerKey: "fake", ConsumerSecret: "fake", AccessToken: "fake", AccessTokenSecret: "fake"}, zaim.ClientOptions{BaseURL: api.URL, HTTPClient: api.Client()}), nil
			}
			ct, st := mcp.NewInMemoryTransports()
			ss, err := NewServer(provider).Connect(t.Context(), st, nil)
			if err != nil {
				t.Fatal(err)
			}
			defer ss.Close()
			cs, err := mcp.NewClient(&mcp.Implementation{Name: "compatibility-test", Version: "1"}, nil).Connect(t.Context(), ct, &mcp.ClientSessionOptions{ProtocolVersion: version})
			if err != nil {
				t.Fatal(err)
			}
			defer cs.Close()
			for _, test := range []struct {
				name      string
				failed    bool
				substring string
			}{{"zaim_get_user_categories", false, "extra"}, {"zaim_get_user_genres", true, "Zaim API Error: 401 - denied"}} {
				result, err := cs.CallTool(t.Context(), &mcp.CallToolParams{Name: test.name, Arguments: map[string]any{}})
				if err != nil {
					t.Fatal(err)
				}
				if result.IsError != test.failed || len(result.Content) != 1 || !strings.Contains(result.Content[0].(*mcp.TextContent).Text, test.substring) {
					t.Errorf("tool result: %+v", result)
				}
				structured, _ := json.Marshal(result.StructuredContent)
				if !sameJSON(structured, []byte(result.Content[0].(*mcp.TextContent).Text)) {
					t.Errorf("content mismatch: %s", structured)
				}
			}
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			done := make(chan error, 1)
			go func() {
				_, err := cs.CallTool(ctx, &mcp.CallToolParams{Name: "zaim_get_user_accounts", Arguments: map[string]any{}})
				done <- err
			}()
			select {
			case <-started:
			case <-time.After(5 * time.Second):
				t.Fatal("HTTP request did not start")
			}
			cancel()
			select {
			case err := <-done:
				if !errors.Is(err, context.Canceled) {
					t.Errorf("cancel error: %v", err)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("tool call did not cancel")
			}
			select {
			case <-cancelled:
			case <-time.After(5 * time.Second):
				t.Fatal("HTTP request did not cancel")
			}
			_, err = cs.CallTool(t.Context(), &mcp.CallToolParams{Name: "missing", Arguments: map[string]any{}})
			var wireErr *jsonrpc.Error
			if !errors.As(err, &wireErr) || wireErr.Code != -32602 {
				t.Errorf("unknown tool error: %v", err)
			}
		})
	}
}

func TestRawAPIResponsePrecisionAndCredentialRedaction(t *testing.T) {
	for _, secret := range []string{"ZAIM_CONSUMER_KEY", "ZAIM_CONSUMER_SECRET", "ZAIM_ACCESS_TOKEN", "ZAIM_ACCESS_TOKEN_SECRET"} {
		t.Setenv(secret, "secret-"+secret)
	}
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v2/home/category" {
			_, _ = w.Write([]byte(`{"categories":[{"id":9007199254740993,"amount":0.123456789012345678901,"extra":{"kept":true}}]}`))
			return
		}
		w.WriteHeader(401)
		_ = json.NewEncoder(w).Encode(map[string]string{"message": "credentials " + os.Getenv("ZAIM_ACCESS_TOKEN") + " " + os.Getenv("ZAIM_CONSUMER_SECRET")})
	}))
	defer api.Close()
	provider := func() (*zaim.Client, error) {
		return zaim.NewWithOptions(zaim.OAuthConfig{ConsumerKey: "fake", ConsumerSecret: "fake", AccessToken: "fake", AccessTokenSecret: "fake"}, zaim.ClientOptions{BaseURL: api.URL, HTTPClient: api.Client()}), nil
	}
	client, server := net.Pipe()
	defer client.Close()
	ss, err := NewServer(provider).Connect(t.Context(), &mcp.IOTransport{Reader: server, Writer: server}, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer ss.Close()
	peer := newWirePeer(client, client)
	result := resultObject(t, peer.request(t, "tools/call", modernParams(protocolVersions[0], map[string]any{"name": "zaim_get_user_categories", "arguments": map[string]any{}})))
	want := []byte(`{"categories":[{"id":9007199254740993,"amount":0.123456789012345678901,"extra":{"kept":true}}],"count":1,"success":true,"message":"1件のカテゴリを取得しました"}`)
	if !sameJSON(result["structuredContent"], want) {
		t.Errorf("precision lost: %s", result["structuredContent"])
	}
	var content []struct {
		Text string `json:"text"`
	}
	_ = json.Unmarshal(result["content"], &content)
	if len(content) != 1 || !sameJSON([]byte(content[0].Text), want) {
		t.Errorf("text precision lost: %s", result["content"])
	}
	redacted := resultObject(t, peer.request(t, "tools/call", modernParams(protocolVersions[0], map[string]any{"name": "zaim_get_user_genres", "arguments": map[string]any{}})))
	data, _ := json.Marshal(redacted)
	if strings.Contains(string(data), os.Getenv("ZAIM_ACCESS_TOKEN")) || strings.Contains(string(data), os.Getenv("ZAIM_CONSUMER_SECRET")) || !strings.Contains(string(data), "[REDACTED]") || string(redacted["isError"]) != "true" {
		t.Errorf("credential redaction failed: %s", data)
	}
}
