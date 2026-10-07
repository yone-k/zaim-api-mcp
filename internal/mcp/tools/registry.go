package tools

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"sort"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/yone-k/zaim-api-mcp/internal/config"
	"github.com/yone-k/zaim-cli/pkg/zaim"
)

// ClientProvider supplies the credential-validated API client for a tool call.
type ClientProvider func() (*zaim.Client, error)

// Arguments distinguishes omitted fields from explicit zero and empty values.
type Arguments map[string]json.RawMessage

//go:embed definitions.json
var definitionsJSON []byte

type definition struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	InputSchema map[string]any `json:"inputSchema"`
}

// Register adds the Zaim tools to the server.
func Register(server *mcp.Server, provider ClientProvider) {
	var definitions []definition
	if err := json.Unmarshal(definitionsJSON, &definitions); err != nil {
		panic(err)
	}
	for _, def := range definitions {
		properties := def.InputSchema["properties"].(map[string]any)
		if amount, ok := properties["amount"].(map[string]any); ok {
			amount["exclusiveMinimum"] = 0
		}
		output := outputSchema(def.Name)
		schemaBytes, err := json.Marshal(output)
		if err != nil {
			panic(err)
		}
		var schema jsonschema.Schema
		if err := json.Unmarshal(schemaBytes, &schema); err != nil {
			panic(err)
		}
		resolved, err := schema.Resolve(nil)
		if err != nil {
			panic(err)
		}
		readOnly := def.Name != "zaim_update_money_record" && def.Name != "zaim_delete_money_record" && def.Name != "zaim_create_payment" && def.Name != "zaim_create_income" && def.Name != "zaim_create_transfer"
		destructive := def.Name == "zaim_update_money_record" || def.Name == "zaim_delete_money_record"
		openWorld := true
		mcp.AddTool(server, &mcp.Tool{Name: def.Name, Description: def.Description, InputSchema: def.InputSchema, OutputSchema: output,
			Annotations: &mcp.ToolAnnotations{ReadOnlyHint: readOnly, DestructiveHint: &destructive, OpenWorldHint: &openWorld}},
			func(ctx context.Context, _ *mcp.CallToolRequest, args Arguments) (*mcp.CallToolResult, any, error) {
				if def.Name == "zaim_update_money_record" && argumentString(args["mode"]) == "payment" && args["genre_id"] == nil {
					return nil, nil, errors.New("genre_id is required when mode is payment")
				}
				payload, failed := execute(ctx, provider, def.Name, args)
				data, err := json.Marshal(payload)
				if err != nil {
					return nil, nil, err
				}
				// Validate without reserializing: SDK output default application would
				// convert raw API numbers through float64 and could lose precision.
				var value any
				if err := json.Unmarshal(data, &value); err != nil {
					return nil, nil, err
				}
				if err := resolved.Validate(&value); err != nil {
					return nil, nil, fmt.Errorf("invalid tool output: %w", err)
				}
				return &mcp.CallToolResult{IsError: failed, StructuredContent: json.RawMessage(data), Content: []mcp.Content{&mcp.TextContent{Text: string(data)}}}, nil, nil
			})
	}
}

func outputSchema(name string) map[string]any {
	properties := map[string]any{"success": map[string]any{"type": "boolean"}, "message": map[string]any{"type": "string"}}
	switch name {
	case "zaim_check_auth_status":
		delete(properties, "success")
		properties["isAuthenticated"] = map[string]any{"type": "boolean"}
		properties["user"] = userSchema(true)
	case "zaim_get_user_info":
		properties["user"] = userSchema(false)
	case "zaim_create_payment", "zaim_create_income", "zaim_create_transfer", "zaim_update_money_record":
		properties["record"] = map[string]any{"type": []string{"object", "null"}}
	case "zaim_delete_money_record":
		properties["deleted_record"] = map[string]any{"type": []string{"object", "null"}}
	default:
		properties[listOperation(name).key] = map[string]any{"type": "array", "items": map[string]any{}}
		properties["count"] = map[string]any{"type": "integer"}
	}
	required := make([]string, 0, len(properties))
	for key := range properties {
		required = append(required, key)
	}
	sort.Strings(required)
	return map[string]any{"type": "object", "properties": properties, "required": required, "additionalProperties": false}
}

func userSchema(auth bool) map[string]any {
	properties := map[string]any{"id": map[string]any{"type": "number"}, "name": map[string]any{"type": "string"}, "login": map[string]any{"type": "string"}}
	required := []string{"id", "name"}
	if auth {
		required = append(required, "login")
	} else {
		properties["login"] = map[string]any{"type": []string{"string", "null"}}
		properties["profile_image_url"] = map[string]any{"type": []string{"string", "null"}}
		properties["input_count"] = map[string]any{"type": []string{"number", "null"}}
		properties["repeat_count"] = map[string]any{"type": []string{"number", "null"}}
		properties["day"] = map[string]any{"type": []string{"number", "string", "null"}}
	}
	return map[string]any{"type": []string{"object", "null"}, "properties": properties, "required": required, "additionalProperties": false}
}

func apiRequest(ctx context.Context, provider ClientProvider, method, path string, params map[string]string) (map[string]json.RawMessage, error) {
	client, err := provider()
	if err != nil {
		return nil, err
	}
	data, err := client.Request(ctx, method, path, params)
	if err != nil {
		var syntax *json.SyntaxError
		if errors.As(err, &syntax) {
			return nil, nil
		}
		var httpErr *zaim.HTTPError
		if errors.As(err, &httpErr) {
			var body map[string]json.RawMessage
			_ = json.Unmarshal([]byte(httpErr.Body), &body)
			message := "Unknown error"
			for _, key := range []string{"message", "error"} {
				if truthy(body[key]) {
					message = argumentString(body[key])
					break
				}
			}
			return nil, fmt.Errorf("Zaim API Error: %d - %s", httpErr.StatusCode, config.Redact(message))
		}
		return nil, errors.New(config.Redact(err.Error()))
	}
	var response map[string]json.RawMessage
	// Valid JSON with an incompatible root is a business response failure.
	_ = json.Unmarshal(data, &response)
	return response, nil
}
