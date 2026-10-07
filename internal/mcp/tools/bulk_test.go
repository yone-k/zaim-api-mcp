package tools

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/yone-k/zaim-cli/pkg/zaim"
)

func TestBulkStopsSendingAfterCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	var calls atomic.Int32
	api := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		// The server notices the client disconnecting only after the request body has been read.
		_ = r.ParseForm()
		cancel()
		// Responding here would race the client's cancellation and could record the item as created.
		<-r.Context().Done()
	}))
	defer api.Close()
	provider := func() (*zaim.Client, error) {
		return zaim.NewWithOptions(zaim.OAuthConfig{ConsumerKey: "k", ConsumerSecret: "s", AccessToken: "t", AccessTokenSecret: "ts"}, zaim.ClientOptions{BaseURL: api.URL, HTTPClient: api.Client()}), nil
	}
	item := json.RawMessage(`{"amount":1,"date":"2026-10-01","from_account_id":1,"to_account_id":2}`)
	items, _ := json.Marshal([]json.RawMessage{item, item, item})

	payload, failed := execute(ctx, provider, "zaim_bulk_create_transfers", Arguments{"items": items})

	if calls.Load() != 1 {
		t.Fatalf("API calls = %d, want 1", calls.Load())
	}
	if !failed {
		t.Error("failed = false, want true when nothing succeeded")
	}
	data, _ := json.Marshal(payload)
	var result struct {
		Total, Failed int
		Results       []struct {
			Success bool
			Message string
		}
	}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatal(err)
	}
	if result.Total != 3 || result.Failed != 3 || len(result.Results) != 3 {
		t.Fatalf("payload = %s", data)
	}
	for _, item := range result.Results[1:] {
		if item.Success || !strings.Contains(item.Message, "キャンセル") {
			t.Errorf("unsent item = %+v", item)
		}
	}
}
