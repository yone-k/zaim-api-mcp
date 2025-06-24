import { z } from 'zod';

type JSONSchemaPropertyBase = {
  /** The type of the property (string, number, boolean, object, array, etc.) */
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
  /** Human-readable description of the property */
  description?: string;
  /** Default value for the property */
  default?: unknown;
  /** Whether additional properties are allowed (when type is 'object') */
  additionalProperties?: boolean;
  /** Enumerated values for the property */
  enum?: unknown[];
};

export type JSONSchemaProperty = JSONSchemaPropertyBase & {
  /** Schema for array items (when type is 'array') */
  items?: JSONSchemaProperty;
  /** Object properties (when type is 'object') */
  properties?: Record<string, JSONSchemaProperty>;
  /** Required property names (when type is 'object') */
  required?: string[];
};

/**
 * JSON Schema property definition for MCP tool input schemas
 * Based on JSON Schema Draft 7 specification
 */
export const JSONSchemaPropertySchema: z.ZodType<JSONSchemaProperty> = z.object({
  /** The type of the property (string, number, boolean, object, array, etc.) */
  type: z.enum(['string', 'number', 'integer', 'boolean', 'object', 'array', 'null']),
  /** Human-readable description of the property */
  description: z.string().optional(),
  /** Default value for the property */
  default: z.unknown().optional(),
  /** Schema for array items (when type is 'array') */
  items: z.lazy(() => JSONSchemaPropertySchema).optional(),
  /** Object properties (when type is 'object') */
  properties: z.record(z.string(), z.lazy(() => JSONSchemaPropertySchema)).optional(),
  /** Required property names (when type is 'object') */
  required: z.array(z.string()).optional(),
  /** Whether additional properties are allowed (when type is 'object') */
  additionalProperties: z.boolean().optional(),
  /** Enumerated values for the property */
  enum: z.array(z.unknown()).optional(),
}).strict();

/**
 * MCP Tool definition interface
 * Defines the structure and schema for MCP tools
 */
export const ToolDefinitionSchema = z.object({
  /** Unique identifier for the tool */
  name: z.string(),
  /** Human-readable description of what the tool does */
  description: z.string(),
  /** JSON Schema definition for the tool's input parameters */
  inputSchema: z.object({
    /** Always 'object' for MCP tool inputs */
    type: z.literal('object'),
    /** Properties that can be passed to the tool */
    properties: z.record(z.string(), JSONSchemaPropertySchema),
    /** Names of required properties */
    required: z.array(z.string()).optional(),
    /** Whether additional properties beyond those defined are allowed */
    additionalProperties: z.boolean().optional(),
  }).strict(),
}).strict();

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;