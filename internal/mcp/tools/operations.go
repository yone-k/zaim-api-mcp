package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/yone-k/zaim-api-mcp/internal/config"
)

type authResult struct {
	Authenticated bool                       `json:"isAuthenticated"`
	User          map[string]json.RawMessage `json:"user"`
	Message       string                     `json:"message"`
}

type userResult struct {
	User    map[string]json.RawMessage `json:"user"`
	Success bool                       `json:"success"`
	Message string                     `json:"message"`
}

type recordResult struct {
	Record  json.RawMessage `json:"record"`
	Success bool            `json:"success"`
	Message string          `json:"message"`
}

type deleteResult struct {
	Record  json.RawMessage `json:"deleted_record"`
	Success bool            `json:"success"`
	Message string          `json:"message"`
}

type bulkItemResult struct {
	Index   int             `json:"index"`
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Record  json.RawMessage `json:"record"`
}

type bulkResult struct {
	Success   bool             `json:"success"`
	Message   string           `json:"message"`
	DryRun    bool             `json:"dry_run"`
	Total     int              `json:"total"`
	Succeeded int              `json:"succeeded"`
	Failed    int              `json:"failed"`
	Results   []bulkItemResult `json:"results"`
}

var bulkSingleTools = map[string]string{
	"zaim_bulk_create_payments":      "zaim_create_payment",
	"zaim_bulk_create_incomes":       "zaim_create_income",
	"zaim_bulk_create_transfers":     "zaim_create_transfer",
	"zaim_bulk_update_money_records": "zaim_update_money_record",
}

type operation struct{ path, key, label string }

func listOperation(name string) operation {
	switch name {
	case "zaim_get_money_records":
		return operation{"/v2/home/money", "records", "記録"}
	case "zaim_get_user_categories":
		return operation{"/v2/home/category", "categories", "カテゴリ"}
	case "zaim_get_user_genres":
		return operation{"/v2/home/genre", "genres", "ジャンル"}
	case "zaim_get_user_accounts":
		return operation{"/v2/home/account", "accounts", "口座"}
	case "zaim_get_default_categories":
		return operation{"/v2/category", "categories", "デフォルトカテゴリ"}
	case "zaim_get_default_genres":
		return operation{"/v2/genre", "genres", "デフォルトジャンル"}
	case "zaim_get_currencies":
		return operation{"/v2/currency", "currencies", "通貨"}
	default:
		panic("unknown list tool: " + name)
	}
}

func execute(ctx context.Context, provider ClientProvider, name string, args Arguments) (any, bool) {
	switch name {
	case "zaim_check_auth_status", "zaim_get_user_info":
		return executeUser(ctx, provider, name)
	case "zaim_create_payment", "zaim_create_income", "zaim_create_transfer", "zaim_update_money_record", "zaim_delete_money_record":
		return executeRecord(ctx, provider, name, args)
	case "zaim_bulk_create_payments", "zaim_bulk_create_incomes", "zaim_bulk_create_transfers", "zaim_bulk_update_money_records":
		return executeBulk(ctx, provider, name, args)
	default:
		return executeList(ctx, provider, name, args)
	}
}

func executeUser(ctx context.Context, provider ClientProvider, name string) (any, bool) {
	response, err := apiRequest(ctx, provider, http.MethodGet, "/v2/home/user/verify", nil)
	var user map[string]json.RawMessage
	_ = json.Unmarshal(response["me"], &user)
	if name == "zaim_check_auth_status" {
		result := authResult{Message: "認証に失敗しました: "}
		if err != nil {
			result.Message += config.Redact(err.Error())
		} else if !truthy(response["me"]) {
			result.Message += "無効なレスポンス形式"
		} else if !truthy(user["id"]) || !truthy(user["name"]) {
			result.Message += "無効なユーザーデータ"
		} else {
			result.Authenticated = true
			result.User = map[string]json.RawMessage{"id": user["id"], "name": user["name"], "login": fallback(user["login"], `""`)}
			result.Message = "認証に成功しました"
		}
		return result, !result.Authenticated
	}
	result := userResult{Message: "ユーザー情報の取得に失敗しました: "}
	if err != nil {
		result.Message += config.Redact(err.Error())
	} else if !truthy(response["me"]) {
		result.Message += "ユーザーデータが見つかりません"
	} else {
		result.Success = true
		result.Message = "ユーザー情報を取得しました"
		result.User = map[string]json.RawMessage{"id": fallback(user["id"], "0"), "name": fallback(user["name"], `""`)}
		for _, key := range []string{"login", "profile_image_url", "input_count", "repeat_count", "day"} {
			if value, ok := user[key]; ok {
				result.User[key] = value
			}
		}
	}
	return result, !result.Success
}

func executeList(ctx context.Context, provider ClientProvider, name string, args Arguments) (any, bool) {
	op := listOperation(name)
	params := make(map[string]string)
	for key, value := range args {
		if truthy(value) {
			params[key] = argumentString(value)
		}
	}
	response, err := apiRequest(ctx, provider, http.MethodGet, op.path, params)
	apiKey := op.key
	if apiKey == "records" {
		apiKey = "money"
	}
	var values []json.RawMessage
	parseErr := json.Unmarshal(response[apiKey], &values)
	success := err == nil && parseErr == nil && values != nil
	message := fmt.Sprintf("%d件の%sを取得しました", len(values), op.label)
	if !success {
		values = []json.RawMessage{}
		message = op.label + "の取得に失敗しました: 無効なレスポンス形式"
		if err != nil {
			message = op.label + "の取得に失敗しました: " + config.Redact(err.Error())
		}
	}
	return map[string]any{op.key: values, "count": len(values), "success": success, "message": message}, !success
}

