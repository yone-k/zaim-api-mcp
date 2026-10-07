# Zaim API MCP Server

[English README](README.en.md)

Zaimの家計簿データを取得・作成・更新・削除する、Go製のMCPサーバーです。MCPクライアントとはstdioで通信し、Zaim APIへのリクエストにはOAuth 1.0aの署名を付けます。

## 特徴

- 認証・ユーザー情報、家計簿、マスターデータを扱う18ツール
- 公式Go MCP SDK v1.8.0と、Zaim API向けのGo SDK [go-zaim](https://github.com/yone-k/go-zaim) v0.1.0を使用
- MCP 2026-07-28、2025-11-25、2025-06-18、2025-03-26、2024-11-05に対応
- JSON Schemaで入力・出力を検証し、結果を`structuredContent`とJSONテキストで返却
- 小数金額やAPI由来の追加フィールドを保持
- GoバイナリとDockerによる起動

## 要件

ソースからビルドする場合はGo 1.26.2以上、Dockerで起動する場合はDockerが必要です。

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

`auth login`で保存した認証情報をDockerで使う方法は、「[Dockerで保存した認証情報を使う](#dockerで保存した認証情報を使う)」を参照してください。

## 認証

Zaim APIへのリクエストには、OAuth 1.0aの署名に使う次の4つの値が必要です。

| 値 | 入手方法 |
|---|---|
| Consumer Key・Consumer Secret | [Zaim Developers](https://dev.zaim.net/)でアプリケーションを登録して発行 |
| Access Token・Access Token Secret | `auth login`で、ブラウザからアクセスを許可して取得 |

4つの値は、`auth login`でファイルに保存するか、環境変数で渡します。サーバーは次の基準で認証情報を選びます。

- 4つの環境変数がすべて設定されていれば、環境変数を使います。
- 4つとも未設定なら、`auth login`で保存したファイルを使います。
- 一部だけ設定されている場合は、保存したファイルと組み合わせずにエラーにします。

認証情報はツールの実行時に検証するため、未設定でもサーバーの起動とツール一覧の取得はできます。

### `auth login`で保存する

`go install`でインストールした場合は、次のコマンドを実行します。`dist/`にビルドした場合は、`./dist/zaim-api-mcp auth login`を実行してください。

```bash
zaim-api-mcp auth login
```

1. Consumer KeyとConsumer Secretを入力します。環境変数`ZAIM_CONSUMER_KEY`と`ZAIM_CONSUMER_SECRET`が設定されていれば、入力は求めません。
2. ブラウザでZaimの認可画面が開くので、アクセスを許可します。ブラウザが開かない場合は、表示されたURLを手動で開いてください。
3. コマンドがAccess Tokenを取得し、4つの値をファイルに保存します。

保存先は`~/.config/zaim-api-mcp/credentials.json`です。`XDG_CONFIG_HOME`を設定している場合は、`$XDG_CONFIG_HOME/zaim-api-mcp/credentials.json`に保存します。ファイルは本人だけが読み書きできる権限（0600）で作成します。

認可後のコールバックは`http://localhost:8080/callback`で受け取ります。ポートを変える場合は`--port`を指定してください。5分以内に許可しないと中断します。

保存した認証情報を使う場合、MCPクライアントの設定に`env`は不要です。これまで環境変数で設定していた場合は、MCPクライアントの設定から4つの`ZAIM_*`を削除してください。4つとも残っていると環境変数が使われ、一部だけ残っているとエラーになります。

### 環境変数で渡す

Access TokenとAccess Token Secretを別の方法で取得済みの場合は、4つの値を環境変数で渡せます。

```bash
export ZAIM_CONSUMER_KEY=your_consumer_key
export ZAIM_CONSUMER_SECRET=your_consumer_secret
export ZAIM_ACCESS_TOKEN=your_access_token
export ZAIM_ACCESS_TOKEN_SECRET=your_access_token_secret
```

### Dockerで保存した認証情報を使う

ホストで`auth login`を実行してから、保存先のディレクトリを読み取り専用でマウントします。コンテナ内でファイルを読めるよう、`--user`でホストと同じユーザーIDを指定してください。

```bash
docker run --rm -i \
  --user "$(id -u):$(id -g)" \
  -e XDG_CONFIG_HOME=/config \
  -v "$HOME/.config/zaim-api-mcp:/config/zaim-api-mcp:ro" \
  zaim-api-mcp
```

## MCPクライアント設定

サーバー名は従来の`zaim-api`を使います。`command`には、ビルドしたGoバイナリの絶対パスを指定してください。

`auth login`で認証情報を保存した場合の設定例です。

```json
{
  "mcpServers": {
    "zaim-api": {
      "command": "/absolute/path/to/zaim-api-mcp/dist/zaim-api-mcp"
    }
  }
}
```

環境変数で渡す場合の設定例です。

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
| 家計簿 | `zaim_bulk_create_payments` | 支出の一括作成（最大100件） |
| 家計簿 | `zaim_bulk_create_incomes` | 収入の一括作成（最大100件） |
| 家計簿 | `zaim_bulk_create_transfers` | 振替の一括作成（最大100件） |
| 家計簿 | `zaim_bulk_update_money_records` | 記録の一括更新（最大100件） |
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
- 一括処理は`items`の各要素を単体ツールと同じ引数で受け取り、順番に1回ずつ送信します。失敗した要素があっても残りを続け、要素ごとの結果を返します。`isError=true`になるのは、全件が失敗した場合です。`dry_run=true`ではAPIを呼ばずに検証のみ行います。

### 対応プロトコル

MCP 2026-07-28のクライアントは`server/discover`とリクエストごとの`_meta`を使い、旧仕様のクライアントは`initialize`で接続します。2024-10-07は対応バージョンに含まれません。

## 開発・検証

```bash
go test ./...
go vet ./...
go build -o dist/zaim-api-mcp ./cmd/zaim-api-mcp
```

単体操作の14ツールの入力と期待する結果を収録した、199件のテストデータで互換性を検証します。API応答にはダミーHTTPサーバーを使います。

プロトコルテストでは実バイナリを起動し、新旧仕様での接続、stdoutとstderrの分離、EOF・SIGINT・SIGTERMによる終了を確認します。キャンセルがHTTP通信まで伝わることも検証します。

Dockerイメージにも同じstdio検証を実行できます。

```bash
docker build -t zaim-api-mcp .
ZAIM_MCP_TEST_IMAGE=zaim-api-mcp go test ./internal/mcp -run TestStdioServer -count=1
```

テストは実Zaim APIへ接続しません。実バイナリの検証では、認証情報の環境変数を空にします。ローカルのバイナリを起動するときは、`HOME`と`XDG_CONFIG_HOME`も一時ディレクトリに向け、保存した認証情報を読まないようにしています。

PR作成・更新時とmainへの更新時には、GitHub Actionsでコードの整形、vet、race検査付きテスト、ビルドを確認します。Dockerでも新旧仕様での接続と終了処理を検証します。

### ディレクトリ構成

```text
cmd/zaim-api-mcp/       起動・終了処理、authサブコマンドの振り分け
internal/auth/         auth loginの認可フロー
internal/config/       環境変数・保存ファイルからの認証情報の読込、保存、伏字
internal/mcp/          MCPサーバーと契約・プロトコルテスト
internal/mcp/tools/    18ツール、入出力スキーマ、応答変換
internal/version/      サーバーバージョン
testdata/              互換性検証用のテストデータと既存ツール定義
```

## ライセンス

[MIT](LICENSE)

## 関連リンク

- [Zaim API](https://dev.zaim.net/)
- [MCP仕様](https://modelcontextprotocol.io/)
- [公式Go MCP SDK](https://github.com/modelcontextprotocol/go-sdk)
