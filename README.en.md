# Zaim API MCP Server

[日本語 README](README.md)

A Go MCP server for reading, creating, updating, and deleting Zaim household records. It communicates with MCP clients over stdio and signs Zaim API requests with OAuth 1.0a.

## Features

- 18 tools for authentication, user information, household records, and master data
- Official Go MCP SDK v1.8.0 and the SDK included in [zaim-cli](https://github.com/yone-k/zaim-cli) v0.3.0
- MCP 2026-07-28, 2025-11-25, 2025-06-18, 2025-03-26, and 2024-11-05
- JSON Schema validation, structured output, and JSON text responses
- Preservation of fractional amounts and additional API fields
- Local binary and Docker execution

## Requirements

Building from source requires Go 1.26.2 or later. Running the container requires Docker.

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

To use credentials saved by `auth login` in Docker, see [Use saved credentials in Docker](#use-saved-credentials-in-docker).

## Authentication

Zaim API requests are signed with OAuth 1.0a, which needs these four values:

| Value | How to get it |
|---|---|
| Consumer Key and Consumer Secret | Register an application at [Zaim Developers](https://dev.zaim.net/) |
| Access Token and Access Token Secret | Run `auth login` and allow access in the browser |

Save the four values to a file with `auth login`, or pass them as environment variables. The server chooses credentials as follows:

- If all four environment variables are set, it uses them.
- If none of them is set, it uses the file saved by `auth login`.
- If only some are set, it reports an error instead of combining them with the saved file.

Credentials are checked when a tool runs, so the server can start and list tools without them.

### Save them with `auth login`

If you installed the binary with `go install`, run the following command. If you built it into `dist/`, run `./dist/zaim-api-mcp auth login` instead.

```bash
zaim-api-mcp auth login
```

1. Enter the Consumer Key and Consumer Secret. If `ZAIM_CONSUMER_KEY` and `ZAIM_CONSUMER_SECRET` are set, the command does not prompt for them.
2. Allow access on the Zaim authorization page that opens in your browser. If no browser opens, open the printed URL yourself.
3. The command gets the access token and saves the four values to a file.

The file is saved to `~/.config/zaim-api-mcp/credentials.json`. If `XDG_CONFIG_HOME` is set, it is saved to `$XDG_CONFIG_HOME/zaim-api-mcp/credentials.json` instead. Only your user can read or write the file (mode 0600).

The authorization callback is received at `http://localhost:8080/callback`. Use `--port` to change the port. The command stops if access is not allowed within five minutes.

When you use the saved credentials, your MCP client configuration does not need `env`. If you previously used environment variables, remove all four `ZAIM_*` variables from your MCP client configuration. If all four remain, the server uses them; if only some remain, it reports an error.

### Pass them as environment variables

If you already have the access token and secret from another source, pass the four values as environment variables:

```bash
export ZAIM_CONSUMER_KEY=your_consumer_key
export ZAIM_CONSUMER_SECRET=your_consumer_secret
export ZAIM_ACCESS_TOKEN=your_access_token
export ZAIM_ACCESS_TOKEN_SECRET=your_access_token_secret
```

### Use saved credentials in Docker

Run `auth login` on the host and mount the credentials directory read-only. Set `--user` to your host user ID so the container can read the file:

```bash
docker run --rm -i \
  --user "$(id -u):$(id -g)" \
  -e XDG_CONFIG_HOME=/config \
  -v "$HOME/.config/zaim-api-mcp:/config/zaim-api-mcp:ro" \
  zaim-api-mcp
```

## MCP client configuration

Keep the existing server name `zaim-api` and set `command` to the absolute path of the Go binary.

If you saved credentials with `auth login`:

```json
{
  "mcpServers": {
    "zaim-api": {
      "command": "/absolute/path/to/zaim-api-mcp/dist/zaim-api-mcp"
    }
  }
}
```

To pass credentials as environment variables:

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
| Records | `zaim_bulk_create_payments` | Create up to 100 payments |
| Records | `zaim_bulk_create_incomes` | Create up to 100 income records |
| Records | `zaim_bulk_create_transfers` | Create up to 100 transfers |
| Records | `zaim_bulk_update_money_records` | Update up to 100 records |
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
- Bulk tools take `items` with the same arguments as the single-record tools and send each item once, in order. They continue after a failed item and return per-item results. They return `isError=true` only when every item fails. With `dry_run=true`, they validate without calling the API.

### Supported protocols

MCP 2026-07-28 clients use `server/discover` and per-request `_meta`. Older supported clients use `initialize`. MCP 2024-10-07 is outside the supported versions.

## Development and validation

```bash
go test ./...
go vet ./...
go build -o dist/zaim-api-mcp ./cmd/zaim-api-mcp
```

The 199 contract cases cover inputs and expected results for the 14 single-operation tools. Mock HTTP servers provide the API responses.

Protocol tests start the actual binary and check connections across supported versions, stdout/stderr separation, and shutdown on EOF, SIGINT, or SIGTERM. Tests also verify that cancellation reaches the HTTP request.

The same stdio checks can run against a Docker image:

```bash
docker build -t zaim-api-mcp .
ZAIM_MCP_TEST_IMAGE=zaim-api-mcp go test ./internal/mcp -run TestStdioServer -count=1
```

Tests do not access the real Zaim API. Binary checks clear the credential variables. When they start the local binary, they also point `HOME` and `XDG_CONFIG_HOME` at temporary directories so saved credentials are not read.

On pull requests and updates to main, GitHub Actions checks formatting, runs vet and tests with the race detector, and builds the binary. It also checks Docker connections across supported protocol versions and container shutdown.

### Directory structure

```text
cmd/zaim-api-mcp/       Startup, shutdown, and auth subcommand dispatch
internal/auth/         Authorization flow for auth login
internal/config/       Credential loading from environment or saved file, saving, and redaction
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
