# Database Setup (Mock-First, DB-Ready)

This backend currently runs in `mock` mode by default.

## Runtime Mode

- `PERSISTENCE_MODE=mock` (default): uses in-memory mock repositories.
- `PERSISTENCE_MODE=db`: selects DB repository classes.

At this stage, DB repository classes are scaffolded placeholders that mirror mock behavior and are ready to be replaced by SQL/ORM adapters.

## Schema

Use `backend/database/schema.sql` as the baseline DDL for:

- finance
- hr
- inventory
- procurement
- sales
- marketing
- payment
- admin
- it
- it-settings

All business tables include `tenant_id` for multi-tenant isolation.

## Apply Schema

Run the SQL with your DB client (PostgreSQL-compatible syntax):

1. Create a database.
2. Execute `backend/database/schema.sql`.
3. Set your connection string in environment variables.
4. Switch `PERSISTENCE_MODE=db` when DB repositories are implemented.
