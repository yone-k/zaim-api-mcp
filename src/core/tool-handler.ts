import { 
  ErrorCode, 
  McpError 
} from '@modelcontextprotocol/sdk/types.js';

// 認証・ユーザー情報ツール
import {
  checkAuthStatusTool,
  getUserInfoTool,
  CheckAuthStatusInputSchema,
  GetUserInfoInputSchema
} from '../tools/auth/user-tools.js';

// 家計簿データ取得ツール
import {
  getMoneyRecordsTool,
  GetMoneyRecordsInputSchema
} from '../tools/money/money-read-tools.js';

// 家計簿データ作成ツール
import {
  createPaymentTool,
  createIncomeTool,
  createTransferTool,
  CreatePaymentInputSchema,
  CreateIncomeInputSchema,
  CreateTransferInputSchema
} from '../tools/money/money-write-tools.js';

// 家計簿データ更新ツール
import {
  updateMoneyRecordTool,
  UpdateMoneyRecordInputSchema
} from '../tools/money/money-update-tools.js';

// 家計簿データ削除ツール
import {
  deleteMoneyRecordTool,
  DeleteMoneyRecordInputSchema
} from '../tools/money/money-delete-tools.js';

// マスターデータ取得ツール
import {
  getUserCategoriesTool,
  getUserGenresTool,
  getUserAccountsTool,
  getDefaultCategoriesByModeTool,
  getDefaultGenresByModeTool,
  getCurrenciesTool,
  GetUserCategoriesInputSchema,
  GetUserGenresInputSchema,
  GetUserAccountsInputSchema,
  GetDefaultCategoriesByModeInputSchema,
  GetDefaultGenresByModeInputSchema,
  GetCurrenciesInputSchema
} from '../tools/master/master-data-tools.js';

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
      // 認証・ユーザー情報ツール
      case 'zaim_check_auth_status': {
        const input = this.validateAndParseInput(args, CheckAuthStatusInputSchema, name);
        const result = await checkAuthStatusTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_user_info': {
        const input = this.validateAndParseInput(args, GetUserInfoInputSchema, name);
        const result = await getUserInfoTool(input);
        return this.formatResponse(result);
      }

      // 家計簿データ取得ツール
      case 'zaim_get_money_records': {
        const input = this.validateAndParseInput(args, GetMoneyRecordsInputSchema, name);
        const result = await getMoneyRecordsTool(input);
        return this.formatResponse(result);
      }

      // 家計簿データ作成ツール
      case 'zaim_create_payment': {
        const input = this.validateAndParseInput(args, CreatePaymentInputSchema, name);
        const result = await createPaymentTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_create_income': {
        const input = this.validateAndParseInput(args, CreateIncomeInputSchema, name);
        const result = await createIncomeTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_create_transfer': {
        const input = this.validateAndParseInput(args, CreateTransferInputSchema, name);
        const result = await createTransferTool(input);
        return this.formatResponse(result);
      }

      // 家計簿データ更新ツール
      case 'zaim_update_money_record': {
        const input = this.validateAndParseInput(args, UpdateMoneyRecordInputSchema, name);
        const result = await updateMoneyRecordTool(input);
        return this.formatResponse(result);
      }

      // 家計簿データ削除ツール
      case 'zaim_delete_money_record': {
        const input = this.validateAndParseInput(args, DeleteMoneyRecordInputSchema, name);
        const result = await deleteMoneyRecordTool(input);
        return this.formatResponse(result);
      }

      // マスターデータ取得ツール
      case 'zaim_get_user_categories': {
        const input = this.validateAndParseInput(args, GetUserCategoriesInputSchema, name);
        const result = await getUserCategoriesTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_user_genres': {
        const input = this.validateAndParseInput(args, GetUserGenresInputSchema, name);
        const result = await getUserGenresTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_user_accounts': {
        const input = this.validateAndParseInput(args, GetUserAccountsInputSchema, name);
        const result = await getUserAccountsTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_default_categories': {
        const input = this.validateAndParseInput(args, GetDefaultCategoriesByModeInputSchema, name);
        const result = await getDefaultCategoriesByModeTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_default_genres': {
        const input = this.validateAndParseInput(args, GetDefaultGenresByModeInputSchema, name);
        const result = await getDefaultGenresByModeTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_currencies': {
        const input = this.validateAndParseInput(args, GetCurrenciesInputSchema, name);
        const result = await getCurrenciesTool(input);
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