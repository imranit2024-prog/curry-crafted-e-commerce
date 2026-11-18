# Curry Crafted API (Python / FastAPI)

The backend for the Curry Crafted storefront. It owns all business logic and
all database access. The Next.js app in the repository root is the frontend
and reaches this service through its `/api/*` proxy.

## Run it

```bash
cd backend
pip install -r requirements.txt            # or: pip install --target .pydeps -r requirements.txt
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
uvicorn app.main:app --reload --port 8000  # with .pydeps: PYTHONPATH=.pydeps python3 -m uvicorn app.main:app --port 8000
```

On start the service creates the schema if it is missing (`app/schema.sql`) and
seeds an empty catalogue with placeholder data (`app/seed_data.json`).

## How the frontend finds it

| Setting | Effect |
| --- | --- |
| `BACKEND_URL` set (for example `https://api.example.com`) | Next.js calls that URL. Use this in production, with the API deployed as its own service. |
| `BACKEND_URL` not set | Next.js starts this API itself as a child process on `127.0.0.1:${BACKEND_PORT:-8421}` and installs the Python dependencies into `backend/.pydeps` if they are missing. This is what the preview uses. |

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `STRIPE_SECRET_KEY` | Enables real Stripe Checkout. Without it, checkout uses a clearly labelled demo payment form. |
| `STRIPE_WEBHOOK_SECRET` | Enables the signed webhook at `POST /api/stripe/webhook` |
| `SITE_URL` | Public storefront origin for Stripe return URLs (otherwise taken from forwarded headers) |
| `API_DOCS=1` | Serves interactive docs at `/api/docs` (off by default) |

## Layout

| File | Responsibility |
| --- | --- |
| `app/main.py` | App, startup, JSON-only POST guard, error shape |
| `app/postcode.py` | Delivery eligibility engine (chilled postcodes, frozen restrictions) |
| `app/schedule.py` | Chilled delivery days, slots, cut-offs, capacity; frozen dispatch estimate |
| `app/pricing.py` | Basket quote: prices, availability, bundles, delivery, promo codes, rewards |
| `app/orders.py` | Order creation, Stripe, idempotent payment completion, loyalty and referral awards |
| `app/security.py` | Password hashing, sessions, cookies |
| `app/api_*.py` | HTTP routes |
| `app/schema.sql` | Exported from `src/db/schema.ts` with `npx drizzle-kit export --sql` |

The table definitions live in `src/db/schema.ts` (Drizzle), because the hosting
platform bootstraps the database from it. After changing that file, re-export
`app/schema.sql` so a standalone API can still create its own schema.
