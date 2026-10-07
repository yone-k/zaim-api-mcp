package config

import (
	"strings"
	"testing"
)

var credentialNames = []string{"ZAIM_CONSUMER_KEY", "ZAIM_CONSUMER_SECRET", "ZAIM_ACCESS_TOKEN", "ZAIM_ACCESS_TOKEN_SECRET"}

func TestLoadRequiresEachCredentialAndPreservesValues(t *testing.T) {
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
	// Credentials are deliberately empty even if the user's CLI is logged in.
	for _, name := range credentialNames {
		t.Setenv(name, "")
	}
	if _, err := Load(); err == nil {
		t.Fatal("missing credentials must fail")
	}
}

func TestRedactRemovesCredentialsAndHandlesOverlappingValues(t *testing.T) {
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
