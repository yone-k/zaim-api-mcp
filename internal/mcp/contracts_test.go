package mcp

import (
	"bytes"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/yone-k/zaim-cli/pkg/zaim"
)

type contractCase struct {
	Name               string          `json:"name"`
	Arguments          json.RawMessage `json:"arguments"`
	CredentialsPresent bool            `json:"credentialsPresent"`
	APIRequest         *struct {
		Method string            `json:"method"`
		Path   string            `json:"path"`
		Query  map[string]string `json:"query"`
		Form   map[string]string `json:"form"`
	} `json:"apiRequest"`
	APIResponse *struct {
		Status int    `json:"status"`
		Body   string `json:"body"`
	} `json:"apiResponse"`
	Expected struct {
		IsError         bool            `json:"isError"`
		Payload         json.RawMessage `json:"payload"`
		MessageContains string          `json:"messageContains"`
	} `json:"expected"`
}

func TestToolContracts(t *testing.T) {
	for _, name := range []string{"ZAIM_CONSUMER_KEY", "ZAIM_CONSUMER_SECRET", "ZAIM_ACCESS_TOKEN", "ZAIM_ACCESS_TOKEN_SECRET"} {
		t.Setenv(name, "")
	}
	files, err := filepath.Glob("../../testdata/contracts/*.json")
	if err != nil || len(files) != 14 {
		t.Fatalf("contract files = %d: %v", len(files), err)
	}
	total := 0
	for _, file := range files {
		toolName := strings.TrimSuffix(filepath.Base(file), ".json")
		data, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		var cases []contractCase
		if err := json.Unmarshal(data, &cases); err != nil {
			t.Fatal(err)
		}
		for _, fixture := range cases {
			total++
			t.Run(toolName+"/"+fixture.Name, func(t *testing.T) { runContract(t, toolName, fixture) })
		}
	}
	if total != 199 {
		t.Errorf("contract count = %d, want 199", total)
	}
}

