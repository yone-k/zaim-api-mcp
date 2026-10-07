package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/yone-k/zaim-cli/pkg/zaim"
)

var credentialNames = []string{"ZAIM_CONSUMER_KEY", "ZAIM_CONSUMER_SECRET", "ZAIM_ACCESS_TOKEN", "ZAIM_ACCESS_TOKEN_SECRET"}

// isolate keeps tests away from the developer's real credentials file.
func isolate(t *testing.T) string {
	t.Helper()
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("XDG_CONFIG_HOME", "")
	for _, name := range credentialNames {
		t.Setenv(name, "")
	}
	return home
}

func writeCredentials(t *testing.T, home, content string) string {
	t.Helper()
	path := filepath.Join(home, ".config", "zaim-api-mcp", "credentials.json")
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestLoadRequiresEachCredentialAndPreservesValues(t *testing.T) {
	isolate(t)
	values := []string{" consumer-key ", "consumer-secret", "access-token", "access-secret"}
	for i, name := range credentialNames {
		t.Setenv(name, values[i])
	}
	config, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if config.ConsumerKey != values[0] || config.ConsumerSecret != values[1] || config.AccessToken != values[2] || config.AccessTokenSecret != values[3] {
		t.Errorf("credentials changed")
	}
	for _, name := range credentialNames {
		t.Run(name, func(t *testing.T) {
			t.Setenv(name, " \t")
			if _, err := Load(); err == nil || err.Error() != "Missing required environment variable: "+name {
				t.Errorf("error = %v", err)
			}
		})
	}
}

func TestLoadDoesNotReadCLIConfigFile(t *testing.T) {
	home := isolate(t)
	cliConfig := filepath.Join(home, ".config", "zaim", "config.json")
	if err := os.MkdirAll(filepath.Dir(cliConfig), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(cliConfig, []byte(`{"consumer_key":"k","consumer_secret":"s","access_token":"t","access_token_secret":"ts"}`), 0o600); err != nil {
		t.Fatal(err)
	}
	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "Missing required environment variable: ZAIM_CONSUMER_KEY") || !strings.Contains(err.Error(), "zaim-api-mcp auth login") {
		t.Fatalf("error = %v", err)
	}
}

func TestLoadUsesSavedCredentialsOnlyWhenEveryVariableIsUnset(t *testing.T) {
	home := isolate(t)
	writeCredentials(t, home, `{"consumer_key":"file-key","consumer_secret":"file-secret","access_token":"file-token","access_token_secret":"file-token-secret"}`)
	config, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	want := zaim.OAuthConfig{ConsumerKey: "file-key", ConsumerSecret: "file-secret", AccessToken: "file-token", AccessTokenSecret: "file-token-secret"}
	if config != want {
		t.Errorf("config = %+v", config)
	}

	t.Run("environment wins", func(t *testing.T) {
		for _, name := range credentialNames {
			t.Setenv(name, "env-"+name)
		}
		config, err := Load()
		if err != nil || config.AccessToken != "env-ZAIM_ACCESS_TOKEN" {
			t.Errorf("config = %+v, err = %v", config, err)
		}
	})
	t.Run("partial environment is not mixed with the file", func(t *testing.T) {
		t.Setenv("ZAIM_ACCESS_TOKEN", "env-token")
		if _, err := Load(); err == nil || err.Error() != "Missing required environment variable: ZAIM_CONSUMER_KEY" {
			t.Errorf("error = %v", err)
		}
	})
}

func TestLoadReadsXDGConfigHome(t *testing.T) {
	isolate(t)
	xdg := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", xdg)
	path, err := CredentialsPath()
	if err != nil || path != filepath.Join(xdg, "zaim-api-mcp", "credentials.json") {
		t.Fatalf("path = %q, err = %v", path, err)
	}
}

func TestLoadRejectsIncompleteCredentialsFileWithoutLeakingValues(t *testing.T) {
	home := isolate(t)
	path := writeCredentials(t, home, `{"consumer_key":"leaky-key","consumer_secret":"leaky-secret","access_token":"leaky-token"}`)
	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), path) || !strings.Contains(err.Error(), "access_token_secret") {
		t.Fatalf("error = %v", err)
	}
	if strings.Contains(err.Error(), "leaky") {
		t.Errorf("credential leaked: %v", err)
	}
	writeCredentials(t, home, `{not json`)
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), path) {
		t.Errorf("error = %v", err)
	}
}

func TestSaveWritesPrivateFileThatLoadReads(t *testing.T) {
	home := isolate(t)
	want := zaim.OAuthConfig{ConsumerKey: "k", ConsumerSecret: "s", AccessToken: "t", AccessTokenSecret: "ts"}
	path, err := Save(want)
	if err != nil {
		t.Fatal(err)
	}
	if path != filepath.Join(home, ".config", "zaim-api-mcp", "credentials.json") {
		t.Errorf("path = %s", path)
	}
	file, err := os.Stat(path)
	if err != nil || file.Mode().Perm() != 0o600 {
		t.Fatalf("file mode = %v, err = %v", file, err)
	}
	dir, err := os.Stat(filepath.Dir(path))
	if err != nil || dir.Mode().Perm() != 0o700 {
		t.Fatalf("dir mode = %v, err = %v", dir, err)
	}
	if _, err := Save(zaim.OAuthConfig{ConsumerKey: "k2", ConsumerSecret: "s2", AccessToken: "t2", AccessTokenSecret: "ts2"}); err != nil {
		t.Fatal(err)
	}
	got, err := Load()
	if err != nil || got.AccessToken != "t2" {
		t.Errorf("config = %+v, err = %v", got, err)
	}
	entries, _ := os.ReadDir(filepath.Dir(path))
	if len(entries) != 1 {
		t.Errorf("leftover files: %v", entries)
	}
}

func TestRedactRemovesCredentialsAndHandlesOverlappingValues(t *testing.T) {
	isolate(t)
	values := []string{"shared-key", "shared-key-secret", "access-token", "access-secret"}
	for i, name := range credentialNames {
		t.Setenv(name, values[i])
	}
	got := Redact("failure: " + strings.Join(values, ", "))
	for _, value := range values {
		if strings.Contains(got, value) {
			t.Fatal("credential leaked")
		}
	}
	if strings.Contains(got, "-secret") || !strings.Contains(got, "failure:") {
		t.Errorf("redaction = %q", got)
	}
}

func TestRedactRemovesCredentialsLoadedFromFile(t *testing.T) {
	home := isolate(t)
	writeCredentials(t, home, `{"consumer_key":"file-key","consumer_secret":"file-secret","access_token":"file-token","access_token_secret":"file-token-secret"}`)
	if _, err := Load(); err != nil {
		t.Fatal(err)
	}
	got := Redact("denied file-token-secret file-secret")
	if strings.Contains(got, "file-") || strings.Count(got, "[REDACTED]") != 2 {
		t.Errorf("redaction = %q", got)
	}
}
