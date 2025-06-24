/**
 * JSON Schema property definition for MCP tool input schemas
 * Based on JSON Schema Draft 7 specification
 */
export interface JSONSchemaProperty {
  /** The type of the property (string, number, boolean, object, array, etc.) */
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
  /** Human-readable description of the property */
  description?: string;
  /** Default value for the property */
  default?: unknown;
  /** Schema for array items (when type is 'array') */
  items?: JSONSchemaProperty;
  /** Object properties (when type is 'object') */
  properties?: Record<string, JSONSchemaProperty>;
  /** Required property names (when type is 'object') */
  required?: string[];
  /** Whether additional properties are allowed (when type is 'object') */
  additionalProperties?: boolean;
  /** Enumerated values for the property */
  enum?: unknown[];
}

/**
 * MCP Tool definition interface
 * Defines the structure and schema for MCP tools
 */
export interface ToolDefinition {
  /** Unique identifier for the tool */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** JSON Schema definition for the tool's input parameters */
  inputSchema: {
    /** Always 'object' for MCP tool inputs */
    type: 'object';
    /** Properties that can be passed to the tool */
    properties: Record<string, JSONSchemaProperty>;
    /** Names of required properties */
    required?: string[];
    /** Whether additional properties beyond those defined are allowed */
    additionalProperties?: boolean;
  };
}