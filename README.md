# MCP Base Server

[English README](README.en.md)

MCP (Model Context Protocol) サーバー作成用のベーステンプレートです。

## 特徴

- TypeScriptベースのMCPサーバー実装
- モジュラーなツールアーキテクチャ
- Zodスキーマによる組み込みバリデーション
- サンプルツール実装
- Vitestテスト環境
- 包括的なエラーハンドリング
- 高速なMCPサーバー開発テンプレート

## 要件

- Docker
- Docker Compose（オプション）

## インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd mcp-base

# Dockerイメージをビルド
docker build -t mcp-base .
```

## 使用方法

### Docker（推奨）

```bash
# 基本実行
docker run --rm -i mcp-base

# 環境変数を指定して実行
docker run --rm -i -e API_KEY=your_api_key_here mcp-base

# Docker Composeを使用
docker-compose up --build
```

### 開発環境（ローカル開発用）

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

## MCPクライアント設定

### Claude Desktop

1. Claude Desktopの設定ファイルを編集します：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. 以下の設定を追加します：

#### Dockerを使用する場合（推奨）

```json
{
  "mcpServers": {
    "mcp-base": {
      "command": "docker",
      "args": [
        "run", 
        "--rm", 
        "-i",
        "mcp-base"
      ]
    }
  }
}
```

#### ローカルビルドを使用する場合

```json
{
  "mcpServers": {
    "mcp-base": {
      "command": "node",
      "args": ["/path/to/mcp-base/dist/index.js"]
    }
  }
}
```

#### 開発環境での設定

```json
{
  "mcpServers": {
    "mcp-base-dev": {
      "command": "npx",
      "args": ["ts-node", "/path/to/mcp-base/src/index.ts"],
      "cwd": "/path/to/mcp-base"
    }
  }
}
```

### その他のMCPクライアント

stdio転送をサポートする任意のMCPクライアントから利用できます：

```bash
# Dockerで直接実行
docker run --rm -i mcp-base
```

## アーキテクチャ

プロジェクトはモジュラーアーキテクチャに従います：

- `src/index.ts` - メインサーバーエントリーポイント
- `src/core/tool-handler.ts` - コアツール実行ロジック
- `src/tools/` - カテゴリ別に整理されたツール実装
- `src/tools/registry.ts` - ツール登録と発見
- `src/types/` - TypeScript型定義

## 新しいツールの追加

1. `src/tools/[category]/[tool-name].ts`に新しいツールファイルを作成
2. ツールスキーマ、入出力型、実装を定義
3. 登録用に`toolDefinition`をエクスポート
4. `src/tools/registry.ts`にツールを追加
5. `src/core/tool-handler.ts`のツールハンドラーを更新

## ツール実装テンプレート

```typescript
import { z } from 'zod';
import { ToolDefinition } from '../../types/mcp.js';

// 入力スキーマ定義
export const MyToolInputSchema = z.object({
  parameter: z.string().describe('パラメータの説明'),
  optionalParam: z.boolean().optional().default(false)
}).strict();

export type MyToolInput = z.infer<typeof MyToolInputSchema>;

// MCPツール定義
export const toolDefinition: ToolDefinition = {
  name: 'my_tool',
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

// 出力スキーマ定義
export const MyToolOutputSchema = z.object({
  result: z.string(),
  timestamp: z.string().optional()
});

export type MyToolOutput = z.infer<typeof MyToolOutputSchema>;

// ツール実装
export async function myTool(input: MyToolInput): Promise<MyToolOutput> {
  return {
    result: `処理結果: ${input.parameter}`,
    timestamp: new Date().toISOString()
  };
}
```

## カスタマイズガイド

### 1. プロジェクト名の変更

`package.json`と`src/index.ts`をプロジェクト名で更新：

```typescript
// src/index.ts
this.server = new Server({
  name: 'your-mcp-server',
  version: '1.0.0',
});
```

### 2. カスタムクライアントの追加

`src/core/tool-handler.ts`にカスタムクライアントを追加：

```typescript
export class ToolHandler {
  private customClient: CustomClient | null = null;

  private async ensureCustomClient(): Promise<CustomClient> {
    if (!this.customClient) {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'API_KEY環境変数が設定されていません'
        );
      }
      this.customClient = new CustomClient(apiKey);
    }
    return this.customClient;
  }
}
```

### 3. 環境変数

必要に応じて環境変数の処理を追加：

```bash
# 環境変数の例
export API_KEY="your_api_key_here"
export LOG_LEVEL="info"
```

## 利用可能なスクリプト

- `npm run build` - TypeScriptをJavaScriptにコンパイル
- `npm run start` - 本番サーバーを開始
- `npm run dev` - ts-nodeで開発サーバーを開始
- `npm run lint` - ESLintを実行
- `npm run typecheck` - TypeScript型チェックを実行
- `npm test` - テストを実行
- `npm run test:watch` - 監視モードでテストを実行
- `npm run test:coverage` - カバレッジレポート付きでテストを実行
- `npm run docker:build` - Dockerイメージをビルド
- `npm run docker:run` - Dockerコンテナを実行
- `npm run docker:dev` - Docker Composeで開発環境を起動

## プロジェクト構造

```
mcp-base/
├── src/
│   ├── core/
│   │   └── tool-handler.ts    # コアツール実行ロジック
│   ├── tools/
│   │   ├── registry.ts        # ツール登録
│   │   └── example/
│   │       └── example-tool.ts # サンプルツール実装
│   ├── types/
│   │   └── mcp.ts            # 型定義
│   └── index.ts              # メインサーバーエントリーポイント
├── dist/                     # コンパイル済みJavaScript出力
├── package.json              # プロジェクト依存関係とスクリプト
├── tsconfig.json             # TypeScript設定
├── vitest.config.ts          # テスト設定
├── CLAUDE.md                 # 開発ドキュメント
└── README.md                 # このファイル
```

## 貢献

1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. テスト付きで変更を追加
4. lintと型チェックを実行
5. プルリクエストを提出

## ライセンス

MITライセンス - 詳細は[LICENSE](LICENSE)ファイルを参照してください。