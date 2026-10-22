package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/suphanatchanlek30/psure/backend/internal/domain"
	"github.com/suphanatchanlek30/psure/backend/internal/dto"
	"github.com/suphanatchanlek30/psure/backend/internal/platform/clock"
	"github.com/suphanatchanlek30/psure/backend/internal/repository"
	"github.com/suphanatchanlek30/psure/backend/internal/repository/db"
)

type UserService struct {
	repo  *repository.Repository
	clock clock.Clock
	loc   *time.Location
}

func NewUserService(repo *repository.Repository, c clock.Clock, loc *time.Location) *UserService {
	return &UserService{repo: repo, clock: c, loc: loc}
}

// Login signs in as a demo persona. Inside a sandbox, the same usernames select that sandbox's users.
func (s *UserService) Login(ctx context.Context, username string, sandbox uuid.NullUUID) (domain.Actor, dto.LoginDTO, error) {
	if username == "" {
		return domain.Actor{}, dto.LoginDTO{}, &domain.AppError{
			Code: domain.CodeValidationFailed, Message: "กรุณาเลือกบัญชีเดโม",
			Details: []domain.FieldError{{Field: "username", Message: "required"}},
		}
	}
	u, err := s.repo.GetUserByUsername(ctx, db.GetUserByUsernameParams{SandboxID: sandbox, Username: username})
	if repository.IsNotFound(err) {
		return domain.Actor{}, dto.LoginDTO{}, domain.NewError(domain.CodeUnauthenticated, "ไม่พบบัญชีเดโมนี้")
	}
	if err != nil {
		return domain.Actor{}, dto.LoginDTO{}, fmt.Errorf("get user: %w", err)
	}
	actor := domain.Actor{UserID: u.ID, Role: domain.Role(u.Role), SandboxID: u.SandboxID}
	return actor, dto.LoginDTO{User: userDTO(u)}, nil
}

func (s *UserService) Me(ctx context.Context, actor domain.Actor) (dto.MeDTO, error) {
	row, err := s.repo.GetMe(ctx, actor.UserID)
	if repository.IsNotFound(err) {
		// Missing user or primary account: take the slow path for the exact error.
		return s.meSlow(ctx, actor)
	}
	if err != nil {
		return dto.MeDTO{}, fmt.Errorf("get me: %w", err)
	}
	return dto.MeDTO{User: userDTO(row.User), Account: accountDTO(row.DemoAccount), UnreadNotifications: row.UnreadCount}, nil
}

func (s *UserService) meSlow(ctx context.Context, actor domain.Actor) (dto.MeDTO, error) {
	u, err := s.repo.GetUserByID(ctx, actor.UserID)
	if repository.IsNotFound(err) {
		return dto.MeDTO{}, domain.NewError(domain.CodeUnauthenticated, "กรุณาเข้าสู่ระบบอีกครั้ง")
	}
	if err != nil {
		return dto.MeDTO{}, fmt.Errorf("get user: %w", err)
	}
	acc, err := s.repo.GetPrimaryAccount(ctx, actor.UserID)
	if err != nil {
		return dto.MeDTO{}, fmt.Errorf("get primary account: %w", err)
	}
	unread, err := s.repo.CountUnreadNotifications(ctx, actor.UserID)
	if err != nil {
		return dto.MeDTO{}, fmt.Errorf("count unread: %w", err)
	}
	return dto.MeDTO{User: userDTO(u), Account: accountDTO(acc), UnreadNotifications: unread}, nil
}

func (s *UserService) Home(ctx context.Context, actor domain.Actor) (dto.HomeDTO, error) {
	if err := s.touchSandbox(ctx, actor); err != nil {
		// Only the janitor's idle timer depends on this; never fail the home screen over it.
		slog.WarnContext(ctx, "touch sandbox", "error", err.Error())
	}
	me, err := s.Me(ctx, actor)
	if err != nil {
		return dto.HomeDTO{}, err
	}
	home := dto.HomeDTO{Me: me, PendingInvites: []dto.PendingInviteDTO{}, ActiveDeals: []dto.ActiveDealDTO{}}

	if actor.Role == domain.RoleTenant {
		invites, err := s.repo.ListPendingInvites(ctx, db.ListPendingInvitesParams{TenantID: actor.UserID, Now: s.clock.Now()})
		if err != nil {
			return dto.HomeDTO{}, fmt.Errorf("list pending invites: %w", err)
		}
		for _, r := range invites {
			home.PendingInvites = append(home.PendingInvites, dto.PendingInviteDTO{
				DealID: r.DealID.String(), FromShortName: r.FromShortName, SentAt: iso(r.SentAt, s.loc),
				ProjectName: r.ProjectName, UnitNo: r.UnitNo, ViewingAt: iso(r.ViewingAt, s.loc),
				TotalSatang: r.TotalSatang, ShareCode: r.ShareCode,
			})
		}
	}

	deals, err := s.repo.ListActiveDeals(ctx, actor.UserID)
	if err != nil {
		return dto.HomeDTO{}, fmt.Errorf("list active deals: %w", err)
	}
	for _, d := range deals {
		home.ActiveDeals = append(home.ActiveDeals, dto.ActiveDealDTO{
			DealID: d.DealID.String(), State: string(d.State), ProjectName: d.ProjectName,
			UnitNo: d.UnitNo, TotalSatang: d.TotalSatang,
		})
	}
	return home, nil
}

func (s *UserService) Properties(ctx context.Context, actor domain.Actor) (dto.PropertiesDTO, error) {
	rows, err := s.repo.ListPropertiesByLandlord(ctx, actor.UserID)
	if err != nil {
		return dto.PropertiesDTO{}, fmt.Errorf("list properties: %w", err)
	}
	out := dto.PropertiesDTO{Items: make([]dto.PropertyDTO, 0, len(rows))}
	for _, p := range rows {
		out.Items = append(out.Items, dto.PropertyDTO{
			ID: p.ID.String(), PropertyType: p.PropertyType, ProjectName: p.ProjectName,
			UnitNo: p.UnitNo, DetailLabel: p.DetailLabel, NearbyLabel: p.NearbyLabel.String,
		})
	}
	return out, nil
}

func userDTO(u db.User) dto.UserDTO {
	return dto.UserDTO{ID: u.ID.String(), Role: string(u.Role), DisplayName: u.DisplayName, ShortName: u.ShortName, Sandbox: u.SandboxID.Valid}
}

func accountDTO(a db.DemoAccount) dto.AccountDTO {
	return dto.AccountDTO{
		ID: a.ID.String(), BankName: a.BankName, AccountType: a.AccountType, AccountNoMasked: a.AccountNoMasked,
		BalanceSatang: a.BalanceSatang, HeldSatang: a.HeldSatang, AvailableSatang: a.BalanceSatang - a.HeldSatang,
	}
}
