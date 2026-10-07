package mcp

import (
	"context"
	"slices"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestServerListsToolsWithoutCredentials(t *testing.T) {
	for _, name := range []string{"ZAIM_CONSUMER_KEY", "ZAIM_CONSUMER_SECRET", "ZAIM_ACCESS_TOKEN", "ZAIM_ACCESS_TOKEN_SECRET"} {
		t.Setenv(name, "")
	}
	ctx := t.Context()
	clientTransport, serverTransport := mcp.NewInMemoryTransports()
	server := NewServer(nil)
	serverSession, err := server.Connect(ctx, serverTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer serverSession.Close()
	client := mcp.NewClient(&mcp.Implementation{Name: "test-client", Version: "1.0.0"}, nil)
	session, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer session.Close()
	result, err := session.ListTools(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Tools) != 14 {
		t.Fatalf("tools = %d, want 14", len(result.Tools))
	}
	if result.TTLMs != 0 || result.CacheScope != "public" {
		t.Errorf("cache = %d/%s", result.TTLMs, result.CacheScope)
	}
	var names []string
	for _, tool := range result.Tools {
		names = append(names, tool.Name)
	}
	if !slices.Contains(names, "zaim_create_payment") || !slices.Contains(names, "zaim_get_currencies") {
		t.Errorf("tool names = %v", names)
	}
}
