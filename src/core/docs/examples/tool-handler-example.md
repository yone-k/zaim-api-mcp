# ToolHandler実装例

## 基本的な実装パターン

```typescript
import { 
  ErrorCode, 
  McpError 
} from '@modelcontextprotocol/sdk/types.js';

export class ToolHandler {
  private validateAndParseInput<T>(
    args: unknown,
    schema: any,
    toolName: string
  ): T {
    try {
      return schema.parse(args || {});
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters for ${toolName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

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

  async executeTool(name: string, args: unknown) {
    switch (name) {
      case 'example_tool': {
        // バリデーションを経たツール実行
        const input = this.validateAndParseInput<ExampleToolInput>(
          args, ExampleToolInputSchema, 'example_tool'
        );
        const result = await exampleTool(input);
        return this.formatResponse(result);
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  }
}
```

## カスタムクライアント統合例

```typescript
export class ToolHandler {
  private customClient: CustomClient | null = null;

  private async ensureCustomClient(): Promise<CustomClient> {
    if (!this.customClient) {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'API_KEY environment variable is not set'
        );
      }
      this.customClient = new CustomClient(apiKey);
    }
    return this.customClient;
  }

  async executeTool(name: string, args: unknown) {
    const client = await this.ensureCustomClient();
    
    switch (name) {
      case 'api_tool': {
        const input = this.validateAndParseInput<ApiToolInput>(
          args, ApiToolInputSchema, 'api_tool'
        );
        const result = await apiTool(client, input);
        return this.formatResponse(result);
      }
      // ...
    }
  }
}
```