# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Zaim API MCP Server

## プロジェクト概要

Zaim API との連携を提供するMCP (Model Context Protocol) サーバーです。OAuth 1.0a認証を使用してZaimの家計簿APIにアクセスし、Claudeが日本の家計簿管理サービスを操作できるようにします。

### 技術スタック

- **言語**: TypeScript
- **フレームワーク**: MCP SDK (@modelcontextprotocol/sdk)
- **バリデーション**: Zod
- **実行環境**: Node.js 22+
- **テストフレームワーク**: Vitest
- **認証**: OAuth 1.0a

## 開発コマンド

```bash
# ビルド・実行
npm run build          # TypeScriptコンパイル
npm run start          # 本番環境実行
npm run dev            # 開発サーバー実行

# テスト
npm test               # 全テスト実行
npm run test:watch     # 監視モードでテスト実行
npm run test:coverage  # カバレッジ付きテスト実行
npm run test:ui        # インタラクティブなテストUI

# コード品質
npm run lint           # ESLint実行
npm run typecheck      # TypeScript型チェック

# Docker
npm run docker:build  # Dockerイメージビルド
npm run docker:run    # Dockerコンテナ実行
npm run docker:dev    # Docker Compose開発環境
```

## アーキテクチャ

### 設計方針

**MCPプロトコル準拠**: Model Context Protocolの仕様に完全準拠
**OAuth 1.0a統合**: Zaim APIとの安全な認証・通信
**モジュラー設計**: 機能別ツール実装とレジストリパターン
**型安全性**: TypeScriptとZodによる厳密な型安全性
**包括的テスト**: 128テストケースによる高品質保証

### ディレクトリ構造

```
zaim-api-mcp/
├── src/
│   ├── core/                     # コア機能
│   │   ├── tool-handler.ts       # ツール実行ハンドラー
│   │   └── zaim-api-client.ts    # OAuth 1.0a APIクライアント
│   ├── tools/                    # 機能別ツール実装
│   │   ├── auth/                 # 認証・ユーザー情報（2ツール）
│   │   ├── money/                # 家計簿CRUD操作（5ツール）
│   │   ├── master/               # マスターデータ取得（6ツール）
│   │   └── registry.ts           # ツールレジストリ
│   ├── types/                    # 型定義
│   │   ├── mcp.ts               # MCPプロトコル型
│   │   ├── oauth.ts             # OAuth型定義
│   │   └── zaim-api.ts          # Zaim APIレスポンス型
│   ├── utils/                    # ユーティリティ
│   │   ├── oauth-signature.ts    # OAuth署名生成
│   │   └── token-storage.ts      # トークン永続化
│   └── index.ts                  # サーバーエントリーポイント
├── tests/                        # テストスイート（128テスト）
├── config/                       # 設定ファイル
└── docker-compose.yml           # 開発環境
```

### 実装済みツール（14個）

**認証ツール（2個）**
- `zaim_check_auth_status`: OAuth認証状態確認
- `zaim_get_user_info`: ユーザー情報取得

**家計簿データツール（5個）**
- `zaim_get_money_records`: データ検索・取得（フィルタ・ページネーション対応）
- `zaim_create_payment`: 支出データ作成
- `zaim_create_income`: 収入データ作成
- `zaim_create_transfer`: 振替データ作成
- `zaim_update_money_record`: データ更新
- `zaim_delete_money_record`: データ削除

**マスターデータツール（6個）**
- `zaim_get_user_categories`: ユーザー定義カテゴリ
- `zaim_get_user_genres`: ユーザー定義ジャンル
- `zaim_get_user_accounts`: ユーザー口座一覧
- `zaim_get_default_categories`: システムカテゴリ
- `zaim_get_default_genres`: システムジャンル
- `zaim_get_currencies`: 通貨一覧

### アーキテクチャパターン

**ツールレジストリパターン**: `registry.ts`での一元管理
**ハンドラーパターン**: `ToolHandler`クラスによる統一処理
**OAuth認証パターン**: `ZaimApiClient`でのRFC準拠実装

