package mcp

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/yone-k/zaim-cli/pkg/zaim"
)

type bulkRequest struct {
	Method string
	Path   string
	Form   map[string]string
}

type bulkPayload struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	DryRun    bool   `json:"dry_run"`
	Total     int    `json:"total"`
	Succeeded int    `json:"succeeded"`
	Failed    int    `json:"failed"`
	Results   []struct {
		Index   int             `json:"index"`
		Success bool            `json:"success"`
		Message string          `json:"message"`
		Record  json.RawMessage `json:"record"`
	} `json:"results"`
}

// callBulkTool answers each API request with the next response and returns the decoded payload.
func callBulkTool(t *testing.T, name, arguments string, credentials bool, responses ...string) (*mcp.CallToolResult, bulkPayload, []bulkRequest) {
	t.Helper()
	var mu sync.Mutex
	var requests []bulkRequest
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		if err := r.ParseForm(); err != nil {
			t.Error(err)
		}
		requests = append(requests, bulkRequest{r.Method, r.URL.Path, flatParameters(r.PostForm)})
		if len(requests) > len(responses) {
			t.Error("unexpected API call")
			w.WriteHeader(500)
			return
		}
		status, body, _ := strings.Cut(responses[len(requests)-1], " ")
		w.Header().Set("Content-Type", "application/json")
		var code int
		_, _ = fmt.Sscan(status, &code)
		w.WriteHeader(code)
		_, _ = w.Write([]byte(body))
	}))
	defer api.Close()
	provider := func() (*zaim.Client, error) {
		if !credentials {
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
	session, err := mcp.NewClient(&mcp.Implementation{Name: "bulk-client", Version: "1.0.0"}, nil).Connect(t.Context(), clientTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer session.Close()
	result, err := session.CallTool(t.Context(), &mcp.CallToolParams{Name: name, Arguments: json.RawMessage(arguments)})
	if err != nil {
		t.Fatal(err)
	}
	var payload bulkPayload
	// The client SDK decodes StructuredContent through float64, so large IDs are checked in the text.
	if result.StructuredContent != nil {
		text := result.Content[0].(*mcp.TextContent).Text
		if err := json.Unmarshal([]byte(text), &payload); err != nil {
			t.Fatalf("text = %s: %v", text, err)
		}
	}
	mu.Lock()
	defer mu.Unlock()
	return result, payload, requests
}

func TestBulkCreatePaymentsSendsEachItemAndContinuesAfterFailure(t *testing.T) {
	result, payload, requests := callBulkTool(t, "zaim_bulk_create_payments",
		`{"items":[{"amount":100,"date":"2026-10-01","category_id":101,"genre_id":10101,"place":"店A"},{"amount":200,"date":"2026-10-02","category_id":101,"genre_id":10102},{"amount":300.5,"date":"2026-10-03","category_id":102,"genre_id":10201}]}`,
		true,
		`200 {"money":{"id":12345678901234567890,"amount":100,"extra":1.25}}`,
		`400 {"message":"invalid genre"}`,
		`200 {"money":{"id":3}}`,
	)
	if result.IsError {
		t.Error("isError = true, want false for partial failure")
	}
	if len(requests) != 3 {
		t.Fatalf("API calls = %d, want 3", len(requests))
	}
	for _, request := range requests {
		if request.Method != http.MethodPost || request.Path != "/v2/home/money/payment" || request.Form["mapping"] != "1" {
			t.Errorf("request = %+v", request)
		}
	}
	if requests[0].Form["place"] != "店A" || requests[2].Form["amount"] != "300.5" {
		t.Errorf("forms = %+v", requests)
	}
	if payload.Success || payload.DryRun || payload.Total != 3 || payload.Succeeded != 2 || payload.Failed != 1 || len(payload.Results) != 3 {
		t.Fatalf("payload = %+v", payload)
	}
	if !sameJSON(payload.Results[0].Record, []byte(`{"id":12345678901234567890,"amount":100,"extra":1.25}`)) {
		t.Errorf("record = %s", payload.Results[0].Record)
	}
	second := payload.Results[1]
	if second.Index != 1 || second.Success || string(second.Record) != "null" || !strings.Contains(second.Message, "Zaim API Error: 400 - invalid genre") {
		t.Errorf("second = %+v", second)
	}
	if !payload.Results[2].Success || payload.Results[2].Index != 2 {
		t.Errorf("third = %+v", payload.Results[2])
	}
}

func TestBulkCreateIncomesAndTransfersUseTheirEndpoints(t *testing.T) {
	_, income, requests := callBulkTool(t, "zaim_bulk_create_incomes",
		`{"items":[{"amount":5000,"date":"2026-10-01","category_id":11,"to_account_id":0}]}`,
		true, `200 {"money":{"id":1}}`)
	if !income.Success || len(requests) != 1 || requests[0].Path != "/v2/home/money/income" || requests[0].Form["to_account_id"] != "0" {
		t.Errorf("income = %+v, requests = %+v", income, requests)
	}
	_, transfer, requests := callBulkTool(t, "zaim_bulk_create_transfers",
		`{"items":[{"amount":1000,"date":"2026-10-01","from_account_id":1,"to_account_id":2}]}`,
		true, `200 {"money":{"id":2}}`)
	if !transfer.Success || len(requests) != 1 || requests[0].Path != "/v2/home/money/transfer" {
		t.Errorf("transfer = %+v, requests = %+v", transfer, requests)
	}
}

func TestBulkUpdateRejectsPaymentWithoutGenreWithoutCallingAPI(t *testing.T) {
	result, payload, requests := callBulkTool(t, "zaim_bulk_update_money_records",
		`{"items":[{"id":1,"mode":"payment","amount":100},{"id":2,"mode":"income","amount":200,"comment":""}]}`,
		true, `200 {"money":{"id":2}}`)
	if result.IsError {
		t.Error("isError = true, want false for partial failure")
	}
	if len(requests) != 1 || requests[0].Method != http.MethodPut || requests[0].Path != "/v2/home/money/income/2" {
		t.Fatalf("requests = %+v", requests)
	}
	if _, ok := requests[0].Form["comment"]; !ok {
		t.Error("explicit empty comment was not sent")
	}
	if _, ok := requests[0].Form["id"]; ok {
		t.Error("id must not be sent as a form field")
	}
	first := payload.Results[0]
	if first.Success || !strings.Contains(first.Message, "genre_id is required when mode is payment") {
		t.Errorf("first = %+v", first)
	}
	if payload.Succeeded != 1 || payload.Failed != 1 {
		t.Errorf("payload = %+v", payload)
	}
}

func TestBulkDryRunValidatesWithoutCallingAPI(t *testing.T) {
	result, payload, requests := callBulkTool(t, "zaim_bulk_update_money_records",
		`{"dry_run":true,"items":[{"id":1,"mode":"payment","genre_id":10101},{"id":2,"mode":"payment"}]}`,
		true)
	if len(requests) != 0 {
		t.Fatalf("API calls = %d, want 0", len(requests))
	}
	if result.IsError || !payload.DryRun || payload.Succeeded != 1 || payload.Failed != 1 {
		t.Errorf("isError = %v, payload = %+v", result.IsError, payload)
	}
	if string(payload.Results[0].Record) != "null" {
		t.Errorf("dry run record = %s", payload.Results[0].Record)
	}
}

func TestBulkReportsErrorWhenEveryItemFails(t *testing.T) {
	result, payload, requests := callBulkTool(t, "zaim_bulk_create_transfers",
		`{"items":[{"amount":1,"date":"2026-10-01","from_account_id":1,"to_account_id":2},{"amount":2,"date":"2026-10-01","from_account_id":1,"to_account_id":2}]}`,
		false)
	if !result.IsError || len(requests) != 0 {
		t.Fatalf("isError = %v, requests = %d", result.IsError, len(requests))
	}
	if payload.Success || payload.Failed != 2 || !strings.Contains(payload.Results[0].Message, "ZAIM_CONSUMER_KEY") {
		t.Errorf("payload = %+v", payload)
	}
}

func TestBulkRejectsInvalidItems(t *testing.T) {
	items := make([]string, 101)
	for i := range items {
		items[i] = `{"id":1,"mode":"income"}`
	}
	for name, arguments := range map[string]string{
		"too many":        `{"items":[` + strings.Join(items, ",") + `]}`,
		"empty":           `{"items":[]}`,
		"zero amount":     `{"items":[{"amount":0,"date":"2026-10-01","category_id":11}]}`,
		"missing field":   `{"items":[{"amount":1,"date":"2026-10-01"}]}`,
		"unknown in item": `{"items":[{"amount":1,"date":"2026-10-01","category_id":11,"genre_id":1}]}`,
	} {
		t.Run(name, func(t *testing.T) {
			tool := "zaim_bulk_create_incomes"
			if name == "too many" {
				tool = "zaim_bulk_update_money_records"
			}
			result, _, requests := callBulkTool(t, tool, arguments, true)
			if !result.IsError || len(requests) != 0 {
				t.Errorf("isError = %v, requests = %d", result.IsError, len(requests))
			}
		})
	}
}
