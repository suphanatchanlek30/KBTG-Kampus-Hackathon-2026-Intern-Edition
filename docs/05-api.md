# API Guide

The canonical API contract is [`backend/api/openapi.yaml`](../backend/api/openapi.yaml). Keep this guide concise and update the OpenAPI document when the contract changes.

## Conventions

| Item | Rule |
| --- | --- |
| Base path | `/api/v1` |
| Format | JSON with `camelCase` fields. |
| Time | ISO 8601 timestamps with offsets. |
| Money | Integer satang fields, such as `totalSatang`. |
| Authentication | Demo session cookie returned by `POST /auth/demo-login`. |
| Request tracing | Send `X-Request-ID`; the API generates one when absent. |
| Idempotency | State-changing `POST` requests require `Idempotency-Key`. |
| Concurrency | State-changing deal requests include the current deal version. |

## Endpoint groups

| Group | Examples |
| --- | --- |
| Health | `GET /healthz`, `GET /readyz` |
| Session | `POST /auth/demo-login`, `POST /auth/logout`, `GET /me` |
| Home and property | `GET /home`, `GET /properties` |
| Deals | Create, read, invite, lock, release, cancel, and report issue endpoints under `/deals`. |
| Invites | `GET /invites/{codeOrToken}` |
| Notifications | List and mark notifications as read. |
| Transfers | Payee lookup, precheck, and simulated transfer endpoints. |
| Demo tools | Reset and expiry endpoints, enabled only when configured. |

## Mutation rules

1. Authenticate the caller and verify the caller is a deal party with the permitted role.
2. Validate the request body and current deal state.
3. Require a unique idempotency key and a matching deal version where applicable.
4. Make the state transition and ledger records in one transaction.
5. Return the updated representation or the stored response for a repeated request.

## Errors

Error responses use a stable code, a user-safe message, and a request ID:

```json
{
  "error": {
    "code": "DEAL_STATE_CONFLICT",
    "message": "The deal cannot perform this action.",
    "requestId": "..."
  }
}
```

Clients should handle validation errors inline, redirect unauthenticated users to login, refetch after a conflict, and show the request ID with unexpected failures.
