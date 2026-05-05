# WhatsApp API — AGENTS.md

## Quick Start

```bash
# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm run dev
```

**No root `package.json`** — always `cd` into the sub-package first.

## Database Setup

```bash
cd backend
npx prisma db push    # Create tables from schema
npx prisma db seed    # Seed demo data
```

## Key Technical Facts

- **Backend**: Express 5 + TypeScript (strict), **ES Module** (`"type": "module"`). Dev via `tsx`, build via `tsc`.

- **Database**: Prisma with **SQLite** (`file:./dev.db`). No migration files — uses `prisma db push` (prototype pattern).
- **LLM Providers**: Gemini , OpenAI, Ollama, Groq, Opencode (default), Mock — adapter pattern in `backend/src/llm/factory.ts`.
- **ESM imports**: All local imports MUST use `.js` extension (e.g., `import { config } from './config.js'`).

## Architecture

| Path                                         | Purpose                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `backend/src/index.ts`                       | Express server entry — routes, middleware, Socket.io init                            |
| `backend/src/routes/webhook.ts`              | Meta webhook → AI agent processing                                                   |
| `backend/src/services/ai-agent.ts`           | LLM orchestration with tool calling                                                  |
| `backend/src/llm/`                           | Pluggable providers (gemini, openai, ollama, groq, opencode, mock)                   |
| `backend/src/tools/`                         | AI agent tools: `query_menu`, `submit_order`, `check_order_status`, `file_complaint` |
| `backend/src/middleware/business-context.ts` | `x-api-key` auth → attaches business to `req`                                        |
| `backend/src/lib/prisma.ts`                  | Shared Prisma client singleton                                                       |
| `backend/prisma/schema.prisma`               | DB schema (Business, Customer, MenuItem, Order, Complaint, etc.)                     |

## Running Tests

```bash
cd backend
npm test              # vitest (watch mode)
npm run test:run      # single run
npm run test:coverage # with coverage

# Frontend has no test runner configured
```

**Test quirks:**

- Tests use a separate database: `file:./test.db` (not dev.db)
- `test/setup.ts` auto-sets `NODE_ENV=test`, `LLM_PROVIDER=opencode`, `LLM_MODEL=deepseek-v4-flash`
- `test/helpers.ts` provides `createTestFixture()` for full test data setup

## Auth & API

- Webhook route (`/api/webhook`) — **no auth required**, rate limited (30 req/min)
- All dashboard routes require `x-api-key` header matching a Business record

## Demo Credentials

| Role                  | Auth Method                             | Credentials                                |
| --------------------- | --------------------------------------- | ------------------------------------------ |
| **Tenant (Business)** | `x-api-key: demo-api-key-123` or JWT    | `admin@al-baraka.com` / `Admin123!`        |
| **Platform Admin**    | JWT via `POST /api/auth/platform-login` | `admin@platform.com` / `PlatformAdmin123!` |

## API Documentation

```bash
# Interactive docs UI (Scalar)
open http://localhost:3001/api/docs

# Raw OpenAPI 3.1 spec
curl http://localhost:3001/api/openapi.yaml
```

## Env Variables

| Variable           | Default           |
| ------------------ | ----------------- |
| `PORT`             | 3001              |
| `DATABASE_URL`     | `file:./dev.db`   |
| `LLM_PROVIDER`     | opencode          |
| `LLM_MODEL`        | deepseek-v4-flash |
| `OPENCODE_API_KEY` | (required)        |

## Testing the Webhook

```bash
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "demo-phone-id",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "15550783881",
            "phone_number_id": "demo-phone-id"
          },
          "contacts": [{"profile": {"name": "Test"}, "wa_id": "966501234567"}],
          "messages": [{
            "from": "966501234567",
            "id": "test123",
            "timestamp": "1749416383",
            "type": "text",
            "text": {"body": "I want 2 shawarma chicken"}
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

## Verification Before Committing

```bash
# Backend
cd backend && npx tsc --noEmit && npx vitest run
```

## Security

- `backend/.env` contains real API keys — ensure it is in `.gitignore` **before any commit**
