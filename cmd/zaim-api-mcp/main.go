package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	zaimmcp "github.com/yone-k/zaim-api-mcp/internal/mcp"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	fmt.Fprintln(os.Stderr, "Zaim API MCP Server started")
	if err := zaimmcp.NewServer(nil).Run(ctx, &mcp.StdioTransport{}); err != nil && !errors.Is(err, context.Canceled) {
		fmt.Fprintln(os.Stderr, "MCP server stopped:", err)
		os.Exit(1)
	}
}
