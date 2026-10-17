# Prototype System Reference

This file retains the historical filename used by earlier project links. It describes the target direction for a future production system; it does not define the running prototype.

## Prototype scope

The current application provides demo authentication, simulated funds, rental deal states, invite QR codes, notifications, and transfer-risk warnings. It does not connect to real accounts, identity providers, payment rails, or production operations.

## Production direction

| Concern | Required capability |
| --- | --- |
| Identity | Verified user identity, strong authentication, session controls, and consent records. |
| Money movement | Licensed payment integration, reconciliation, limits, reversals, and auditable ledgers. |
| Security | Threat modeling, secrets management, encryption, vulnerability management, and independent review. |
| Reliability | Monitoring, alerting, backups, disaster recovery, capacity planning, and incident response. |
| Governance | Data classification, retention, access review, privacy controls, and regulatory assessment. |
| Operations | Runbooks, support tooling, fraud handling, and service-level objectives. |

## Delivery rule

Treat this document as planning context only. Production decisions require approved requirements, architecture review, legal and compliance assessment, and operational ownership.
