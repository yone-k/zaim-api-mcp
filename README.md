# Zaim API MCP Server

[English README](README.en.md)

Zaimの家計簿データを取得・作成・更新・削除する、Go製のMCPサーバーです。MCPクライアントとはstdioで通信し、ZaimにはOAuth 1.0aで認証します。

## 特徴

- 認証・ユーザー情報、家計簿、マスターデータを扱う14ツール
- 公式Go MCP SDK v1.8.0と、[zaim-cli](https://github.com/yone-k/zaim-cli) v0.3.0のSDKを使用
- MCP 2026-07-28、2025-11-25、2025-06-18、2025-03-26、2024-11-05に対応
- JSON Schemaで入力・出力を検証し、結果を`structuredContent`とJSONテキストで返却
- 小数金額やAPI由来の追加フィールドを保持
- GoバイナリとDockerによる起動

## 要件

ソースからビルドする場合はGo 1.26.2以上、Dockerで起動する場合はDockerが必要です。

Zaimの認証情報は、次の4つの環境変数で設定します。

```bash
export ZAIM_CONSUMER_KEY=your_consumer_key
export ZAIM_CONSUMER_SECRET=your_consumer_secret
export ZAIM_ACCESS_TOKEN=your_access_token
export ZAIM_ACCESS_TOKEN_SECRET=your_access_token_secret
```

認証情報はツール実行時に検証します。未設定でもサーバーの起動とツール一覧の取得はできます。

## インストール・起動

### ローカルバイナリ

```bash
git clone https://github.com/yone-k/zaim-api-mcp.git
cd zaim-api-mcp

go build -o dist/zaim-api-mcp ./cmd/zaim-api-mcp
./dist/zaim-api-mcp
```

Goのbinディレクトリへインストールする場合は、ソース取得後に次を実行します。

```bash
go install ./cmd/zaim-api-mcp
zaim-api-mcp
```

サーバーはstdinからMCPメッセージを受け取り、stdoutへ応答します。起動ログはstderrへ出力します。

### Docker

```bash
docker build -t zaim-api-mcp .
docker run --rm -i \
  -e ZAIM_CONSUMER_KEY -e ZAIM_CONSUMER_SECRET \
  -e ZAIM_ACCESS_TOKEN -e ZAIM_ACCESS_TOKEN_SECRET \
  zaim-api-mcp
```

環境変数を設定したシェルから、Composeでも起動できます。

```bash
docker compose build
docker compose run --rm -T zaim-api
```

## MCPクライアント設定

サーバー名は従来の`zaim-api`を使います。`command`には、ビルドしたGoバイナリの絶対パスを指定してください。

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

Dockerを使う場合の設定例です。

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

## ツール

| 分類 | ツール | 操作 |
|---|---|---|
| 認証 | `zaim_check_auth_status` | 認証状態の確認 |
| ユーザー | `zaim_get_user_info` | プロフィール・統計情報の取得 |
| 家計簿 | `zaim_get_money_records` | フィルター・ページ指定で記録を取得 |
| 家計簿 | `zaim_create_payment` | 支出の作成 |
| 家計簿 | `zaim_create_income` | 収入の作成 |
| 家計簿 | `zaim_create_transfer` | 振替の作成 |
| 家計簿 | `zaim_update_money_record` | 記録の更新 |
| 家計簿 | `zaim_delete_money_record` | 記録の削除 |
| マスター | `zaim_get_user_categories` | ユーザーカテゴリ一覧 |
| マスター | `zaim_get_user_genres` | ユーザージャンル一覧 |
| マスター | `zaim_get_user_accounts` | 口座一覧 |
| マスター | `zaim_get_default_categories` | デフォルトカテゴリ一覧 |
| マスター | `zaim_get_default_genres` | デフォルトジャンル一覧 |
| マスター | `zaim_get_currencies` | 通貨一覧 |

ツール名・引数・既定値と、成功時のJSON形式は従来どおりです。

- 記録取得の既定値は`limit=20`・`page=1`です。
- 作成・更新の`amount`は正数です。
- 支出の更新には`genre_id`が必要です。
- 入力検証・認証・API処理に失敗した場合は`isError=true`を返します。

### 対応プロトコル

MCP 2026-07-28のクライアントは`server/discover`とリクエストごとの`_meta`を使い、旧仕様のクライアントは`initialize`で接続します。2024-10-07は対応バージョンに含まれません。

## 開発・検証

```bash
go test ./...
go vet ./...
go build -o dist/zaim-api-mcp ./cmd/zaim-api-mcp
```

14ツールの入力と期待する結果を収録した、199件のテストデータで互換性を検証します。API応答にはダミーHTTPサーバーを使います。

プロトコルテストでは実バイナリを起動し、新旧仕様での接続、stdoutとstderrの分離、EOF・SIGINT・SIGTERMによる終了を確認します。キャンセルがHTTP通信まで伝わることも検証します。

Dockerイメージにも同じstdio検証を実行できます。

```bash
docker build -t zaim-api-mcp .
ZAIM_MCP_TEST_IMAGE=zaim-api-mcp go test ./internal/mcp -run TestStdioServer -count=1
```

テストは実Zaim APIへ接続しません。

PR作成・更新時とmainへの更新時には、GitHub Actionsでコードの整形、vet、race検査付きテスト、ビルドを確認します。Dockerでも新旧仕様での接続と終了処理を検証します。

### ディレクトリ構成

```text
cmd/zaim-api-mcp/       起動・終了処理
internal/config/       環境変数と認証情報の伏字
internal/mcp/          MCPサーバーと契約・プロトコルテスト
internal/mcp/tools/    14ツール、入出力スキーマ、応答変換
internal/version/      サーバーバージョン
testdata/              互換性検証用のテストデータと既存ツール定義
```

## ライセンス

[MIT](LICENSE)

## 関連リンク

- [Zaim API](https://dev.zaim.net/)
- [MCP仕様](https://modelcontextprotocol.io/)
- [公式Go MCP SDK](https://github.com/modelcontextprotocol/go-sdk)
