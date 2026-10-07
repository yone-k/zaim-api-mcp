package config

import (
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/yone-k/zaim-cli/pkg/zaim"
)

// Load validates the four environment credentials without reading config files.
func Load() (zaim.OAuthConfig, error) {
	var config zaim.OAuthConfig
	fields := []struct {
		name   string
		target *string
	}{
		{"ZAIM_CONSUMER_KEY", &config.ConsumerKey},
		{"ZAIM_CONSUMER_SECRET", &config.ConsumerSecret},
		{"ZAIM_ACCESS_TOKEN", &config.AccessToken},
		{"ZAIM_ACCESS_TOKEN_SECRET", &config.AccessTokenSecret},
	}
	for _, field := range fields {
		value := os.Getenv(field.name)
		if strings.TrimSpace(value) == "" {
			return zaim.OAuthConfig{}, fmt.Errorf("Missing required environment variable: %s", field.name)
		}
		*field.target = value
	}
	return config, nil
}

// Redact removes credentials from error messages.
func Redact(message string) string {
	values := []string{os.Getenv("ZAIM_CONSUMER_KEY"), os.Getenv("ZAIM_CONSUMER_SECRET"), os.Getenv("ZAIM_ACCESS_TOKEN"), os.Getenv("ZAIM_ACCESS_TOKEN_SECRET")}
	sort.Slice(values, func(i, j int) bool { return len(values[i]) > len(values[j]) })
	var pairs []string
	for _, value := range values {
		if value != "" {
			pairs = append(pairs, value, "[REDACTED]")
		}
	}
	return strings.NewReplacer(pairs...).Replace(message)
}
