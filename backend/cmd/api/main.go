// Command api คือ K Sure API: อ่าน config → ต่อ DB → migrate → เปิด HTTP → ปิดอย่างสุภาพเมื่อได้ SIGINT/SIGTERM
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"
	_ "time/tzdata" // APP_TZ ใช้ได้แม้ image ไม่มีฐานข้อมูล timezone

	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/config"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/database"
	"github.com/suphanatchanlek30/ksure/backend/internal/server"
	"github.com/suphanatchanlek30/ksure/backend/migrations"
)

const shutdownTimeout = 10 * time.Second

func main() {
	if err := run(); err != nil {
		slog.Error("api stopped", "error", err.Error())
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("config: %w", err)
	}
	log := newLogger(cfg.LogLevel)
	slog.SetDefault(log)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if cfg.MigrateOnStart {
		if err := database.Migrate(ctx, pool, migrations.FS, log); err != nil {
			return err
		}
	}

	app := server.New(server.Deps{Log: log, DB: pool})

	errCh := make(chan error, 1)
	go func() {
		addr := fmt.Sprintf(":%d", cfg.Port)
		log.Info("api listening", "addr", addr)
		errCh <- app.Listen(addr, fiber.ListenConfig{DisableStartupMessage: true})
	}()

	select {
	case err := <-errCh:
		return fmt.Errorf("listen: %w", err)
	case <-ctx.Done():
	}

	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := app.ShutdownWithContext(shutdownCtx); err != nil && !errors.Is(err, context.DeadlineExceeded) {
		return fmt.Errorf("shutdown: %w", err)
	}
	return nil
}

func newLogger(level string) *slog.Logger {
	var lvl slog.Level
	if err := lvl.UnmarshalText([]byte(level)); err != nil {
		lvl = slog.LevelInfo
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl}))
}
