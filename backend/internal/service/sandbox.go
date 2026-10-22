package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/suphanatchanlek30/psure/backend/internal/domain"
	"github.com/suphanatchanlek30/psure/backend/internal/dto"
	"github.com/suphanatchanlek30/psure/backend/internal/platform/token"
	"github.com/suphanatchanlek30/psure/backend/internal/repository/db"
)

const (
	// MaxSandboxes caps live sandboxes so a public demo URL cannot fill the database.
	MaxSandboxes = 2000
	// SandboxIdleTTL is how long an unused sandbox lives before the janitor removes it.
	SandboxIdleTTL = 24 * time.Hour
	// Last-seen writes are skipped when the previous one is newer than this.
	sandboxTouchEvery = 5 * time.Minute
	janitorBatch      = 50
)

// CreateSandbox gives a visitor their own copy of the demo personas, accounts and property,
// seeded with the scenario. It returns the sandbox tenant to sign in as.
func (s *DemoService) CreateSandbox(ctx context.Context, sc Scenario) (domain.Actor, dto.SandboxDTO, error) {
	stage, err := scenarioStageOf(sc)
	if err != nil {
		return domain.Actor{}, dto.SandboxDTO{}, err
	}
	now := s.clock.Now()
	var cast demoCast
	out := dto.SandboxDTO{Scenario: string(sc)}
	err = s.repo.WithTx(ctx, func(q *db.Queries) error {
		n, err := q.CountSandboxes(ctx)
		if err != nil {
			return fmt.Errorf("count sandboxes: %w", err)
		}
		if n >= MaxSandboxes {
			return domain.NewError(domain.CodeRateLimited, "ห้องเล่นเต็มแล้ว กรุณาลองใหม่ภายหลัง")
		}
		id, err := q.InsertSandbox(ctx, now)
		if err != nil {
			return fmt.Errorf("insert sandbox: %w", err)
		}
		cast.sandbox = uuid.NullUUID{UUID: id, Valid: true}
		if cast.landlordID, cast.landlordAccountID, err = clonePersona(ctx, q, cast.sandbox, demoLandlordID, demoLandlordBalance); err != nil {
			return err
		}
		if cast.tenantID, cast.tenantAccountID, err = clonePersona(ctx, q, cast.sandbox, demoTenantID, demoTenantBalance); err != nil {
			return err
		}
		props, err := q.ListPropertiesByLandlord(ctx, demoLandlordID)
		if err != nil {
			return fmt.Errorf("list demo properties: %w", err)
		}
		for _, p := range props {
			if err := q.InsertProperty(ctx, db.InsertPropertyParams{
				LandlordID: cast.landlordID, PropertyType: p.PropertyType, ProjectName: p.ProjectName,
				UnitNo: p.UnitNo, DetailLabel: p.DetailLabel, NearbyLabel: p.NearbyLabel,
			}); err != nil {
				return fmt.Errorf("insert property: %w", err)
			}
		}
		if out.DealID, err = s.seedScenario(ctx, q, cast, stage); err != nil {
			return err
		}
		if out.DealID != nil {
			d, err := q.GetDeal(ctx, uuid.MustParse(*out.DealID))
			if err != nil {
				return fmt.Errorf("get seeded deal: %w", err)
			}
			out.ShareCode = &d.ShareCode
		}
		return nil
	})
	if err != nil {
		return domain.Actor{}, dto.SandboxDTO{}, err
	}
	out.SandboxID = cast.sandbox.UUID.String()
	return domain.Actor{UserID: cast.tenantID, Role: domain.RoleTenant, SandboxID: cast.sandbox}, out, nil
}

