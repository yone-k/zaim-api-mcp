import { ToolDefinition } from '../types/mcp.js';

// 認証・ユーザー情報ツール
import { 
  checkAuthStatusToolDefinition,
  getUserInfoToolDefinition
} from './auth/user-tools.js';

// 家計簿データ取得ツール
import { 
  getMoneyRecordsToolDefinition
} from './money/money-read-tools.js';

// 家計簿データ作成ツール
import { 
  createPaymentToolDefinition,
  createIncomeToolDefinition,
  createTransferToolDefinition
} from './money/money-write-tools.js';

// 家計簿データ更新ツール
import { 
  updateMoneyRecordToolDefinition
} from './money/money-update-tools.js';

// 家計簿データ削除ツール
import { 
  deleteMoneyRecordToolDefinition
} from './money/money-delete-tools.js';

// マスターデータ取得ツール
import { 
  getUserCategoriesToolDefinition,
  getUserGenresToolDefinition,
  getUserAccountsToolDefinition,
  getDefaultCategoriesByModeToolDefinition,
  getDefaultGenresByModeToolDefinition,
  getCurrenciesToolDefinition
} from './master/master-data-tools.js';

export const registeredTools: ToolDefinition[] = [
  // 認証・ユーザー情報
  checkAuthStatusToolDefinition,
  getUserInfoToolDefinition,
  
  // 家計簿データ取得
  getMoneyRecordsToolDefinition,
  
  // 家計簿データ作成
  createPaymentToolDefinition,
  createIncomeToolDefinition,
  createTransferToolDefinition,
  
  // 家計簿データ更新
  updateMoneyRecordToolDefinition,
  
  // 家計簿データ削除
  deleteMoneyRecordToolDefinition,
  
  // マスターデータ取得
  getUserCategoriesToolDefinition,
  getUserGenresToolDefinition,
  getUserAccountsToolDefinition,
  getDefaultCategoriesByModeToolDefinition,
  getDefaultGenresByModeToolDefinition,
  getCurrenciesToolDefinition
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