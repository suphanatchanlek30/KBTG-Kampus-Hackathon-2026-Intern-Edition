# Data Model

PostgreSQL stores the prototype's users, rental deals, financial tranches, ledger entries, invitations, and notifications. Migrations in `backend/migrations/` are the schema authority.

## Core records

| Record | Purpose |
| --- | --- |
| User and account | Demo identity, role, and balance information. |
| Property | A landlord-owned rental unit used when creating a deal. |
| Deal | Parties, property, amounts, dates, lifecycle state, and version. |
| Tranche | Booking-fee or main-deposit amount and its hold, release, or refund status. |
| Ledger entry | Auditable balance movement for a simulated transaction. |
| Invite | Short-lived tenant access to a deal. |
| Notification | In-app event visible to a user. |

## Invariants

- Amounts are integer satang; decimal currency values are never persisted.
- A deal contains a booking-fee tranche and a main-deposit tranche.
- The sum of tranche amounts equals the deal total.
- State changes and ledger entries occur in one database transaction.
- A request version protects state-changing operations from concurrent writes.
- An idempotency key binds one mutation request to one response.
- Invite tokens are treated as secrets and expire independently from the deal.

## State and money movement

| Deal state | Held | Released | Refunded |
| --- | ---: | ---: | ---: |
| `WAITING_ACCEPT` | 0 | 0 | 0 |
| `FUNDS_LOCKED` | Total | 0 | 0 |
| `BOOKING_FEE_RELEASED` | Main deposit | Booking fee | 0 |
| `RELEASED` | 0 | Total | 0 |
| `REFUNDED` | 0 | Prior releases | Remaining held amount |

`REJECTED` and `EXPIRED` describe closed request paths. The API determines any balance effect from the current state and recorded tranches.

## Development data

The seed migration provides demo users, accounts, properties, and example deals. Rebuild local seed data with `make seed`; reset the local database with `make db-reset`.

Use `make test` for backend tests. It creates or uses the separate `ksure_test` database.