// clonePersona copies a shared demo user and their primary account into a sandbox.
func clonePersona(ctx context.Context, q *db.Queries, sandbox uuid.NullUUID, seedUser uuid.UUID, balance int64) (uuid.UUID, uuid.UUID, error) {
	u, err := q.GetUserByID(ctx, seedUser)
	if err != nil {
		return uuid.Nil, uuid.Nil, fmt.Errorf("get demo user: %w", err)
	}
	acc, err := q.GetPrimaryAccount(ctx, seedUser)
	if err != nil {
		return uuid.Nil, uuid.Nil, fmt.Errorf("get demo account: %w", err)
	}
	userID, err := q.InsertUser(ctx, db.InsertUserParams{
		Username: u.Username, Role: u.Role, DisplayName: u.DisplayName, ShortName: u.ShortName,
		Phone: u.Phone, SandboxID: sandbox,
	})
	if err != nil {
		return uuid.Nil, uuid.Nil, fmt.Errorf("insert sandbox user: %w", err)
	}
	accID, err := q.InsertAccount(ctx, db.InsertAccountParams{
		UserID: userID, BankName: acc.BankName, AccountType: acc.AccountType,
		AccountNoMasked: acc.AccountNoMasked, BalanceSatang: balance,
	})
	if err != nil {
		return uuid.Nil, uuid.Nil, fmt.Errorf("insert sandbox account: %w", err)
	}
	return userID, accID, nil
}

// newSandboxCodes returns a fresh reference number and share code for a sandbox deal.
func (s *DemoService) newSandboxCodes(ctx context.Context, q *db.Queries) (string, string, error) {
	local := s.clock.Now().In(s.loc)
	seq, err := q.NextRefSeq(ctx, pgtype.Date{Time: time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, time.UTC), Valid: true})
	if err != nil {
		return "", "", fmt.Errorf("next ref seq: %w", err)
	}
	for range shareCodeAttempts {
		code := token.NewShareCode()
		if code == demoShareCode {
			continue // Reserved for the shared demo deal.
		}
		taken, err := q.ShareCodeExists(ctx, code)
		if err != nil {
			return "", "", fmt.Errorf("check share code: %w", err)
		}
		if !taken {
			return token.FormatRefNo(local, seq), code, nil
		}
	}
	return "", "", errors.New("could not find a free share code")
}

// TouchSandbox records that a sandbox is in use, at most once per few minutes.
func (s *UserService) touchSandbox(ctx context.Context, actor domain.Actor) error {
	if !actor.SandboxID.Valid {
		return nil
	}
	now := s.clock.Now()
	return s.repo.TouchSandbox(ctx, db.TouchSandboxParams{ID: actor.SandboxID.UUID, Now: now, StaleBefore: now.Add(-sandboxTouchEvery)})
}

// RunJanitor removes sandboxes that have been idle for longer than idle.
func (s *DemoService) RunJanitor(ctx context.Context, every, idle time.Duration, log *slog.Logger) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if n, err := s.CleanupSandboxes(ctx, idle); err != nil {
				log.Error("sandbox janitor", "error", err.Error(), "removed", n)
			} else if n > 0 {
				log.Info("sandbox janitor", "removed", n)
			}
		}
	}
}

// CleanupSandboxes deletes up to one batch of idle sandboxes, each in its own transaction,
// so one failure does not block the rest.
func (s *DemoService) CleanupSandboxes(ctx context.Context, idle time.Duration) (int, error) {
	ids, err := s.repo.ListStaleSandboxes(ctx, db.ListStaleSandboxesParams{Before: s.clock.Now().Add(-idle), RowLimit: janitorBatch})
	if err != nil {
		return 0, fmt.Errorf("list stale sandboxes: %w", err)
	}
	removed := 0
	var errs []error
	for _, id := range ids {
		if err := s.deleteSandbox(ctx, id); err != nil {
			errs = append(errs, fmt.Errorf("sandbox %s: %w", id, err))
			continue
		}
		removed++
	}
	return removed, errors.Join(errs...)
}

func (s *DemoService) deleteSandbox(ctx context.Context, id uuid.UUID) error {
	sb := uuid.NullUUID{UUID: id, Valid: true}
	return s.repo.WithTx(ctx, func(q *db.Queries) error {
		if err := purgeScope(ctx, q, sb); err != nil {
			return err
		}
		if err := q.DeleteSandboxProperties(ctx, sb); err != nil {
			return fmt.Errorf("delete properties: %w", err)
		}
		if err := q.DeleteSandboxAccounts(ctx, sb); err != nil {
			return fmt.Errorf("delete accounts: %w", err)
		}
		if err := q.DeleteSandboxUsers(ctx, sb); err != nil {
			return fmt.Errorf("delete users: %w", err)
		}
		if err := q.DeleteSandbox(ctx, id); err != nil {
			return fmt.Errorf("delete sandbox: %w", err)
		}
		return nil
	})
}
