import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'REST Academy - Finance API',
      version: '1.0.0',
      description: `
# Welcome to REST Academy!

This is an interactive learning sandbox for exploring REST APIs. The API is themed around a fictional banking system with accounts, transactions, transfers, and more.

## How to Use This Sandbox

1. **Start with Lessons** - Go to the **Lessons** section below and call \`GET /lessons\` to see all available lessons grouped by module
2. **Read each lesson** - Use \`GET /lessons/{id}\` to get the full task description
3. **Complete the task** - Use the other API endpoints (Currencies, Accounts, etc.) to complete each lesson's task
4. **Verify your work** - Use \`POST /lessons/{id}/verify\` to check if you completed the task correctly
5. **Get hints** - Stuck? Use \`GET /lessons/{id}/hint\` for help

## Modules

| # | Module | Lessons | Topics |
|---|--------|---------|--------|
| 1 | REST Basics | 1-5 | GET, path params, query params, status codes |
| 2 | CRUD Operations | 6-11 | POST, PUT, PATCH, DELETE |
| 3 | Relationships | 12-15 | Nested resources, business rules |
| 4 | Advanced Operations | 16-19 | Transfers, idempotency, cross-currency |
| 5 | Query & Pagination | 20-23 | Filtering, sorting, pagination, headers |
| 6 | HTTP Deep Dive | 24-27 | Content-Type, errors, ETags, CORS |

## API Conventions

- All responses use \`{"data": ...}\` envelope
- Collections include \`{"data": [...], "meta": {"total", "limit", "offset"}}\`
- Errors use \`{"error": {"code", "message", "details"}}\`
- Dates are ISO 8601 format
      `,
    },
    tags: [
      { name: 'Lessons', description: 'Interactive lessons for learning REST API concepts. **Start here!**' },
      { name: 'Currencies', description: 'Read-only reference data for currencies and exchange rates' },
      { name: 'Accounts', description: 'Bank account management with full CRUD operations' },
      { name: 'Transactions', description: 'Account transactions (deposits, withdrawals, fees)' },
      { name: 'Transfers', description: 'Money transfers between accounts with business rules' },
      { name: 'Reports', description: 'Financial reports and aggregated data' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
