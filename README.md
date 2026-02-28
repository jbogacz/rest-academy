# REST Academy

A hands-on REST API learning sandbox built for business analysts and anyone who wants to understand how REST APIs work by actually using one.

The API is themed around a fictional banking system - accounts, transactions, transfers, exchange rates. No database, no setup complexity. Just start the server and open Swagger UI.

## What's the idea?

Instead of reading documentation about REST, you learn by doing. The API ships with **27 interactive lessons** organized into 6 modules. The twist: **lessons themselves are a REST resource**. You learn REST by using REST to fetch your assignments, complete tasks, and verify your work.

Everything happens through Swagger UI - it's the only interface you need. No Postman, no curl, no extra tools.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You'll land on Swagger UI with all endpoints documented.

## How to use it (for the student)

1. Expand the **Lessons** section in Swagger UI
2. Call `GET /lessons` to see all 27 lessons grouped by module
3. Pick a lesson and call `GET /lessons/{id}` to read the full task
4. Complete the task using the other API endpoints (Currencies, Accounts, etc.)
5. Call `POST /lessons/{id}/verify` to check if you got it right
6. Stuck? Call `GET /lessons/{id}/hint`

### Lesson modules

| Module | Lessons | What you'll learn |
|--------|---------|-------------------|
| 1 - REST Basics | 1-5 | GET requests, path params, query params, status codes, 404 |
| 2 - CRUD Operations | 6-11 | POST, PUT, PATCH, DELETE, resource lifecycle |
| 3 - Relationships | 12-15 | Nested resources, business validation, 422 errors |
| 4 - Advanced Operations | 16-19 | Transfers, idempotency keys, cross-currency, state machines |
| 5 - Query & Pagination | 20-23 | Filtering, sorting, limit/offset, response headers |
| 6 - HTTP Deep Dive | 24-27 | Content-Type, error formats, ETags, CORS |

### How verification works

Lessons use three types of checks:

- **quiz** - you submit an answer: `POST /lessons/4/verify` with `{"answer": "200"}`
- **state** - the system checks if you actually did something (e.g. created an account)
- **exploration** - the system tracks whether you hit the right endpoint

## API overview

### Resources

- **Currencies** - 8 currencies (fiat + crypto), read-only. Exchange rate conversion endpoint
- **Accounts** - full CRUD. Types: checking, savings, credit. Statuses: active, frozen, closed
- **Transactions** - nested under accounts (`/accounts/{id}/transactions`). Deposits and withdrawals
- **Transfers** - money movement between accounts. Cross-currency support, idempotency keys
- **Reports** - aggregated summaries with custom response headers

### Response format

```json
// Single resource
{"data": { ... }}

// Collection
{"data": [...], "meta": {"total": 42, "limit": 20, "offset": 0}}

// Error
{"error": {"code": "INSUFFICIENT_FUNDS", "message": "...", "details": { ... }}}
```

### Business rules worth exploring

- Withdrawal fails if balance is too low (unless account type is `credit`)
- Frozen and closed accounts reject operations
- Transfers auto-create transactions on both accounts
- Duplicate idempotency keys return the original transfer (200) instead of creating a new one (201)
- Accounts must have zero balance to be deleted

## Seed data

The server starts with pre-loaded data so you can explore immediately:

- 8 currencies (USD, EUR, GBP, JPY, CHF, PLN, BTC, ETH)
- 6 accounts across different owners, currencies, and statuses
- 14 transactions with realistic descriptions

Data lives in memory. Restart the server to reset everything.

## Scripts

```bash
npm run dev    # start with hot reload (tsx watch)
npm run build  # compile TypeScript
npm start      # run compiled version
```

## Tech stack

Express, TypeScript, swagger-ui-express, swagger-jsdoc. Six runtime dependencies total. No database.
