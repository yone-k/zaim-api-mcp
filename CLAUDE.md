# Zaim API MCP Server 開発ガイド

## 構成

Go製のMCPサーバーで、通信方式はstdio。Go 1.26.2以上を使う。

MCPの処理には公式`github.com/modelcontextprotocol/go-sdk v1.8.0`、Zaimとの通信には`github.com/yone-k/zaim-cli v0.3.0`の`pkg/zaim`を使う。

- `cmd/zaim-api-mcp/main.go`: 起動、stderrログ、EOF・シグナルによる終了。
- `internal/config/`: 4つのZaim環境変数の検証と、認証情報の伏字。
- `internal/mcp/server.go`: サーバー情報、対応プロトコル、キャッシュ情報、SDKクライアントの注入。
- `internal/mcp/tools/definitions.json`: 18ツールの名前・説明・入力スキーマ。
- `internal/mcp/tools/registry.go`: 入出力検証、構造化出力とJSONテキスト、annotations。
- `internal/mcp/tools/operations.go`: 認証・ユーザー情報2ツール、家計簿6ツール、一括処理4ツール、マスター6ツールの引数とAPI結果の変換。一括処理は単体ツールの変換を要素ごとに再利用する。
- `testdata/contracts/`: 単体操作の14ツールの入力と期待する結果を収録した199件のテストデータ。一括処理4ツールは`internal/mcp/bulk_test.go`で検証する。

## コマンド

```bash
go test ./...
go vet ./...
go build -o dist/zaim-api-mcp ./cmd/zaim-api-mcp
go install ./cmd/zaim-api-mcp
```

Dockerで同じstdio検証を行う場合は、次を実行する。

```bash
docker build -t zaim-api-mcp .
ZAIM_MCP_TEST_IMAGE=zaim-api-mcp go test ./internal/mcp -run TestStdioServer -count=1
```

## 実装・検証のルール

### テストとSDKの責務

- 振る舞いのテストを先に追加し、意図した失敗、実装、成功の順に進める。`gofmt`で整形する。
- JSON-RPC、バージョン処理、`server/discover`、旧`initialize`、stdio通信は公式MCP SDKへ委ねる。
- OAuth署名とHTTP通信は`pkg/zaim`の`Client.Request`を使う。MCP側へ通信実装を複製しない。
- APIのテストには`httptest`を使う。実バイナリとDockerのstdio検証では認証情報を空にし、実Zaimへ接続しない。

対応するMCPバージョンは2026-07-28、2025-11-25、2025-06-18、2025-03-26、2024-11-05。各バージョンでのツール成功・API失敗・キャンセルは、インメモリー接続とダミーHTTPサーバーで検証する。

### 互換性とデータ保持

- 認証は`ZAIM_CONSUMER_KEY`、`ZAIM_CONSUMER_SECRET`、`ZAIM_ACCESS_TOKEN`、`ZAIM_ACCESS_TOKEN_SECRET`だけで設定し、ツール実行時に検証する。
- ツール名・既存引数・既定値とJSONペイロードを維持する。未指定とゼロ・空文字を区別する。
- API由来の記録と配列要素は`json.RawMessage`で保持する。追加フィールド・小数・大きな整数を落とさず、出力スキーマの検証時にもJSONを再シリアライズしない。
- ツールの失敗時は`isError=true`を返す。認証・APIの失敗には従来の失敗ペイロードも付ける。

### 通信・ログ・利用者データ

- 受け取ったcontextをHTTPまで渡す。書込みの自動再試行や、書込み後の追加GETを導入しない。
- stdoutにはMCPメッセージだけを出し、ログはstderrへ出す。資格情報を応答やログへ出さない。
- `reference/`の利用者データとローカルのスキルを編集しない。
