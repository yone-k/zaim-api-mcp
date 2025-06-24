# Zaim API MCP Server

[English README](README.en.md)

Zaim APIとの連携を可能にするMCP (Model Context Protocol) サーバーです。OAuth 1.0a認証を使用してZaimの家計簿データの取得・操作を行います。

## 特徴

- Zaim API（OAuth 1.0a）との完全な統合
- 14個の包括的なツールセット
- 家計簿データの取得・作成・更新・削除
- マスターデータ（カテゴリ、ジャンル、口座、通貨）の取得
- TypeScriptベースの型安全な実装
- Zodスキーマによる厳密なバリデーション
- 包括的なテストカバレッジ（128テスト）
- Dockerサポート

## 実装済みツール

### 認証・ユーザー情報
- `zaim_check_auth_status` - 認証状態の確認
- `zaim_get_user_info` - ユーザー情報の取得

### 家計簿データ操作
- `zaim_get_money_records` - 家計簿記録の取得（フィルタリング・ページネーション対応）
- `zaim_create_payment` - 支出記録の作成
- `zaim_create_income` - 収入記録の作成  
- `zaim_create_transfer` - 振替記録の作成
- `zaim_update_money_record` - 既存記録の更新
- `zaim_delete_money_record` - 記録の削除

### マスターデータ取得
- `zaim_get_user_categories` - ユーザーカテゴリ一覧
- `zaim_get_user_genres` - ユーザージャンル一覧
- `zaim_get_user_accounts` - ユーザー口座一覧
- `zaim_get_default_categories` - デフォルトカテゴリ一覧
- `zaim_get_default_genres` - デフォルトジャンル一覧
- `zaim_get_currencies` - 利用可能通貨一覧

## 要件

- Docker（推奨）
- Node.js 22+（ローカル開発時）
- Zaim APIのOAuth認証情報
  - Consumer Key
  - Consumer Secret
  - Access Token
  - Access Token Secret

## 環境変数設定

```bash
# 必須：Zaim API認証情報
ZAIM_CONSUMER_KEY=your_consumer_key
ZAIM_CONSUMER_SECRET=your_consumer_secret
ZAIM_ACCESS_TOKEN=your_access_token
ZAIM_ACCESS_TOKEN_SECRET=your_access_token_secret
```

## インストール

### Dockerを使用（推奨）

```bash
# リポジトリをクローン
git clone https://github.com/yone-k/zaim-api-mcp.git
cd zaim-api-mcp

# Dockerイメージをビルド
docker build -t zaim-api-mcp .
```

### ローカル開発

```bash
# 依存関係をインストール
npm install

# 開発モードで開始
npm run dev

# テスト実行
npm test

# ビルド
npm run build
```

## Claude Desktop設定

### 1. 設定ファイルの場所

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 2. Docker設定（推奨）

```json
{
  "mcpServers": {
    "zaim-api": {
      "command": "docker",
      "args": [
        "run", 
        "--rm", 
        "-i",
        "-e", "ZAIM_CONSUMER_KEY=your_consumer_key",
        "-e", "ZAIM_CONSUMER_SECRET=your_consumer_secret",
        "-e", "ZAIM_ACCESS_TOKEN=your_access_token",
        "-e", "ZAIM_ACCESS_TOKEN_SECRET=your_access_token_secret",
        "zaim-api-mcp"
      ]
    }
  }
}
```

### 3. ローカルビルド設定

```json
{
  "mcpServers": {
    "zaim-api": {
      "command": "node",
      "args": ["/path/to/zaim-api-mcp/dist/index.js"],
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

## 使用例

### 認証状態の確認
```
zaim_check_auth_status を使って認証が正しく設定されているか確認してください
```

### 家計簿データの取得
```
zaim_get_money_records を使って、2024年1月の支出記録を取得してください
```

### 支出の記録
```
zaim_create_payment を使って、本日1,500円の昼食代を食費カテゴリで記録してください
```

### カテゴリ一覧の取得
```
zaim_get_user_categories を使って利用可能なカテゴリ一覧を表示してください
```

## API設定

`config/zaim-config.json`で詳細な設定が可能です：

- APIタイムアウト設定
- レート制限設定
- キャッシュ設定
- ログレベル設定

## プロジェクト構造

```
zaim-api-mcp/
├── src/
│   ├── core/              # MCPサーバーコア機能
│   │   ├── tool-handler.ts
│   │   └── zaim-api-client.ts
│   ├── tools/             # ツール実装
│   │   ├── auth/          # 認証関連ツール
│   │   ├── money/         # 家計簿データツール
│   │   ├── master/        # マスターデータツール
│   │   └── registry.ts    # ツール登録
│   ├── types/             # 型定義
│   ├── utils/             # ユーティリティ
│   └── index.ts           # エントリーポイント
├── tests/                 # テストファイル
├── config/                # 設定ファイル
└── docker-compose.yml     # Docker設定
```

## 開発ガイド

### Git ワークフロー

1. 機能ごとにブランチを作成
2. TDD（テスト駆動開発）で実装
3. すべてのテストが通ることを確認
4. プルリクエストを作成

### コミットメッセージ規約

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメントの変更
refactor: リファクタリング
test: テストの追加・修正
chore: ビルドプロセスやツールの変更
```

### 利用可能なスクリプト

```bash
npm run build          # TypeScriptビルド
npm run start          # 本番サーバー起動
npm run dev            # 開発サーバー起動
npm run lint           # ESLint実行
npm run typecheck      # 型チェック
npm test               # テスト実行
npm run test:watch     # テスト監視モード
npm run test:coverage  # カバレッジレポート
npm run docker:build   # Dockerイメージビルド
npm run docker:run     # Dockerコンテナ実行
npm run docker:dev     # Docker Compose起動
```

## トラブルシューティング

### 認証エラー
- 環境変数が正しく設定されているか確認
- Zaim開発者サイトでアプリケーションの設定を確認
- アクセストークンの有効期限を確認

### Docker関連
- Dockerデーモンが起動しているか確認
- 環境変数が正しく渡されているか確認
- ログで詳細なエラーメッセージを確認

## 貢献

1. リポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feat/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: 素晴らしい機能を追加'`)
4. ブランチをプッシュ (`git push origin feat/amazing-feature`)
5. プルリクエストを作成

## ライセンス

MITライセンス - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 関連リンク

- [Zaim API ドキュメント](https://dev.zaim.net/)
- [MCP仕様](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)