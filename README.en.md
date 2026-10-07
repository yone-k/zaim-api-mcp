# Zaim API MCP Server

[日本語 README](README.md)

A Go MCP server for reading, creating, updating, and deleting Zaim household records. It communicates with MCP clients over stdio and authenticates with Zaim using OAuth 1.0a.

## Features

- 14 tools for authentication, user information, household records, and master data
- Official Go MCP SDK v1.8.0 and the SDK included in [zaim-cli](https://github.com/yone-k/zaim-cli) v0.3.0
- MCP 2026-07-28, 2025-11-25, 2025-06-18, 2025-03-26, and 2024-11-05
- JSON Schema validation, structured output, and JSON text responses
- Preservation of fractional amounts and additional API fields
- Local binary and Docker execution

## Requirements

Building from source requires Go 1.26.2 or later. Running the container requires Docker.

Set your Zaim credentials in these four environment variables:

```bash
export ZAIM_CONSUMER_KEY=your_consumer_key
export ZAIM_CONSUMER_SECRET=your_consumer_secret
export ZAIM_ACCESS_TOKEN=your_access_token
export ZAIM_ACCESS_TOKEN_SECRET=your_access_token_secret
```

Credentials are checked when a tool runs. The server can start and list tools without them.

## Installation and startup

### Local binary

```bash
git clone https://github.com/yone-k/zaim-api-mcp.git
cd zaim-api-mcp

go build -o dist/zaim-api-mcp ./cmd/zaim-api-mcp
./dist/zaim-api-mcp
```

To install into your Go bin directory, run the following from the source checkout:

```bash
go install ./cmd/zaim-api-mcp
zaim-api-mcp
```

The server reads MCP messages from stdin and writes responses to stdout. Startup logs go to stderr.

### Docker

```bash
docker build -t zaim-api-mcp .
docker run --rm -i \
  -e ZAIM_CONSUMER_KEY -e ZAIM_CONSUMER_SECRET \
  -e ZAIM_ACCESS_TOKEN -e ZAIM_ACCESS_TOKEN_SECRET \
  zaim-api-mcp
```

Compose also reads credentials from the shell environment:

```bash
docker compose build
docker compose run --rm -T zaim-api
```

## MCP client configuration

Keep the existing server name `zaim-api` and set `command` to the absolute path of the Go binary:

```json
{
  "mcpServers": {
    "zaim-api": {
      "command": "/absolute/path/to/zaim-api-mcp/dist/zaim-api-mcp",
      "env": {
        "ZAIM_CONSUMER_KEY": "your_consumer_key",
        "ZAIM_CONSUMER_SECRET": "your_consumer_secret",
        "ZAIM_ACCESS_TOKEN": "your_access_token",
        "ZAIM_ACCESS_TOKEN_SECRET": "your_access_token_secret"
      }
    }
  }
}
```

For Docker, use this configuration:

```json
{
  "mcpServers": {
    "zaim-api": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "ZAIM_CONSUMER_KEY",
        "-e", "ZAIM_CONSUMER_SECRET",
        "-e", "ZAIM_ACCESS_TOKEN",
        "-e", "ZAIM_ACCESS_TOKEN_SECRET",
        "zaim-api-mcp"
      ],
      "env": {
        "ZAIM_CONSUMER_KEY": "your_consumer_key",
        "ZAIM_CONSUMER_SECRET": "your_consumer_secret",
        "ZAIM_ACCESS_TOKEN": "your_access_token",
        "ZAIM_ACCESS_TOKEN_SECRET": "your_access_token_secret"
      }
    }
  }
}
```

## Tools

| Group | Tool | Operation |
|---|---|---|
| Authentication | `zaim_check_auth_status` | Check authentication |
| User | `zaim_get_user_info` | Get profile and statistics |
| Records | `zaim_get_money_records` | Read records with filters and pagination |
| Records | `zaim_create_payment` | Create a payment |
| Records | `zaim_create_income` | Create income |
| Records | `zaim_create_transfer` | Create a transfer |
| Records | `zaim_update_money_record` | Update a record |
| Records | `zaim_delete_money_record` | Delete a record |
| Master data | `zaim_get_user_categories` | List user categories |
| Master data | `zaim_get_user_genres` | List user genres |
| Master data | `zaim_get_user_accounts` | List accounts |
| Master data | `zaim_get_default_categories` | List default categories |
| Master data | `zaim_get_default_genres` | List default genres |
| Master data | `zaim_get_currencies` | List currencies |

Tool names, arguments, defaults, and successful JSON payloads remain compatible with the previous implementation.

- Record retrieval defaults to `limit=20` and `page=1`.
- Creation and update amounts must be positive.
- Updating a payment requires `genre_id`.
- Input validation, authentication, and API failures return `isError=true`.

### Supported protocols

MCP 2026-07-28 clients use `server/discover` and per-request `_meta`. Older supported clients use `initialize`. MCP 2024-10-07 is outside the supported versions.

## Development and validation

```bash
go test ./...
go vet ./...
go build -o dist/zaim-api-mcp ./cmd/zaim-api-mcp
```

The 199 contract cases cover inputs and expected results for all 14 tools. Mock HTTP servers provide the API responses.

Protocol tests start the actual binary and check connections across supported versions, stdout/stderr separation, and shutdown on EOF, SIGINT, or SIGTERM. Tests also verify that cancellation reaches the HTTP request.

The same stdio checks can run against a Docker image:

```bash
docker build -t zaim-api-mcp .
ZAIM_MCP_TEST_IMAGE=zaim-api-mcp go test ./internal/mcp -run TestStdioServer -count=1
```

Tests do not access the real Zaim API.

On pull requests and updates to main, GitHub Actions checks formatting, runs vet and tests with the race detector, and builds the binary. It also checks Docker connections across supported protocol versions and container shutdown.

### Directory structure

```text
cmd/zaim-api-mcp/       Startup and shutdown
internal/config/       Environment configuration and credential redaction
internal/mcp/          Server, contract tests, and protocol tests
internal/mcp/tools/    Tools, schemas, and response conversion
internal/version/      Server version
testdata/              Contract fixtures and existing tool definitions
```

## License

[MIT](LICENSE)

## Links

- [Zaim API](https://dev.zaim.net/)
- [MCP specification](https://modelcontextprotocol.io/)
- [Official Go MCP SDK](https://github.com/modelcontextprotocol/go-sdk)
