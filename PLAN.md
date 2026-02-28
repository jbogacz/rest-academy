# REST Academy - Implementation Plan

Finance-themed REST API sandbox with built-in lesson system. Swagger UI is the primary interface. Lessons are exposed as part of the API itself.

## Domain Model

| Resource | Complexity | Purpose |
|---|---|---|
| **Currencies** | Simple | Read-only reference data. Teaches GET, query params, filtering |
| **Accounts** | Medium | Full CRUD. Teaches POST, PUT, PATCH, DELETE, resource lifecycle |
| **Transactions** | Complex | Belongs to Account. Teaches relationships, nested routes, validation |
| **Transfers** | Action-oriented | POST-only action. Teaches idempotency keys, state machines (pending/completed/failed) |
| **Reports** | Read-heavy | Aggregated data. Teaches pagination, filtering, content negotiation |
| **Exchange Rates** | External-feeling | Read-only with conversion. Teaches computed resources, query params |

### Relationships
- Account has many Transactions
- Transfer references 2 Accounts (source + destination)
- Transactions auto-created when Transfer completes
- Reports aggregate across Transactions

### Business Rules
- Account balance can't go negative (unless type is "credit")
- Transfer between different currencies uses exchange rate
- Transaction types: `deposit`, `withdrawal`, `transfer_in`, `transfer_out`, `fee`
- Account statuses: `active`, `frozen`, `closed` - frozen/closed reject operations

## Lesson System

Lessons are a REST resource:

```
GET  /lessons                - list all lessons (grouped by module)
GET  /lessons/:id            - single lesson with full description
GET  /lessons/:id/hint       - get a hint
POST /lessons/:id/verify     - submit answer / check if task completed
```

### Verification Types
- **State-based** - checks if student performed an action (e.g., created an account)
- **Quiz-based** - student POSTs an answer (e.g., `{ "answer": 204 }`)
- **Exploration-based** - checks if student hit a specific endpoint (tracked via middleware)

### Lesson Modules

**Module 1: REST Basics**
1. Fetch the list of currencies (GET)
2. Get a single currency by code (path params)
3. Filter currencies by type (query params)
4. What HTTP status code did you get? (reading responses)
5. Request a currency that doesn't exist (404)

**Module 2: CRUD Operations**
6. Create a new bank account (POST + request body)
7. Retrieve your created account (resource IDs)
8. Update the account name using PUT (full replace)
9. Update just the status using PATCH (partial update)
10. Delete the account (DELETE)
11. Try to GET the deleted account (404 after delete)

**Module 3: Relationships & Nested Resources**
12. Create an account and deposit money (POST transaction)
13. List transactions for an account (nested routes)
14. Filter transactions by type (combined path + query params)
15. Try to withdraw more than the balance (422 / business validation)

**Module 4: Advanced Operations**
16. Create two accounts and make a transfer (action resources)
17. Make a transfer with idempotency key, repeat it (idempotency)
18. Try to transfer from a frozen account (business rules + error responses)
19. Make a cross-currency transfer (computed operations)

**Module 5: Query & Pagination**
20. List all transactions with pagination (limit/offset)
21. Generate a report for a date range (date filtering)
22. Sort transactions by amount (sorting params)
23. Request a report - observe response headers (custom headers, total count)

**Module 6: HTTP Deep Dive**
24. Make a request with wrong Content-Type (content negotiation)
25. Explore the error response format (error schemas)
26. Use If-None-Match header on currencies (caching/ETags)
27. Check CORS headers (CORS)

## Tech Stack

| Dependency | Purpose |
|---|---|
| `express` | Framework |
| `typescript` | Type safety |
| `swagger-ui-express` | Serves Swagger UI |
| `swagger-jsdoc` | OpenAPI from JSDoc |
| `uuid` | Resource IDs |
| `cors` | CORS headers |
| `tsx` | Dev runner |

## Project Structure

```
src/
  app.ts                    # Express setup, middleware, swagger
  server.ts                 # Entry point
  config.ts                 # Port, settings
  swagger.ts                # OpenAPI spec assembly

  store/
    index.ts                # Generic Map-based store with CRUD
    seed.ts                 # Initial data

  middleware/
    error-handler.ts        # Centralized error handling
    request-tracker.ts      # Tracks endpoints hit (for lesson verification)
    etag.ts                 # ETag support
    validate.ts             # Request body validation

  routes/
    currencies.ts
    accounts.ts
    transactions.ts
    transfers.ts
    reports.ts
    lessons.ts

  models/
    types.ts                # TypeScript interfaces
    errors.ts               # Custom error classes

  lessons/
    registry.ts             # Lesson definitions
    verifiers.ts            # Verification logic

  utils/
    pagination.ts
    filters.ts
```

## Response Conventions

```jsonc
// Single resource
{ "data": { ... } }

// Collection
{ "data": [...], "meta": { "total": 42, "limit": 20, "offset": 0 } }

// Error
{ "error": { "code": "INSUFFICIENT_FUNDS", "message": "...", "details": { ... } } }
```

## Phases

1. **Skeleton** - project init, express + swagger, map store, error handler, health check
2. **Simple Resources** - currencies (read-only), accounts (CRUD), seed data
3. **Complex Resources** - transactions (nested), transfers (state machine), business rules
4. **Query Features** - pagination, filtering, sorting, reports, ETags
5. **Lesson System** - registry, request tracker, verification, hints, progress
6. **Polish** - custom swagger banner, consistent errors, realistic seed data
