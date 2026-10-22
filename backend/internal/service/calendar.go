package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/suphanatchanlek30/psure/backend/internal/domain"
)

func (s *DealService) Calendar(ctx context.Context, actor domain.Actor, rawID string) (body []byte, filename string, err error) {
	deal, err := s.Get(ctx, actor, rawID)
	if err != nil {
		return nil, "", err
	}
	viewing, err := time.Parse(time.RFC3339, deal.ViewingAt)
	if err != nil {
		return nil, "", fmt.Errorf("parse viewingAt: %w", err)
	}
	moveIn, err := time.Parse("2006-01-02", deal.MoveInDate)
	if err != nil {
		return nil, "", fmt.Errorf("parse moveInDate: %w", err)
	}
	title := fmt.Sprintf("%s · %s %s", brandName, deal.Property.ProjectName, deal.Property.UnitNo)
	stamp := s.clock.Now().UTC().Format("20060102T150405Z")

	var b strings.Builder
	line := func(s string) { b.WriteString(s + "\r\n") }
	line("BEGIN:VCALENDAR")
	line("VERSION:2.0")
	line("PRODID:-//P Sure Prototype//TH")
	line("CALSCALE:GREGORIAN")
	line("BEGIN:VEVENT")
	line("UID:" + deal.ID + "-viewing@psure")
	line("DTSTAMP:" + stamp)
	line("DTSTART:" + viewing.UTC().Format("20060102T150405Z"))
	line("DTEND:" + viewing.Add(time.Hour).UTC().Format("20060102T150405Z"))
	line("SUMMARY:" + icsText("นัดดูห้อง · "+title))
	line("DESCRIPTION:" + icsText("ยืนยันว่าดูห้องแล้ว = ปล่อยค่าจอง ("+deal.RefNo+")"))
	line("END:VEVENT")
	line("BEGIN:VEVENT")
	line("UID:" + deal.ID + "-move-in@psure")
	line("DTSTAMP:" + stamp)
	line("DTSTART;VALUE=DATE:" + moveIn.Format("20060102"))
	line("DTEND;VALUE=DATE:" + moveIn.AddDate(0, 0, 1).Format("20060102"))
	line("SUMMARY:" + icsText("วันเข้าอยู่ · "+title))
	line("DESCRIPTION:" + icsText("ยืนยันการเข้าอยู่ = ปล่อยมัดจำหลัก ("+deal.RefNo+")"))
	line("END:VEVENT")
	line("END:VCALENDAR")
	return []byte(b.String()), "psure-" + deal.RefNo + ".ics", nil
}

func icsText(s string) string {
	return strings.NewReplacer(`\`, `\\`, ";", `\;`, ",", `\,`, "\n", `\n`).Replace(s)
}
