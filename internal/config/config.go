package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/yone-k/zaim-cli/pkg/zaim"
)

var environmentNames = []string{"ZAIM_CONSUMER_KEY", "ZAIM_CONSUMER_SECRET", "ZAIM_ACCESS_TOKEN", "ZAIM_ACCESS_TOKEN_SECRET"}

type credentialsFile struct {
	ConsumerKey       string `json:"consumer_key"`
	ConsumerSecret    string `json:"consumer_secret"`
	AccessToken       string `json:"access_token"`
	AccessTokenSecret string `json:"access_token_secret"`
}

var (
	fileSecretsMu sync.Mutex
	fileSecrets   []string
)

// Load returns the four environment credentials, or the saved credentials file when none of them is set.
func Load() (zaim.OAuthConfig, error) {
	values := make([]string, len(environmentNames))
	missing := ""
	for i, name := range environmentNames {
		values[i] = os.Getenv(name)
		if strings.TrimSpace(values[i]) == "" && missing == "" {
			missing = name
		}
	}
	if missing == "" {
		return zaim.OAuthConfig{ConsumerKey: values[0], ConsumerSecret: values[1], AccessToken: values[2], AccessTokenSecret: values[3]}, nil
	}
	if strings.TrimSpace(strings.Join(values, "")) != "" {
		// Mixing sources would make a stale file silently override part of an explicit setup.
		return zaim.OAuthConfig{}, fmt.Errorf("Missing required environment variable: %s", missing)
	}
	return loadFile()
}

func loadFile() (zaim.OAuthConfig, error) {
	path, err := CredentialsPath()
	if err != nil {
		return zaim.OAuthConfig{}, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return zaim.OAuthConfig{}, fmt.Errorf("Missing required environment variable: %s (or run \"zaim-api-mcp auth login\" to save credentials)", environmentNames[0])
	}
	if err != nil {
		return zaim.OAuthConfig{}, fmt.Errorf("cannot read credentials file %s: %w", path, err)
	}
	var saved credentialsFile
	if err := json.Unmarshal(data, &saved); err != nil {
		return zaim.OAuthConfig{}, fmt.Errorf("invalid credentials file %s: %w", path, err)
	}
	for _, field := range []struct{ name, value string }{
		{"consumer_key", saved.ConsumerKey},
		{"consumer_secret", saved.ConsumerSecret},
		{"access_token", saved.AccessToken},
		{"access_token_secret", saved.AccessTokenSecret},
	} {
		if strings.TrimSpace(field.value) == "" {
			return zaim.OAuthConfig{}, fmt.Errorf("credentials file %s is missing %s", path, field.name)
		}
	}
	fileSecretsMu.Lock()
	fileSecrets = []string{saved.ConsumerKey, saved.ConsumerSecret, saved.AccessToken, saved.AccessTokenSecret}
	fileSecretsMu.Unlock()
	return zaim.OAuthConfig{ConsumerKey: saved.ConsumerKey, ConsumerSecret: saved.ConsumerSecret, AccessToken: saved.AccessToken, AccessTokenSecret: saved.AccessTokenSecret}, nil
}

// CredentialsPath locates the file written by "zaim-api-mcp auth login".
func CredentialsPath() (string, error) {
	base := os.Getenv("XDG_CONFIG_HOME")
	if !filepath.IsAbs(base) {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("cannot locate credentials file: %w", err)
		}
		base = filepath.Join(home, ".config")
	}
	return filepath.Join(base, "zaim-api-mcp", "credentials.json"), nil
}

// Save writes the credentials readable only by the current user and returns the file path.
func Save(credentials zaim.OAuthConfig) (string, error) {
	path, err := CredentialsPath()
	if err != nil {
		return "", err
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	data, err := json.MarshalIndent(credentialsFile{credentials.ConsumerKey, credentials.ConsumerSecret, credentials.AccessToken, credentials.AccessTokenSecret}, "", "  ")
	if err != nil {
		return "", err
	}
	// Writing the target directly could leave a truncated file when interrupted.
	temp, err := os.CreateTemp(dir, ".credentials-*.json")
	if err != nil {
		return "", err
	}
	defer os.Remove(temp.Name())
	if _, err := temp.Write(append(data, '\n')); err != nil {
		_ = temp.Close()
		return "", err
	}
	if err := temp.Close(); err != nil {
		return "", err
	}
	if err := os.Rename(temp.Name(), path); err != nil {
		return "", err
	}
	return path, nil
}

// Redact removes credentials from error messages.
func Redact(message string) string {
	values := make([]string, 0, 8)
	for _, name := range environmentNames {
		values = append(values, os.Getenv(name))
	}
	fileSecretsMu.Lock()
	values = append(values, fileSecrets...)
	fileSecretsMu.Unlock()
	sort.Slice(values, func(i, j int) bool { return len(values[i]) > len(values[j]) })
	var pairs []string
	for _, value := range values {
		if value != "" {
			pairs = append(pairs, value, "[REDACTED]")
		}
	}
	return strings.NewReplacer(pairs...).Replace(message)
}
