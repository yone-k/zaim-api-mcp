# tools ディレクトリ

## 概要

MCPツールの実装を管理するディレクトリです。各ツールのカテゴリ別実装、ツールレジストリ、共通インターフェースを担当します。

## 設計方針

### モジュラー設計

各ツールは独立したモジュールとして実装し、他のツールに依存しない設計を採用します。

### 統一されたインターフェース

すべてのツールは共通のパターンに従い、入力スキーマ、出力スキーマ、ツール定義を含む構造で実装します。

## 実装ルール

### 1. ツールファイルの構造

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

### 2. レジストリへの登録パターン

```typescript
// registry.ts
import { toolDefinition as myTool } from './category/my-tool.js';

export const registeredTools: ToolDefinition[] = [
  myTool
];
```

詳細な実装例については以下を参照：
- [ツール実装例](./docs/examples/tool-implementation.md)
- [カテゴリ設計パターン](./docs/patterns/category-design.md)

## アンチパターン

### ❌ 避けるべきパターン

```typescript
// バリデーションなしの実装
export async function badTool(input: any) {
  return input.someProperty; // 型安全性なし
}

// 統一されていないエラー処理
export async function inconsistentTool(input: any) {
  throw new Error('Generic error'); // McpErrorを使用すべき
}
```

### ✅ 推奨パターン

```typescript
// 型安全な実装
export async function goodTool(input: MyToolInput): Promise<MyToolOutput> {
  // 適切な型チェックとエラーハンドリング
  if (!input.parameter) {
    throw new Error('Required parameter missing');
  }
  return { result: input.parameter };
}
```

## カテゴリ分類ガイドライン

### 基本的なカテゴリ

- `example/` - サンプル実装とテンプレート
- `utilities/` - 汎用的なユーティリティツール
- `api/` - 外部API連携ツール
- `file/` - ファイル操作ツール
- `data/` - データ処理ツール

### カテゴリ追加の基準

1. **機能的な関連性**: 似た機能をグループ化
2. **依存関係の整理**: 共通の依存関係を持つツールをまとめる
3. **保守性の向上**: 管理しやすい粒度でカテゴリを分割

## パフォーマンス考慮事項

1. **遅延読み込み**: 大きなツールは必要時にのみ読み込み
2. **キャッシュ戦略**: 重い処理結果の適切なキャッシュ

## セキュリティ考慮事項

1. **入力検証**: すべてのツール入力はZodスキーマで厳密に検証
2. **機密情報の取り扱い**: 環境変数やAPIキーの適切な管理

## 新規ツール追加時のチェックリスト

- [ ] 適切なカテゴリディレクトリに配置
- [ ] 入力スキーマ（Zod）を定義
- [ ] 出力スキーマ（Zod）を定義
- [ ] MCPツール定義を実装
- [ ] ツール実装関数を作成
- [ ] registry.tsに登録
- [ ] core/tool-handler.tsのswitchケースに追加
- [ ] テストを作成
- [ ] ドキュメントを更新