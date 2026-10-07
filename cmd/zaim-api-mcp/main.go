package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/yone-k/zaim-api-mcp/internal/auth"
	zaimmcp "github.com/yone-k/zaim-api-mcp/internal/mcp"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	// Other arguments still start the server so existing client configurations keep working.
	if len(os.Args) > 1 && os.Args[1] == "auth" {
		code := auth.Main(ctx, os.Args[2:], os.Stdin, os.Stdout, os.Stderr)
		stop()
		os.Exit(code)
	}
	fmt.Fprintln(os.Stderr, "Zaim API MCP Server started")
	if err := zaimmcp.NewServer(nil).Run(ctx, &mcp.StdioTransport{}); err != nil && !errors.Is(err, context.Canceled) {
		fmt.Fprintln(os.Stderr, "MCP server stopped:", err)
		os.Exit(1)
	}
}
