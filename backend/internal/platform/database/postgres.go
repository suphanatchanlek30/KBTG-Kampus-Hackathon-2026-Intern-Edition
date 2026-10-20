package database

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

// PoolSize sets the connection pool bounds. pgxpool defaults to max(4, NumCPU)
// connections, which queues requests on small instances. Pool settings in the
// DATABASE_URL (pool_max_conns, pool_min_conns) take precedence.
type PoolSize struct {
	MaxConns int32
	MinConns int32
}

func Connect(ctx context.Context, url string, size PoolSize) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	if size.MaxConns > 0 && !strings.Contains(url, "pool_max_conns") {
		cfg.MaxConns = size.MaxConns
	}
	if size.MinConns > 0 && !strings.Contains(url, "pool_min_conns") {
		cfg.MinConns = min(size.MinConns, cfg.MaxConns)
	}
	cfg.MaxConnIdleTime = 5 * time.Minute
	cfg.HealthCheckPeriod = 30 * time.Second
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

func Migrate(ctx context.Context, pool *pgxpool.Pool, migrations fs.FS, log *slog.Logger) error {
	db := stdlib.OpenDBFromPool(pool)
	defer func() { _ = db.Close() }()
	provider, err := goose.NewProvider(goose.DialectPostgres, db, migrations)
	if err != nil {
		return fmt.Errorf("goose provider: %w", err)
	}
	results, err := provider.Up(ctx)
	if err != nil {
		return fmt.Errorf("goose up: %w", err)
	}
	for _, r := range results {
		log.Info("migration applied", "version", r.Source.Version, "file", r.Source.Path, "duration", r.Duration.String())
	}
	return nil
}
