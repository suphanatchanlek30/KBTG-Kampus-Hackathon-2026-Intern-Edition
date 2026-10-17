package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/suphanatchanlek30/ksure/backend/internal/server/middleware"
	"github.com/suphanatchanlek30/ksure/backend/internal/service"
)

type TransferHandler struct {
	transfers *service.TransferService
}

func NewTransferHandler(t *service.TransferService) *TransferHandler {
	return &TransferHandler{transfers: t}
}

func (h *TransferHandler) Payees(c fiber.Ctx) error {
	out, err := h.transfers.Payees(c.Context(), middleware.ActorFrom(c))
	if err != nil {
		return err
	}
	return c.JSON(out)
}

type precheckRequest struct {
	ToAccountID  string `json:"toAccountId"`
	AmountSatang int64  `json:"amountSatang"`
}

func (h *TransferHandler) Precheck(c fiber.Ctx) error {
	var req precheckRequest
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	out, err := h.transfers.Precheck(c.Context(), middleware.ActorFrom(c), req.ToAccountID)
	if err != nil {
		return err
	}
	return c.JSON(out)
}

type transferRequest struct {
	ToAccountID  string `json:"toAccountId"`
	AmountSatang int64  `json:"amountSatang"`
	Memo         string `json:"memo"`
	Action       string `json:"action"`
}

func (h *TransferHandler) Create(c fiber.Ctx) error {
	var req transferRequest
	if err := bindJSON(c, &req); err != nil {
		return err
	}
	return send(c)(h.transfers.Create(c.Context(), middleware.ActorFrom(c), middleware.IdempotencyFrom(c),
		service.TransferInput(req)))
}