## テスト実行

### テストコマンド

```bash
# 全テスト実行
npm test

# 監視モードでテスト実行（開発時推奨）
npm run test:watch

# カバレッジ付きテスト実行
npm run test:coverage

# インタラクティブなテストUI
npm run test:ui

# 特定のテストファイル実行
npm test -- tests/auth/user-tools.test.ts

# 特定のテストパターンで実行
npm test -- --grep "認証"
```

### テスト構造

- **テスト総数**: 128テストケース
- **カバレッジ**: 95%以上を維持
- **モック**: vi.mock()による外部依存関係のモック
- **統合テスト**: エンドツーエンドのツール実行テスト

## 環境設定

### 必須環境変数

```bash
ZAIM_CONSUMER_KEY=your_consumer_key
ZAIM_CONSUMER_SECRET=your_consumer_secret  
ZAIM_ACCESS_TOKEN=your_access_token
ZAIM_ACCESS_TOKEN_SECRET=your_access_token_secret
```

### 設定ファイル

- `config/zaim-config.json`: API設定、レート制限、キャッシュ設定
- `.eslintrc.json`: コード品質設定
- `tsconfig.json`: TypeScript設定
- `vitest.config.ts`: テスト設定

## 開発ガイドライン

### コーディング規約

- **ファイル命名**: kebab-case (例: money-read-tools.ts)
- **クラス命名**: PascalCase (例: ZaimMCPServer)
- **関数・変数命名**: camelCase (例: getUserInfo)
- **定数命名**: UPPER_SNAKE_CASE (例: DEFAULT_TIMEOUT)
- **型命名**: PascalCase with suffix (例: CreatePaymentInput)

### 新規ツール追加フロー

1. **ツールファイルの作成**: `src/tools/{category}/{tool-name}.ts`
2. **ツール定義の実装**: 以下の要素を含める
   - 入力スキーマ（Zod）
   - 出力スキーマ（Zod）
   - ツール定義（MCP形式）
   - 実装関数
3. **レジストリへの登録**: `src/tools/registry.ts`に追加
4. **ハンドラーの更新**: `src/core/tool-handler.ts`のswitchケースに追加
5. **テストの作成**: `tests/{category}/{tool-name}.test.ts`
6. **型定義の更新**: 必要に応じて`src/types/`の型定義を更新

### 重要な実装パターン

**OAuth認証の実装**
- `ZaimApiClient.ensureAuthenticated()`で認証確認
- OAuth 1.0a署名は`oauth-signature.ts`で自動生成
- トークンの永続化は`token-storage.ts`で管理

**エラーハンドリング**
- MCPエラー（`McpError`）でクライアントに適切な情報を返す
- Zaim APIエラーは`ZaimApiClient`で標準化
- バリデーションエラーはZodで自動生成

**レスポンス形式**
- 全ツールで統一されたJSON形式を使用
- `content`配列内に`TextContent`型でデータを格納
- エラー時は`isError`フラグとエラーメッセージを含める

## ツール実装テンプレート

```typescript
import { z } from 'zod';
import { ToolDefinition } from '../../types/mcp.js';

export const MyToolInputSchema = z.object({
  parameter: z.string().describe('パラメータの説明'),
  optionalParam: z.boolean().optional().default(false)
}).strict();

export type MyToolInput = z.infer<typeof MyToolInputSchema>;

export const toolDefinition: ToolDefinition = {
  name: 'zaim_my_tool',  // 必ずzaim_プレフィックスを付ける
  description: 'ツールの機能説明',
  inputSchema: {
    type: 'object' as const,
    properties: {
      parameter: {
        type: 'string',
        description: 'パラメータの説明'
      },
      optionalParam: {
        type: 'boolean',
        description: 'オプションパラメータの説明',
        default: false
      }
    },
    required: ['parameter'],
    additionalProperties: false
  }
};

export const MyToolOutputSchema = z.object({
  result: z.string(),
  success: z.boolean(),
  timestamp: z.string()
});

export type MyToolOutput = z.infer<typeof MyToolOutputSchema>;

export async function myTool(input: MyToolInput): Promise<MyToolOutput> {
  // Zaim APIクライアントの使用例
  // const client = await ZaimApiClient.getInstance();
  // const response = await client.someApiCall(input.parameter);
  
  return {
    result: `処理結果: ${input.parameter}`,
    success: true,
    timestamp: new Date().toISOString()
  };
}
```

