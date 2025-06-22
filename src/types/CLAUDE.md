# types ディレクトリ

## 概要

プロジェクト全体で使用される型定義を管理するディレクトリです。MCPプロトコルインターフェース、共通データ型、ユーティリティ型を提供します。

## 設計方針

### 型安全性の確保

すべての型定義は厳密で明確な制約を持ち、実行時エラーを防ぐことを目的とします。

### 再利用性の重視

共通的に使用される型は抽象化し、複数のモジュールで再利用可能な形で定義します。

## 実装ルール

### 1. MCP型定義パターン

```typescript
// MCPプロトコルに準拠したインターフェース
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}
```

### 2. 共通型の命名規則

```typescript
// インターフェースはPascalCaseで定義
export interface ToolDefinition { }
export interface ServerConfig { }

// 型エイリアスも同様
export type ToolName = string;
export type ToolResult = any;

// ユニオン型は用途を明確に
export type ErrorType = 'validation' | 'execution' | 'network';
```

詳細な実装例については以下を参照：
- [型定義例](./docs/examples/type-definitions.md)
- [ジェネリック活用パターン](./docs/patterns/generics.md)

## アンチパターン

### ❌ 避けるべきパターン

```typescript
// 過度にanyを使用
export interface BadInterface {
  data: any;
  result: any;
}

// 曖昧な命名
export interface Thing {
  stuff: unknown;
}
```

### ✅ 推奨パターン

```typescript
// 明確で具体的な型定義
export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// 意味のある命名
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}
```

## 型定義の分類

### コア型

- **MCPプロトコル関連**: ToolDefinition, ServerConfig
- **エラー型**: ErrorCode, ErrorMessage
- **共通データ型**: ID, Timestamp, Status

### ユーティリティ型

- **条件型**: Optional<T>, Required<T>
- **変換型**: Partial<T>, Pick<T, K>
- **合成型**: Union, Intersection

### ドメイン固有型

- **ツール関連**: ToolInput, ToolOutput
- **設定関連**: Config, Environment
- **レスポンス関連**: APIResponse, ErrorResponse

## 型安全性のベストプラクティス

### 1. strictモードの活用

```typescript
// tsconfig.jsonでstrict: trueを設定
// nullableな値は明示的に定義
export interface Config {
  apiKey: string;
  timeout?: number; // オプショナル
  endpoint: string | null; // nullableを明示
}
```

### 2. ジェネリックの適切な使用

```typescript
// 再利用可能なジェネリック型
export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// 制約付きジェネリック
export interface Tool<TInput extends Record<string, any>> {
  name: string;
  execute(input: TInput): Promise<any>;
}
```

## パフォーマンス考慮事項

1. **型計算の最適化**: 複雑な条件型の使用を最小限に抑制
2. **インポートの効率化**: 必要な型のみをインポート

## セキュリティ考慮事項

1. **機密情報の型定義**: パスワードやAPIキーの適切な型管理
2. **入力検証**: 型レベルでの制約定義

## 新規型追加時のチェックリスト

- [ ] 明確で意味のある型名
- [ ] 適切なジェネリック制約
- [ ] JSDocコメントの追加
- [ ] エクスポートの確認
- [ ] 他の型との整合性確認
- [ ] 使用例の追加
- [ ] ドキュメントの更新