func TestUserInfoPreservesNullOptionalFields(t *testing.T) {
	data, err := os.ReadFile("../../testdata/contracts/zaim_get_user_info.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixtures []contractCase
	if err := json.Unmarshal(data, &fixtures); err != nil {
		t.Fatal(err)
	}
	fixture := fixtures[0]
	fixture.APIResponse.Body = `{"me":{"id":7,"name":"テスト","login":null,"profile_image_url":null,"input_count":null,"repeat_count":null,"day":null}}`
	fixture.Expected.Payload = json.RawMessage(`{"user":{"id":7,"name":"テスト","login":null,"profile_image_url":null,"input_count":null,"repeat_count":null,"day":null},"success":true,"message":"ユーザー情報を取得しました"}`)
	runContract(t, "zaim_get_user_info", fixture)
}

func runContract(t *testing.T, toolName string, fixture contractCase) {
	t.Helper()
	var calls atomic.Int32
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if fixture.APIRequest == nil || fixture.APIResponse == nil {
			t.Error("unexpected API call")
			w.WriteHeader(500)
			return
		}
		if r.Method != fixture.APIRequest.Method || r.URL.Path != fixture.APIRequest.Path {
			t.Errorf("request = %s %s, want %s %s", r.Method, r.URL.Path, fixture.APIRequest.Method, fixture.APIRequest.Path)
		}
		if err := r.ParseForm(); err != nil {
			t.Error(err)
		}
		if !reflect.DeepEqual(flatParameters(r.URL.Query()), fixture.APIRequest.Query) {
			t.Errorf("query = %v, want %v", r.URL.Query(), fixture.APIRequest.Query)
		}
		if !reflect.DeepEqual(flatParameters(r.PostForm), fixture.APIRequest.Form) {
			t.Errorf("form = %v, want %v", r.PostForm, fixture.APIRequest.Form)
		}
		if !strings.HasPrefix(r.Header.Get("Authorization"), "OAuth ") {
			t.Error("missing OAuth signature")
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(fixture.APIResponse.Status)
		_, _ = w.Write([]byte(fixture.APIResponse.Body))
	}))
	defer api.Close()
	provider := func() (*zaim.Client, error) {
		if !fixture.CredentialsPresent {
			return nil, errors.New("Missing required environment variable: ZAIM_CONSUMER_KEY")
		}
		return zaim.NewWithOptions(zaim.OAuthConfig{ConsumerKey: "consumer-key", ConsumerSecret: "consumer-secret", AccessToken: "access-token", AccessTokenSecret: "access-secret"}, zaim.ClientOptions{BaseURL: api.URL, HTTPClient: api.Client()}), nil
	}
	clientTransport, serverTransport := mcp.NewInMemoryTransports()
	serverSession, err := NewServer(provider).Connect(t.Context(), serverTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer serverSession.Close()
	session, err := mcp.NewClient(&mcp.Implementation{Name: "contract-client", Version: "1.0.0"}, nil).Connect(t.Context(), clientTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer session.Close()
	result, err := session.CallTool(t.Context(), &mcp.CallToolParams{Name: toolName, Arguments: fixture.Arguments})
	if err != nil {
		t.Fatal(err)
	}
	if result.IsError != fixture.Expected.IsError {
		t.Errorf("isError = %v, want %v", result.IsError, fixture.Expected.IsError)
	}
	if len(result.Content) != 1 {
		t.Fatalf("content = %#v", result.Content)
	}
	text, ok := result.Content[0].(*mcp.TextContent)
	if !ok {
		t.Fatalf("content type = %T", result.Content[0])
	}
	if fixture.Expected.MessageContains != "" && !strings.Contains(text.Text, fixture.Expected.MessageContains) {
		t.Errorf("message = %s, want substring %q", text.Text, fixture.Expected.MessageContains)
	}
	if string(fixture.Expected.Payload) != "null" {
		if !sameJSON([]byte(text.Text), fixture.Expected.Payload) {
			t.Errorf("payload = %s, want %s", text.Text, fixture.Expected.Payload)
		}
		structured, err := json.Marshal(result.StructuredContent)
		if err != nil {
			t.Fatal(err)
		}
		if !sameJSON(structured, fixture.Expected.Payload) {
			t.Errorf("structured = %s, want %s", structured, fixture.Expected.Payload)
		}
	}
	wantCalls := int32(0)
	if fixture.APIRequest != nil {
		wantCalls = 1
	}
	if calls.Load() != wantCalls {
		t.Errorf("API calls = %d, want %d", calls.Load(), wantCalls)
	}
}

func flatParameters(values map[string][]string) map[string]string {
	result := make(map[string]string, len(values))
	for key, value := range values {
		if len(value) == 1 {
			result[key] = value[0]
		}
	}
	return result
}

func sameJSON(a, b []byte) bool {
	decode := func(data []byte) (any, error) {
		decoder := json.NewDecoder(bytes.NewReader(data))
		decoder.UseNumber()
		var value any
		err := decoder.Decode(&value)
		return value, err
	}
	left, err := decode(a)
	if err != nil {
		return false
	}
	right, err := decode(b)
	if err != nil {
		return false
	}
	return sameValue(left, right)
}

func sameValue(a, b any) bool {
	switch left := a.(type) {
	case json.Number:
		right, ok := b.(json.Number)
		if !ok {
			return false
		}
		x, ok := new(big.Rat).SetString(string(left))
		if !ok {
			return false
		}
		y, ok := new(big.Rat).SetString(string(right))
		return ok && x.Cmp(y) == 0
	case map[string]any:
		right, ok := b.(map[string]any)
		if !ok || len(left) != len(right) {
			return false
		}
		for key, value := range left {
			other, exists := right[key]
			if !exists || !sameValue(value, other) {
				return false
			}
		}
		return true
	case []any:
		right, ok := b.([]any)
		if !ok || len(left) != len(right) {
			return false
		}
		for i, value := range left {
			if !sameValue(value, right[i]) {
				return false
			}
		}
		return true
	default:
		return reflect.DeepEqual(a, b)
	}
}