## 主要なファイル

### コアファイル
- `src/core/zaim-api-client.ts`: OAuth 1.0a認証とAPI通信の中核
- `src/core/tool-handler.ts`: ツール実行とエラーハンドリングの統一
- `src/tools/registry.ts`: 全ツールの登録とエクスポート
- `src/index.ts`: MCPサーバーのエントリーポイント

### 認証関連
- `src/utils/oauth-signature.ts`: RFC 5849準拠のOAuth署名生成
- `src/utils/token-storage.ts`: トークンの永続化とライフサイクル管理
- `src/types/oauth.ts`: OAuth関連の型定義

### API関連
- `src/types/zaim-api.ts`: Zaim APIレスポンスの型定義
- `config/zaim-config.json`: API設定（タイムアウト、レート制限等）

### 開発時の重要なポイント

**OAuth 1.0a認証フロー**
1. Consumer Key/Secretでリクエストトークン取得
2. ユーザーがブラウザで認証
3. アクセストークン交換
4. 永続化されたトークンでAPI呼び出し

**レート制限の考慮**
- Zaim APIは60リクエスト/分の制限
- `ZaimApiClient`で自動的にレート制限を管理
- 必要に応じてリトライ機構を実装

**エラーハンドリングのベストプラクティス**
- 認証エラー（401）: トークン再取得が必要
- レート制限エラー（429）: 自動リトライ
- その他のAPIエラー: 適切なMCPエラーに変換

## コミットガイドライン

### コミットメッセージの基本形式

```
<type>: <subject>

<body>
```

### タイプ分類

- **feat**: 新機能の追加
- **fix**: バグ修正
- **docs**: ドキュメントのみの変更
- **style**: コードの動作に影響しない変更（空白、フォーマット、セミコロンの欠落など）
- **refactor**: バグ修正や機能追加を行わないコードの変更
- **test**: テストの追加や既存テストの修正
- **chore**: ビルドプロセスや補助ツールの変更

### 日本語コミットメッセージの原則

**言語統一**: すべてのコミットメッセージは日本語で記載する
**簡潔性**: 50文字以内の簡潔な件名を心がける
**具体性**: 何を変更したかを具体的に記述する
**理由の明示**: 必要に応じて変更理由をボディに記載する

### コミットメッセージの例

```bash
feat: Discord メッセージ送信機能を追加

- sendMessage ツールの実装
- Zodによる入力バリデーション
- エラーハンドリングとレスポンス処理を含む

```

```bash
fix: Discord API認証エラーのハンドリングを修正

- 401エラー時の適切なエラーメッセージ表示
- トークン無効時のリトライロジックを改善

```

```bash
docs: README.mdにトラブルシューティングセクションを追加

- よくある問題と解決方法を整理
- Docker関連の問題解決手順を詳細化
- MCP接続エラーの対処法を追加

```

### 禁止事項

- **英語の混在**: コミットメッセージ内で英語と日本語を混在させない
- **曖昧な表現**: 「修正」「更新」など具体性に欠ける表現の単独使用
- **冗長な説明**: 不必要に長いコミットメッセージ

## クイックスタート

```bash
# 1. プロジェクトをクローン
git clone [this-repo]
cd mcp-base

# 2. Dockerイメージをビルド
docker build -t mcp-base .

# 3. Claude Desktop設定
# ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "mcp-base": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "mcp-base"]
    }
  }
}
```

## 関連ドキュメント

- **[MCP SDK Documentation](https://modelcontextprotocol.io/docs)**
- **[TypeScript Documentation](https://www.typescriptlang.org/docs/)**
- **[Zod Documentation](https://zod.dev/)**