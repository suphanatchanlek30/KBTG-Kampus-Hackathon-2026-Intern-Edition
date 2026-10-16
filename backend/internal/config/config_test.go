package config

import (
	"strings"
	"testing"
	"time"
)

const validSecret = "0123456789abcdef0123456789abcdef"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://x")
	t.Setenv("JWT_SECRET", validSecret)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Port != 8080 || cfg.InviteTTL != 24*time.Hour || cfg.ExpiryTick != 30*time.Second {
		t.Errorf("unexpected defaults: %+v", cfg)
	}
	if cfg.Location.String() != "Asia/Bangkok" || !cfg.MigrateOnStart || cfg.DemoToolsEnabled {
		t.Errorf("unexpected defaults: %+v", cfg)
	}
}

func TestLoadOverrides(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://x")
	t.Setenv("JWT_SECRET", validSecret)
	t.Setenv("PORT", "9090")
	t.Setenv("EXPIRY_TICK", "5s")
	t.Setenv("DEMO_TOOLS_ENABLED", "true")
	t.Setenv("MIGRATE_ON_START", "false")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Port != 9090 || cfg.ExpiryTick != 5*time.Second || !cfg.DemoToolsEnabled || cfg.MigrateOnStart {
		t.Errorf("overrides not applied: %+v", cfg)
	}
}

func TestLoadReportsEveryProblem(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	t.Setenv("JWT_SECRET", "short")
	t.Setenv("PORT", "abc")
	t.Setenv("INVITE_TTL", "1 day")
	t.Setenv("APP_TZ", "Mars/Olympus")

	_, err := Load()
	if err == nil {
		t.Fatal("expected error")
	}
	for _, want := range []string{"DATABASE_URL", "JWT_SECRET", "PORT", "INVITE_TTL", "APP_TZ"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error should mention %s: %v", want, err)
		}
	}
}
