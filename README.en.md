# MCP Base Server

A base template for creating MCP (Model Context Protocol) servers.

## Features

- TypeScript-based MCP server implementation
- Modular tool architecture
- Built-in validation with Zod schemas
- Example tool implementation
- Testing setup with Vitest
- Comprehensive error handling
- Template for rapid MCP server development

## Requirements

- Docker
- Docker Compose (optional)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-base

# Build Docker image
docker build -t mcp-base .
```

## Usage

### Docker (Recommended)

```bash
# Basic execution
docker run --rm -i mcp-base

# With environment variables
docker run --rm -i -e API_KEY=your_api_key_here mcp-base

# Using Docker Compose
docker-compose up --build
```

### Development Environment (Local Development)

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Run tests
npm test

# Build
npm run build
```

## MCP Client Configuration

### Claude Desktop

1. Edit Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the following configuration:

#### Using Docker (Recommended)

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

#### Using local build

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

#### For development environment

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

### Other MCP Clients

Any MCP client that supports stdio transport:

```bash
# Run with Docker directly
docker run --rm -i mcp-base
```

## Architecture

The project follows a modular architecture:

- `src/index.ts` - Main server entry point
- `src/core/tool-handler.ts` - Core tool execution logic
- `src/tools/` - Tool implementations organized by category
- `src/tools/registry.ts` - Tool registration and discovery
- `src/types/` - TypeScript type definitions

## Adding New Tools

1. Create a new tool file in `src/tools/[category]/[tool-name].ts`
2. Define the tool schema, input/output types, and implementation
3. Export the `toolDefinition` for registration
4. Add the tool to `src/tools/registry.ts`
5. Update the tool handler in `src/core/tool-handler.ts`

## Tool Implementation Template

```typescript
import { z } from 'zod';
import { ToolDefinition } from '../../types/mcp.js';

// Input schema definition
export const MyToolInputSchema = z.object({
  parameter: z.string().describe('Parameter description'),
  optionalParam: z.boolean().optional().default(false)
}).strict();

export type MyToolInput = z.infer<typeof MyToolInputSchema>;

// MCP tool definition
export const toolDefinition: ToolDefinition = {
  name: 'my_tool',
  description: 'Description of what the tool does',
  inputSchema: {
    type: 'object' as const,
    properties: {
      parameter: {
        type: 'string',
        description: 'Parameter description'
      },
      optionalParam: {
        type: 'boolean',
        description: 'Optional parameter description',
        default: false
      }
    },
    required: ['parameter'],
    additionalProperties: false
  }
};

// Output schema definition
export const MyToolOutputSchema = z.object({
  result: z.string(),
  timestamp: z.string().optional()
});

export type MyToolOutput = z.infer<typeof MyToolOutputSchema>;

// Tool implementation
export async function myTool(input: MyToolInput): Promise<MyToolOutput> {
  return {
    result: `Processed: ${input.parameter}`,
    timestamp: new Date().toISOString()
  };
}
```

## Customization Guide

### 1. Change Project Name

Update `package.json` and `src/index.ts` with your project name:

```typescript
// src/index.ts
this.server = new Server({
  name: 'your-mcp-server',
  version: '1.0.0',
});
```

### 2. Add Custom Client

Add your custom client in `src/core/tool-handler.ts`:

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
}
```

### 3. Environment Variables

Add environment variable handling as needed:

```bash
# Example environment variables
export API_KEY="your_api_key_here"
export LOG_LEVEL="info"
```

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run dev` - Start development server with ts-node
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container
- `npm run docker:dev` - Start development environment with Docker Compose

## Project Structure

```
mcp-base/
├── src/
│   ├── core/
│   │   └── tool-handler.ts    # Core tool execution logic
│   ├── tools/
│   │   ├── registry.ts        # Tool registration
│   │   └── example/
│   │       └── example-tool.ts # Example tool implementation
│   ├── types/
│   │   └── mcp.ts            # Type definitions
│   └── index.ts              # Main server entry point
├── dist/                     # Compiled JavaScript output
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Test configuration
├── CLAUDE.md                 # Development documentation
└── README.md                 # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your changes with tests
4. Run lint and type check
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.