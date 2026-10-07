package mcp

import (
	"context"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/yone-k/go-zaim"
	"github.com/yone-k/zaim-api-mcp/internal/config"
	"github.com/yone-k/zaim-api-mcp/internal/mcp/tools"
	"github.com/yone-k/zaim-api-mcp/internal/version"
)

// NewServer constructs the stdio-capable server without requiring credentials.
func NewServer(provider tools.ClientProvider) *mcp.Server {
	if provider == nil {
		provider = func() (*zaim.Client, error) {
			credentials, err := config.Load()
			if err != nil {
				return nil, err
			}
			return zaim.New(credentials), nil
		}
	}
	server := mcp.NewServer(&mcp.Implementation{Name: "zaim-api-mcp", Version: version.Version}, &mcp.ServerOptions{
		SupportedProtocolVersions: []string{"2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"},
		SetCacheable: func(_ context.Context, _ mcp.Request, cache *mcp.Cacheable) {
			cache.TTLMs = 0
			cache.CacheScope = "public"
		},
	})
	tools.Register(server, provider)
	return server
}
