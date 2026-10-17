package clock

import "time"

type Clock interface {
	Now() time.Time
}

type System struct{}

func (System) Now() time.Time { return time.Now() }

type Shifted struct {
	offset time.Duration
}

func NewShifted(start time.Time) Shifted {
	return Shifted{offset: time.Until(start)}
}

func (s Shifted) Now() time.Time { return time.Now().Add(s.offset) }

type Fixed struct {
	T time.Time
}

func (f Fixed) Now() time.Time { return f.T }
