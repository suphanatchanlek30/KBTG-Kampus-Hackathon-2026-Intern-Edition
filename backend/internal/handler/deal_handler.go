package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/psure/backend/internal/domain"
	"github.com/suphanatchanlek30/psure/backend/internal/server/middleware"
	"github.com/suphanatchanlek30/psure/backend/internal/service"
)

type DealHandler struct {
	deals *service.DealService
}

func NewDealHandler(deals *service.DealService) *DealHandler {
	return &DealHandler{deals: deals}
}


func (h *DealHandler) Get(c fiber.Ctx) error {
	out, err := h.deals.Get(c.Context(), middleware.ActorFrom(c), c.Params("id"))
	if err != nil {
		return err
	}
	return c.JSON(out)
}

func (h *DealHandler) List(c fiber.Ctx) error {
	out, err := h.deals.List(c.Context(), middleware.ActorFrom(c), c.Query("status"))
	if err != nil {
		return err
	}
	return c.JSON(out)
}

func (h *DealHandler) PreviewInvite(c fiber.Ctx) error {
	out, err := h.deals.PreviewInvite(c.Context(), middleware.ActorFrom(c), c.Params("code"))
	if err != nil {
		return err
	}
	return c.JSON(out)
}

func (h *DealHandler) LookupUser(c fiber.Ctx) error {
	out, err := h.deals.LookupTenant(c.Context(), middleware.ActorFrom(c), c.Query("phone"))
	if err != nil {
		return err
	}
	return c.JSON(out)
}


type createDealRequest struct {
	PropertyID       string `json:"propertyId"`
	TotalSatang      int64  `json:"totalSatang"`
	BookingFeeSatang int64  `json:"bookingFeeSatang"`
	ViewingAt        string `json:"viewingAt"`
	MoveInDate       string `json:"moveInDate"`
}

func (h *DealHandler) Create(c fiber.Ctx) error {
	var req createDealRequest
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	return send(c)(h.deals.Create(c.Context(), middleware.ActorFrom(c), middleware.IdempotencyFrom(c), service.CreateDealInput(req)))
}

func (h *DealHandler) ReissueInvite(c fiber.Ctx) error {
	return send(c)(h.deals.ReissueInvite(c.Context(), middleware.ActorFrom(c), middleware.IdempotencyFrom(c), c.Params("id")))
}

type sendInviteRequest struct {
	Channel string `json:"channel"`
	Phone   string `json:"phone"`
}

func (h *DealHandler) SendInvite(c fiber.Ctx) error {
	var req sendInviteRequest
	if len(c.Body()) > 0 {
		if err := bindJSON(c, &req); err != nil {
			return err
		}
	}
	return send(c)(h.deals.SendInvite(c.Context(), middleware.ActorFrom(c), middleware.IdempotencyFrom(c), c.Params("id"),
		service.SendInviteInput(req)))
}

type versionRequest struct {
	Version int32 `json:"version"`
}

func (h *DealHandler) Reject(c fiber.Ctx) error {
	var req versionRequest
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	return send(c)(h.deals.Reject(c.Context(), middleware.ActorFrom(c), middleware.IdempotencyFrom(c), c.Params("id"), req.Version))
}

type lockRequest struct {
	Version    int32  `json:"version"`
	InviteCode string `json:"inviteCode"`
	Method     string `json:"method"`
}

func (h *DealHandler) Lock(c fiber.Ctx) error {
	var req lockRequest
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	return send(c)(h.deals.Lock(c.Context(), middleware.ActorFrom(c), middleware.IdempotencyFrom(c), c.Params("id"), service.LockInput(req)))
}

type confirmRequest struct {
	Version   int32    `json:"version"`
	Checklist []string `json:"checklist"`
}

func (h *DealHandler) ConfirmViewing(c fiber.Ctx) error {
	var req confirmRequest
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	return send(c)(h.deals.ConfirmViewing(c.Context(), middleware.ActorFrom(c), middleware.IdempotencyFrom(c), c.Params("id"),
		service.ConfirmInput(req)))
}

func (h *DealHandler) ConfirmMoveIn(c fiber.Ctx) error {
	var req confirmRequest
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	return send(c)(h.deals.ConfirmMoveIn(c.Context(), middleware.ActorFrom(c), middleware.IdempotencyFrom(c), c.Params("id"),
		service.ConfirmInput(req)))
}

func (h *DealHandler) Cancel(c fiber.Ctx) error {
	var req versionRequest
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	return send(c)(h.deals.Cancel(c.Context(), middleware.ActorFrom(c), middleware.IdempotencyFrom(c), c.Params("id"), req.Version))
}

func (h *DealHandler) ReportIssue(c fiber.Ctx) error {
	var req versionRequest
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	return send(c)(h.deals.ReportIssue(c.Context(), middleware.ActorFrom(c), middleware.IdempotencyFrom(c), c.Params("id"), req.Version))
}

// Calendar — GET /deals/{id}/calendar.ics
func (h *DealHandler) Calendar(c fiber.Ctx) error {
	body, name, err := h.deals.Calendar(c.Context(), middleware.ActorFrom(c), c.Params("id"))
	if err != nil {
		return err
	}
	c.Set(fiber.HeaderContentType, "text/calendar; charset=utf-8")
	c.Set(fiber.HeaderContentDisposition, `attachment; filename="`+name+`"`)
	return c.Send(body)
}

// ExpireNow — POST /demo/deals/{id}/expire-now (Demo tools)
func (h *DealHandler) ExpireNow(c fiber.Ctx) error {
	if err := h.deals.ExpireNow(c.Context(), middleware.ActorFrom(c), c.Params("id")); err != nil {
		return err
	}
	return h.Get(c)
}

func send(c fiber.Ctx) func(service.Response, error) error {
	return func(r service.Response, err error) error {
		if err != nil {
			return err
		}
		if r.Replayed {
			c.Set("Idempotent-Replayed", "true")
		}
		c.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSONCharsetUTF8)
		return c.Status(r.Status).Send(r.Body)
	}
}

func bindJSON(c fiber.Ctx, out any) error {
	if err := c.Bind().JSON(out); err != nil {
		return domain.Wrap(domain.CodeValidationFailed, "รูปแบบข้อมูลไม่ถูกต้อง", err)
	}
	return nil
}
