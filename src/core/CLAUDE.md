# core ディレクトリ

## 概要

MCPサーバーのコア機能を実装するディレクトリです。ツール実行ロジック、エラーハンドリング、共通処理を担当します。

## 設計方針

### 単一責任の原則

各クラスは明確に定義された責任を持ち、MCPプロトコルの基本機能のみを扱います。

### 拡張性の確保

新しいツールの追加や機能拡張に対して、既存コードの修正を最小限に抑える設計を採用します。

## 実装ルール

### 1. ToolHandlerクラスの実装パターン

```typescript
export class ToolHandler {
  // バリデーション処理は共通化
  private validateAndParseInput<T>(
    args: unknown,
    schema: any,
    toolName: string
  ): T {
    // Zodスキーマを使用した厳密なバリデーション
  }

  // レスポンス形式は統一
  private formatResponse(result: any) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
}
```

### 2. エラーハンドリングパターン

```typescript
// MCPError を使用した統一的なエラー処理
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

throw new McpError(
  ErrorCode.InvalidParams,
  `Invalid parameters for ${toolName}: ${error.message}`
);
```

詳細な実装例については以下を参照：
- [ToolHandler実装例](./docs/examples/tool-handler-example.md)
- [エラーハンドリングパターン](./docs/patterns/error-handling.md)

## アンチパターン

### ❌ 避けるべきパターン

```typescript
// 直接throwではなく、McpErrorを使用する
throw new Error('Something went wrong');

// バリデーションなしの直接処理
async executeTool(name: string, args: any) {
  // argsをそのまま使用
}
```

### ✅ 推奨パターン

```typescript
// McpErrorを使用した適切なエラーハンドリング
throw new McpError(
  ErrorCode.InvalidParams,
  `Invalid parameters: ${error.message}`
);

// 型安全なバリデーション
const input = this.validateAndParseInput<InputType>(
  args, InputSchema, toolName
);
```

## パフォーマンス考慮事項

1. **遅延初期化**: 重いリソースは実際に使用されるまで初期化しない
2. **キャッシュ戦略**: 頻繁にアクセスされるリソースのキャッシュ実装

## セキュリティ考慮事項

1. **入力サニタイゼーション**: すべての外部入力はZodスキーマで検証
2. **環境変数の適切な管理**: 機密情報の漏洩防止

## 新規ツール追加時のチェックリスト

- [ ] ツールのswitchケースをexecuteTool()に追加
- [ ] 適切なエラーハンドリングを実装
- [ ] バリデーション処理を追加
- [ ] レスポンス形式を統一
- [ ] ドキュメントを更新