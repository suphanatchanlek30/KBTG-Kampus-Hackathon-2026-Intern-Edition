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
	_ "time/tzdata" // Keep timezone data available in minimal container images.

	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/psure/backend/internal/config"
	"github.com/suphanatchanlek30/psure/backend/internal/platform/clock"
	"github.com/suphanatchanlek30/psure/backend/internal/platform/database"
	"github.com/suphanatchanlek30/psure/backend/internal/platform/session"
	"github.com/suphanatchanlek30/psure/backend/internal/repository"
	"github.com/suphanatchanlek30/psure/backend/internal/server"
	"github.com/suphanatchanlek30/psure/backend/internal/service"
	"github.com/suphanatchanlek30/psure/backend/migrations"
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

	pool, err := database.Connect(ctx, cfg.DatabaseURL, database.PoolSize{MaxConns: int32(cfg.DBMaxConns), MinConns: int32(cfg.DBMinConns)})
	if err != nil {
		return err
	}
	defer pool.Close()

	if cfg.MigrateOnStart {
		if err := database.Migrate(ctx, pool, migrations.FS, log); err != nil {
			return err
		}
	}

	var clk clock.Clock = clock.System{}
	if cfg.DemoFrozenNow != nil {
		clk = clock.NewShifted(*cfg.DemoFrozenNow)
		log.Info("demo clock shifted", "start", cfg.DemoFrozenNow.Format(time.RFC3339))
	}

	repo := repository.New(pool)
	deps := server.Deps{
		Log:           log,
		DB:            pool,
		Sessions:      session.NewManager(cfg.JWTSecret, cfg.SessionTTL, clk),
		CookieSecure:  cfg.CookieSecure,
		Users:         service.NewUserService(repo, clk, cfg.Location),
		Notifications: service.NewNotificationService(repo, clk, cfg.Location),
		Deals:         service.NewDealService(repo, clk, cfg.Location, cfg.InviteTTL, cfg.AppBaseURL),
		Transfers:     service.NewTransferService(repo, clk),
	}
	if cfg.DemoToolsEnabled {
		deps.Demo = service.NewDemoService(repo, clk, cfg.Location, cfg.InviteTTL)
		deps.SandboxEnabled = cfg.SandboxEnabled
	}
	app := server.New(deps)

	go deps.Deals.RunExpiryWorker(ctx, cfg.ExpiryTick, log)
	if deps.Demo != nil {
		go deps.Demo.RunJanitor(ctx, 10*time.Minute, service.SandboxIdleTTL, log)
	}

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
