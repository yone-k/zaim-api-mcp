# MCP Base Server

## プロジェクト概要

汎用的なMCP (Model Context Protocol) サーバーのベーステンプレートです。新しいMCPサーバーを簡単に作成できるように設計されています。

### 技術スタック

- **言語**: TypeScript
- **フレームワーク**: MCP SDK (@modelcontextprotocol/sdk)
- **バリデーション**: Zod
- **実行環境**: Node.js 22+
- **テストフレームワーク**: Vitest

## アーキテクチャ

### 設計方針

**MCPプロトコル準拠**: Model Context Protocolの仕様に完全準拠し、標準的なMCPクライアントとの互換性を保つ
**モジュラー設計**: ツール実装を独立したモジュールとして管理し、拡張性を重視
**型安全性**: TypeScriptとZodを活用した厳密な型チェック
**テンプレート性**: 新しいMCPサーバー開発の出発点として使用可能

### ディレクトリ構造

```
mcp-base/
├── src/
│   ├── core/              # MCPサーバーのコア機能
│   │   └── tool-handler.ts    # 共通ツールハンドラー
│   ├── tools/             # MCPツール実装（カテゴリ別整理）
│   │   ├── registry.ts         # ツールレジストリ
│   │   └── example/            # サンプルツール実装
│   ├── types/             # 型定義
│   └── index.ts           # エントリーポイント
├── package.json           # 依存関係とスクリプト
├── tsconfig.json          # TypeScript設定
├── vitest.config.ts       # テスト設定
├── README.md              # 使用方法
└── CLAUDE.md              # このファイル
```

### ツール管理アーキテクチャ

**ツールレジストリパターン**: 各ツールファイルにMCP定義を含め、`registry.ts`で一元管理
**動的ツール登録**: `index.ts`はレジストリから動的にツール一覧を取得
**共通ハンドラー**: `ToolHandler`クラスがバリデーションとエラーハンドリングを統一

## 開発ガイドライン

### コーディング規約

- **ファイル命名**: kebab-case (例: example-tool.ts)
- **クラス命名**: PascalCase (例: BaseMCPServer)
- **関数・変数命名**: camelCase (例: setupHandlers)
- **定数命名**: UPPER_SNAKE_CASE (例: DEFAULT_TIMEOUT)
- **型命名**: PascalCase with suffix (例: ExampleToolInput)

### 新規ツール追加フロー

1. **カテゴリの決定**: 追加するツールが属するカテゴリを決定
2. **ツールファイルの作成**: `src/tools/{category}/{tool-name}.ts`
3. **ツール定義の実装**: 以下の要素を含める
   - 入力スキーマ（Zod）
   - 出力スキーマ（Zod）
   - ツール定義（MCP形式）
   - 実装関数
4. **レジストリへの登録**: `src/tools/registry.ts`に追加
5. **ハンドラーの更新**: `src/core/tool-handler.ts`のswitchケースに追加
6. **テストの作成**: `src/tools/{category}/{tool-name}.test.ts`

### 開発コマンド

```bash
# Docker環境での開発
npm run docker:build    # Dockerイメージをビルド
npm run docker:run      # Dockerコンテナを実行
npm run docker:dev      # Docker Composeで開発環境を起動

# ローカル開発
npm run dev

# テスト実行
npm test
npm run test:watch      # 監視モード
npm run test:coverage   # カバレッジ付き

# ビルド
npm run build

# lint/typecheck
npm run lint
npm run typecheck
```

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

export const MyToolOutputSchema = z.object({
  result: z.string(),
  timestamp: z.string().optional()
});

export type MyToolOutput = z.infer<typeof MyToolOutputSchema>;

export async function myTool(input: MyToolInput): Promise<MyToolOutput> {
  // ツールの実装
  return {
    result: `処理結果: ${input.parameter}`,
    timestamp: new Date().toISOString()
  };
}
```

## カスタマイズガイド

### 1. プロジェクト名の変更

```bash
# package.jsonの名前を変更
# src/index.tsのサーバー名を変更
```

### 2. 独自クライアントの追加

`src/core/`に独自のクライアントクラスを追加し、`ToolHandler`で初期化：

```typescript
export class ToolHandler {
  private customClient: CustomClient | null = null;

  private async ensureCustomClient(): Promise<CustomClient> {
    if (!this.customClient) {
      this.customClient = new CustomClient();
    }
    return this.customClient;
  }
}
```

### 3. 環境変数の管理

必要な環境変数を`ToolHandler`で管理：

```typescript
private async ensureClient(): Promise<Client> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      'API_KEY環境変数が設定されていません'
    );
  }
  return new Client(apiKey);
}
```

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