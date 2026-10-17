package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/suphanatchanlek30/ksure/backend/internal/domain"
	"github.com/suphanatchanlek30/ksure/backend/internal/dto"
	"github.com/suphanatchanlek30/ksure/backend/internal/platform/clock"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository"
	"github.com/suphanatchanlek30/ksure/backend/internal/repository/db"
)

const notificationPageSize = 50

type NotificationService struct {
	repo  *repository.Repository
	clock clock.Clock
	loc   *time.Location
}

func NewNotificationService(repo *repository.Repository, c clock.Clock, loc *time.Location) *NotificationService {
	return &NotificationService{repo: repo, clock: c, loc: loc}
}

func (s *NotificationService) List(ctx context.Context, actor domain.Actor) (dto.NotificationsDTO, error) {
	rows, err := s.repo.ListNotifications(ctx, db.ListNotificationsParams{UserID: actor.UserID, Limit: notificationPageSize})
	if err != nil {
		return dto.NotificationsDTO{}, fmt.Errorf("list notifications: %w", err)
	}
	unread, err := s.repo.CountUnreadNotifications(ctx, actor.UserID)
	if err != nil {
		return dto.NotificationsDTO{}, fmt.Errorf("count unread: %w", err)
	}
	out := dto.NotificationsDTO{Items: make([]dto.NotificationDTO, 0, len(rows)), UnreadCount: unread}
	for _, n := range rows {
		out.Items = append(out.Items, dto.NotificationDTO{
			ID: n.ID.String(), Type: string(n.Type), DealID: nullUUIDPtr(n.DealID), Title: n.Title, Body: n.Body,
			ReadAt: isoPtr(n.ReadAt, s.loc), CreatedAt: iso(n.CreatedAt, s.loc),
		})
	}
	return out, nil
}

func (s *NotificationService) MarkRead(ctx context.Context, actor domain.Actor, ids []string, all bool) (dto.UnreadCountDTO, error) {
	now := s.clock.Now()
	switch {
	case all:
		if err := s.repo.MarkAllNotificationsRead(ctx, db.MarkAllNotificationsReadParams{UserID: actor.UserID, ReadAt: &now}); err != nil {
			return dto.UnreadCountDTO{}, fmt.Errorf("mark all read: %w", err)
		}
	case len(ids) > 0:
		parsed := make([]uuid.UUID, 0, len(ids))
		for _, raw := range ids {
			id, err := uuid.Parse(raw)
			if err != nil {
				return dto.UnreadCountDTO{}, &domain.AppError{
					Code: domain.CodeValidationFailed, Message: "รหัสแจ้งเตือนไม่ถูกต้อง",
					Details: []domain.FieldError{{Field: "ids", Message: "must be UUIDs"}},
				}
			}
			parsed = append(parsed, id)
		}
		if err := s.repo.MarkNotificationsRead(ctx, db.MarkNotificationsReadParams{UserID: actor.UserID, Ids: parsed, ReadAt: &now}); err != nil {
			return dto.UnreadCountDTO{}, fmt.Errorf("mark read: %w", err)
		}
	default:
		return dto.UnreadCountDTO{}, &domain.AppError{
			Code: domain.CodeValidationFailed, Message: "ระบุแจ้งเตือนที่อ่านแล้ว",
			Details: []domain.FieldError{{Field: "ids", Message: "required unless all is true"}},
		}
	}
	unread, err := s.repo.CountUnreadNotifications(ctx, actor.UserID)
	if err != nil {
		return dto.UnreadCountDTO{}, fmt.Errorf("count unread: %w", err)
	}
	return dto.UnreadCountDTO{UnreadCount: unread}, nil
}
