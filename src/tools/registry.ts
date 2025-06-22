import { ToolDefinition } from '../types/mcp.js';

export const registeredTools: ToolDefinition[] = [
];

export function getToolByName(name: string): ToolDefinition | undefined {
  return registeredTools.find(tool => tool.name === name);
}

export function getAllToolNames(): string[] {
  return registeredTools.map(tool => tool.name);
}

export function getRegistryStats() {
  return {
    totalTools: registeredTools.length,
    toolNames: getAllToolNames()
  };
}