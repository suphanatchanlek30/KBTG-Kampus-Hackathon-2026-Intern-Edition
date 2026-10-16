// Package config อ่านค่าจาก environment (ดู .env.example และ docs/03-architecture.md §3.6)
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	DatabaseURL string
	Port        int
	JWTSecret   string
	// เวลาที่แสดงผล/คำนวณวันที่ (ref no, วันหมดอายุ) — DB เก็บเป็น timestamptz เสมอ
	Location         *time.Location
	InviteTTL        time.Duration
	ExpiryTick       time.Duration
	DemoToolsEnabled bool
	// รัน goose up ตอน start (docker compose up แล้วได้ตารางพร้อม seed ทันที)
	MigrateOnStart bool
	LogLevel       string
	// อายุ cookie ks_session (JWT)
	SessionTTL time.Duration
	// ส่ง cookie เฉพาะ HTTPS — เปิดเมื่อเดโมผ่าน https (tunnel / --experimental-https)
	CookieSecure bool
	// DEMO_FROZEN_NOW: ให้นาฬิกาของระบบเริ่มที่เวลานี้แล้วเดินต่อ (nil = เวลาจริง)
	DemoFrozenNow *time.Time
	// URL ของหน้าเว็บ (frontend) — ใช้สร้างลิงก์ใน QR: <APP_BASE_URL>/invites/<token>
	AppBaseURL string
}

const minJWTSecretLen = 32

// Load อ่าน env ทั้งหมด ค่าที่ไม่ได้ตั้งใช้ค่าเริ่มต้น · DATABASE_URL และ JWT_SECRET ต้องมี
func Load() (Config, error) {
	var errs []error
	cfg := Config{
		DatabaseURL:      os.Getenv("DATABASE_URL"),
		JWTSecret:        os.Getenv("JWT_SECRET"),
		Port:             intEnv("PORT", 8080, &errs),
		InviteTTL:        durationEnv("INVITE_TTL", 24*time.Hour, &errs),
		ExpiryTick:       durationEnv("EXPIRY_TICK", 30*time.Second, &errs),
		DemoToolsEnabled: boolEnv("DEMO_TOOLS_ENABLED", false, &errs),
		MigrateOnStart:   boolEnv("MIGRATE_ON_START", true, &errs),
		LogLevel:         stringEnv("LOG_LEVEL", "info"),
		SessionTTL:       durationEnv("SESSION_TTL", 12*time.Hour, &errs),
		CookieSecure:     boolEnv("COOKIE_SECURE", false, &errs),
		AppBaseURL:       strings.TrimRight(stringEnv("APP_BASE_URL", "http://localhost:3000"), "/"),
	}

	if v := os.Getenv("DEMO_FROZEN_NOW"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			errs = append(errs, fmt.Errorf("DEMO_FROZEN_NOW %q: not RFC 3339 (e.g. 2026-10-14T10:31:00+07:00)", v))
		} else {
			cfg.DemoFrozenNow = &t
		}
	}

	tz := stringEnv("APP_TZ", "Asia/Bangkok")
	loc, err := time.LoadLocation(tz)
	if err != nil {
		errs = append(errs, fmt.Errorf("APP_TZ %q: %w", tz, err))
	}
	cfg.Location = loc

	if cfg.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL is required"))
	}
	if len(cfg.JWTSecret) < minJWTSecretLen {
		errs = append(errs, fmt.Errorf("JWT_SECRET must be at least %d characters", minJWTSecretLen))
	}
	return cfg, errors.Join(errs...)
}

func stringEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func intEnv(key string, def int, errs *[]error) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		*errs = append(*errs, fmt.Errorf("%s %q: not an integer", key, v))
		return def
	}
	return n
}

func durationEnv(key string, def time.Duration, errs *[]error) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		*errs = append(*errs, fmt.Errorf("%s %q: not a duration (e.g. 30s, 24h)", key, v))
		return def
	}
	return d
}

func boolEnv(key string, def bool, errs *[]error) bool {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		*errs = append(*errs, fmt.Errorf("%s %q: not a boolean", key, v))
		return def
	}
	return b
}
