import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolHandler } from '../src/core/tool-handler.js';
import { registeredTools, getToolByName, getAllToolNames, getRegistryStats } from '../src/tools/registry.js';

describe('Integration Tests', () => {
  let toolHandler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    toolHandler = new ToolHandler();
  });

  describe('Tool Registry', () => {
    it('should have all 12 tools registered', () => {
      expect(registeredTools).toHaveLength(12);
    });

    it('should include all expected tools', () => {
      const expectedTools = [
        'zaim_check_auth_status',
        'zaim_get_user_info',
        'zaim_get_money_records',
        'zaim_create_payment',
        'zaim_create_income',
        'zaim_create_transfer',
        'zaim_update_money_record',
        'zaim_delete_money_record',
        'zaim_get_user_categories',
        'zaim_get_user_genres',
        'zaim_get_user_accounts',
        'zaim_get_default_categories',
        'zaim_get_default_genres',
        'zaim_get_currencies'
      ];

      const toolNames = getAllToolNames();
      expectedTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });
    });

    it('should be able to find tools by name', () => {
      const authTool = getToolByName('zaim_check_auth_status');
      expect(authTool).toBeDefined();
      expect(authTool?.name).toBe('zaim_check_auth_status');

      const nonExistentTool = getToolByName('non_existent_tool');
      expect(nonExistentTool).toBeUndefined();
    });

    it('should provide correct registry stats', () => {
      const stats = getRegistryStats();
      expect(stats.totalTools).toBe(12);
      expect(stats.toolNames).toHaveLength(12);
    });
  });

  describe('Tool Categories', () => {
    it('should have authentication tools', () => {
      const authTools = registeredTools.filter(tool => 
        tool.name.includes('auth') || tool.name.includes('user_info')
      );
      expect(authTools).toHaveLength(2);
    });

    it('should have money operation tools', () => {
      const moneyTools = registeredTools.filter(tool => 
        tool.name.includes('money') || 
        tool.name.includes('payment') || 
        tool.name.includes('income') || 
        tool.name.includes('transfer')
      );
      expect(moneyTools).toHaveLength(6);
    });

    it('should have master data tools', () => {
      const masterTools = registeredTools.filter(tool => 
        tool.name.includes('categories') || 
        tool.name.includes('genres') || 
        tool.name.includes('accounts') || 
        tool.name.includes('currencies')
      );
      expect(masterTools).toHaveLength(6);
    });
  });

  describe('Tool Definitions Structure', () => {
    it('should have valid tool definitions', () => {
      registeredTools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(tool.inputSchema.additionalProperties).toBe(false);
      });
    });

    it('should have consistent naming convention', () => {
      registeredTools.forEach(tool => {
        expect(tool.name).toMatch(/^zaim_[a-z_]+$/);
      });
    });

    it('should have proper descriptions', () => {
      registeredTools.forEach(tool => {
        expect(tool.description.length).toBeGreaterThan(10);
        expect(tool.description).toMatch(/^[A-Z\u3042-\u3096\u30a2-\u30f6\u4e00-\u9faf]/);
      });
    });
  });

  describe('Tool Handler Integration', () => {
    it('should handle unknown tool requests', async () => {
      await expect(
        toolHandler.executeTool('unknown_tool', {})
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should validate input parameters', async () => {
      // Test with missing required parameters
      await expect(
        toolHandler.executeTool('zaim_create_payment', {})
      ).rejects.toThrow('Invalid parameters');
    });

    it('should handle valid requests (mocked)', async () => {
      // Mock the TokenStorage and API client
      vi.doMock('../src/utils/token-storage.js', () => ({
        TokenStorage: {
          createZaimApiClient: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ me: { id: 1, name: 'Test User' } })
          }))
        }
      }));

      // This would normally make an API call, but it's mocked
      const result = await toolHandler.executeTool('zaim_check_auth_status', {});
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
    });
  });

  describe('Tool Input Schemas', () => {
    it('should have required fields for create tools', () => {
      const createPayment = getToolByName('zaim_create_payment');
      expect(createPayment?.inputSchema.required).toContain('amount');
      expect(createPayment?.inputSchema.required).toContain('date');
      expect(createPayment?.inputSchema.required).toContain('category_id');

      const createIncome = getToolByName('zaim_create_income');
      expect(createIncome?.inputSchema.required).toContain('amount');
      expect(createIncome?.inputSchema.required).toContain('date');
      expect(createIncome?.inputSchema.required).toContain('category_id');

      const createTransfer = getToolByName('zaim_create_transfer');
      expect(createTransfer?.inputSchema.required).toContain('amount');
      expect(createTransfer?.inputSchema.required).toContain('date');
      expect(createTransfer?.inputSchema.required).toContain('from_account_id');
      expect(createTransfer?.inputSchema.required).toContain('to_account_id');
    });

    it('should have required fields for update and delete tools', () => {
      const updateTool = getToolByName('zaim_update_money_record');
      expect(updateTool?.inputSchema.required).toContain('id');
      expect(updateTool?.inputSchema.required).toContain('mode');

      const deleteTool = getToolByName('zaim_delete_money_record');
      expect(deleteTool?.inputSchema.required).toContain('id');
      expect(deleteTool?.inputSchema.required).toContain('mode');
    });

    it('should have mode enum for tools that need it', () => {
      const defaultCategories = getToolByName('zaim_get_default_categories');
      expect(defaultCategories?.inputSchema.properties.mode?.enum).toEqual(['payment', 'income']);

      const defaultGenres = getToolByName('zaim_get_default_genres');
      expect(defaultGenres?.inputSchema.properties.mode?.enum).toEqual(['payment', 'income']);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed input gracefully', async () => {
      await expect(
        toolHandler.executeTool('zaim_create_payment', { invalid: 'data' })
      ).rejects.toThrow('Invalid parameters');
    });

    it('should handle type mismatches', async () => {
      await expect(
        toolHandler.executeTool('zaim_create_payment', {
          amount: 'not a number',
          date: '2024-01-01',
          category_id: 101
        })
      ).rejects.toThrow('Invalid parameters');
    });
  });
});