func executeRecord(ctx context.Context, provider ClientProvider, name string, args Arguments) (any, bool) {
	result := executeRecordResult(ctx, provider, name, args)
	if name == "zaim_delete_money_record" {
		return deleteResult(result), !result.Success
	}
	return result, !result.Success
}

func executeRecordResult(ctx context.Context, provider ClientProvider, name string, args Arguments) recordResult {
	method, path, successMessage, failureMessage := http.MethodPost, "", "", ""
	params := map[string]string{"mapping": "1"}
	for key, value := range args {
		if key != "id" && key != "mode" {
			params[key] = argumentString(value)
		}
	}
	switch name {
	case "zaim_create_payment":
		path, successMessage, failureMessage = "/v2/home/money/payment", "支出記録を作成しました", "支出記録の作成に失敗しました: "
	case "zaim_create_income":
		path, successMessage, failureMessage = "/v2/home/money/income", "収入記録を作成しました", "収入記録の作成に失敗しました: "
	case "zaim_create_transfer":
		path, successMessage, failureMessage = "/v2/home/money/transfer", "振替記録を作成しました", "振替記録の作成に失敗しました: "
	case "zaim_update_money_record":
		method, successMessage, failureMessage = http.MethodPut, "記録を更新しました", "記録の更新に失敗しました: "
		path = "/v2/home/money/" + argumentString(args["mode"]) + "/" + argumentString(args["id"])
	case "zaim_delete_money_record":
		method, successMessage, failureMessage, params = http.MethodDelete, "記録を削除しました", "記録の削除に失敗しました: ", nil
		path = "/v2/home/money/" + argumentString(args["mode"]) + "/" + argumentString(args["id"])
	}
	response, err := apiRequest(ctx, provider, method, path, params)
	record := response["money"]
	var records []json.RawMessage
	if json.Unmarshal(record, &records) == nil {
		record = nil
		if len(records) > 0 {
			record = records[0]
		}
	}
	var object map[string]json.RawMessage
	success := err == nil && json.Unmarshal(record, &object) == nil && object != nil
	message := successMessage
	if !success {
		record = nil
		message = failureMessage + "無効なレスポンス形式"
		if err != nil {
			message = failureMessage + config.Redact(err.Error())
		}
	}
	return recordResult{record, success, message}
}

func executeBulk(ctx context.Context, provider ClientProvider, name string, args Arguments) (any, bool) {
	single := bulkSingleTools[name]
	var items []Arguments
	_ = json.Unmarshal(args["items"], &items)
	var dryRun bool
	_ = json.Unmarshal(args["dry_run"], &dryRun)
	result := bulkResult{DryRun: dryRun, Total: len(items), Results: make([]bulkItemResult, 0, len(items))}
	for i, item := range items {
		entry := bulkItemResult{Index: i}
		invalid := validateRecordArguments(single, item)
		switch {
		case ctx.Err() != nil:
			entry.Message = "キャンセルされたため送信しませんでした"
		case invalid != nil:
			entry.Message = invalid.Error()
		case dryRun:
			entry.Success, entry.Message = true, "検証に成功しました"
		default:
			record := executeRecordResult(ctx, provider, single, item)
			entry.Success, entry.Message, entry.Record = record.Success, record.Message, record.Record
		}
		if entry.Success {
			result.Succeeded++
		} else {
			result.Failed++
		}
		result.Results = append(result.Results, entry)
	}
	result.Success = result.Failed == 0
	verb := "処理"
	if dryRun {
		verb = "検証"
	}
	result.Message = fmt.Sprintf("%d件中%d件の%sに成功し、%d件が失敗しました", result.Total, result.Succeeded, verb, result.Failed)
	return result, result.Succeeded == 0
}

// validateRecordArguments applies the checks that the input schema cannot express.
func validateRecordArguments(name string, args Arguments) error {
	if name == "zaim_update_money_record" && argumentString(args["mode"]) == "payment" && args["genre_id"] == nil {
		return errors.New("genre_id is required when mode is payment")
	}
	return nil
}

func argumentString(value json.RawMessage) string {
	var text string
	if json.Unmarshal(value, &text) == nil {
		return text
	}
	var number float64
	if json.Unmarshal(value, &number) == nil {
		return strconv.FormatFloat(number, 'f', -1, 64)
	}
	return string(value)
}

func truthy(value json.RawMessage) bool {
	var decoded any
	if json.Unmarshal(value, &decoded) != nil {
		return false
	}
	switch v := decoded.(type) {
	case nil:
		return false
	case bool:
		return v
	case string:
		return v != ""
	case float64:
		return v != 0
	default:
		return true
	}
}

func fallback(value json.RawMessage, alternative string) json.RawMessage {
	if truthy(value) {
		return value
	}
	return json.RawMessage(alternative)
}
