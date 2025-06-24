import { 
  ErrorCode, 
  McpError 
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// 認証・ユーザー情報ツール
import {
  checkAuthStatusTool,
  getUserInfoTool,
  CheckAuthStatusInputSchema,
  GetUserInfoInputSchema,
  type CheckAuthStatusInput,
  type GetUserInfoInput
} from '../tools/auth/user-tools.js';

// 家計簿データ取得ツール
import {
  getMoneyRecordsTool,
  GetMoneyRecordsInputSchema,
} from '../tools/money/money-read-tools.js';

// 家計簿データ作成ツール
import {
  createPaymentTool,
  createIncomeTool,
  createTransferTool,
  CreatePaymentInputSchema,
  CreateIncomeInputSchema,
  CreateTransferInputSchema,
  type CreatePaymentInput,
  type CreateIncomeInput,
  type CreateTransferInput
} from '../tools/money/money-write-tools.js';

// 家計簿データ更新ツール
import {
  updateMoneyRecordTool,
  UpdateMoneyRecordInputSchema,
  type UpdateMoneyRecordInput
} from '../tools/money/money-update-tools.js';

// 家計簿データ削除ツール
import {
  deleteMoneyRecordTool,
  DeleteMoneyRecordInputSchema,
  type DeleteMoneyRecordInput
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
  GetCurrenciesInputSchema,
  type GetUserCategoriesInput,
  type GetUserGenresInput,
  type GetUserAccountsInput,
  type GetDefaultCategoriesByModeInput,
  type GetDefaultGenresByModeInput,
  type GetCurrenciesInput
} from '../tools/master/master-data-tools.js';

export class ToolHandler {
  private validateAndParseInput<T>(
    args: unknown,
    schema: z.ZodType<T>,
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

  private formatResponse(result: unknown) {
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
        const input = this.validateAndParseInput<CheckAuthStatusInput>(args, CheckAuthStatusInputSchema, name);
        const result = await checkAuthStatusTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_user_info': {
        const input = this.validateAndParseInput<GetUserInfoInput>(args, GetUserInfoInputSchema, name);
        const result = await getUserInfoTool(input);
        return this.formatResponse(result);
      }

      // 家計簿データ取得ツール
      case 'zaim_get_money_records': {
        const input = GetMoneyRecordsInputSchema.parse(args || {});
        const result = await getMoneyRecordsTool(input);
        return this.formatResponse(result);
      }

      // 家計簿データ作成ツール
      case 'zaim_create_payment': {
        const input = this.validateAndParseInput<CreatePaymentInput>(args, CreatePaymentInputSchema, name);
        const result = await createPaymentTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_create_income': {
        const input = this.validateAndParseInput<CreateIncomeInput>(args, CreateIncomeInputSchema, name);
        const result = await createIncomeTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_create_transfer': {
        const input = this.validateAndParseInput<CreateTransferInput>(args, CreateTransferInputSchema, name);
        const result = await createTransferTool(input);
        return this.formatResponse(result);
      }

      // 家計簿データ更新ツール
      case 'zaim_update_money_record': {
        const input = this.validateAndParseInput<UpdateMoneyRecordInput>(args, UpdateMoneyRecordInputSchema, name);
        const result = await updateMoneyRecordTool(input);
        return this.formatResponse(result);
      }

      // 家計簿データ削除ツール
      case 'zaim_delete_money_record': {
        const input = this.validateAndParseInput<DeleteMoneyRecordInput>(args, DeleteMoneyRecordInputSchema, name);
        const result = await deleteMoneyRecordTool(input);
        return this.formatResponse(result);
      }

      // マスターデータ取得ツール
      case 'zaim_get_user_categories': {
        const input = this.validateAndParseInput<GetUserCategoriesInput>(args, GetUserCategoriesInputSchema, name);
        const result = await getUserCategoriesTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_user_genres': {
        const input = this.validateAndParseInput<GetUserGenresInput>(args, GetUserGenresInputSchema, name);
        const result = await getUserGenresTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_user_accounts': {
        const input = this.validateAndParseInput<GetUserAccountsInput>(args, GetUserAccountsInputSchema, name);
        const result = await getUserAccountsTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_default_categories': {
        const input = this.validateAndParseInput<GetDefaultCategoriesByModeInput>(args, GetDefaultCategoriesByModeInputSchema, name);
        const result = await getDefaultCategoriesByModeTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_default_genres': {
        const input = this.validateAndParseInput<GetDefaultGenresByModeInput>(args, GetDefaultGenresByModeInputSchema, name);
        const result = await getDefaultGenresByModeTool(input);
        return this.formatResponse(result);
      }
      
      case 'zaim_get_currencies': {
        const input = this.validateAndParseInput<GetCurrenciesInput>(args, GetCurrenciesInputSchema, name);
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