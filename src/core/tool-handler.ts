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
      case 'example_tool':
        const result = { message: 'Hello from example tool!', timestamp: new Date().toISOString() };
        return this.formatResponse(result);

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  }
}