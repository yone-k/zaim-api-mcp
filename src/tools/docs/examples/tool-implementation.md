# ツール実装の完全な例

## 基本的なツール実装

```typescript
import { z } from 'zod';
import { ToolDefinition } from '../../types/mcp.js';

// 入力スキーマ定義
export const CalculatorInputSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  a: z.number(),
  b: z.number()
}).strict();

export type CalculatorInput = z.infer<typeof CalculatorInputSchema>;

// MCPツール定義
export const toolDefinition: ToolDefinition = {
  name: 'calculator',
  description: 'Performs basic mathematical operations',
  inputSchema: {
    type: 'object' as const,
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The mathematical operation to perform'
      },
      a: {
        type: 'number',
        description: 'The first number'
      },
      b: {
        type: 'number',
        description: 'The second number'
      }
    },
    required: ['operation', 'a', 'b'],
    additionalProperties: false
  }
};

// 出力スキーマ定義
export const CalculatorOutputSchema = z.object({
  result: z.number(),
  operation: z.string(),
  inputs: z.object({
    a: z.number(),
    b: z.number()
  })
});

export type CalculatorOutput = z.infer<typeof CalculatorOutputSchema>;

// ツール実装
export async function calculator(input: CalculatorInput): Promise<CalculatorOutput> {
  let result: number;

  switch (input.operation) {
    case 'add':
      result = input.a + input.b;
      break;
    case 'subtract':
      result = input.a - input.b;
      break;
    case 'multiply':
      result = input.a * input.b;
      break;
    case 'divide':
      if (input.b === 0) {
        throw new Error('Division by zero is not allowed');
      }
      result = input.a / input.b;
      break;
    default:
      throw new Error(`Unsupported operation: ${input.operation}`);
  }

  return {
    result,
    operation: input.operation,
    inputs: {
      a: input.a,
      b: input.b
    }
  };
}
```

## 外部API連携ツールの例

```typescript
import axios from 'axios';

export const WeatherInputSchema = z.object({
  city: z.string().min(1, 'City name is required'),
  units: z.enum(['metric', 'imperial']).optional().default('metric')
}).strict();

export type WeatherInput = z.infer<typeof WeatherInputSchema>;

export const toolDefinition: ToolDefinition = {
  name: 'get_weather',
  description: 'Gets current weather information for a city',
  inputSchema: {
    type: 'object' as const,
    properties: {
      city: {
        type: 'string',
        description: 'The name of the city'
      },
      units: {
        type: 'string',
        enum: ['metric', 'imperial'],
        description: 'Temperature units (metric or imperial)',
        default: 'metric'
      }
    },
    required: ['city'],
    additionalProperties: false
  }
};

export const WeatherOutputSchema = z.object({
  city: z.string(),
  temperature: z.number(),
  description: z.string(),
  humidity: z.number(),
  units: z.string()
});

export type WeatherOutput = z.infer<typeof WeatherOutputSchema>;

export async function getWeather(input: WeatherInput): Promise<WeatherOutput> {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('WEATHER_API_KEY environment variable is not set');
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          q: input.city,
          appid: apiKey,
          units: input.units
        }
      }
    );

    const data = response.data;
    
    return {
      city: data.name,
      temperature: data.main.temp,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      units: input.units
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Weather API error: ${error.response?.data?.message || error.message}`);
    }
    throw new Error(`Failed to get weather data: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```