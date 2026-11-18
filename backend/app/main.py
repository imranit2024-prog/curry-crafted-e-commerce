"""Curry Crafted API (FastAPI).

Owns all business logic and all database access for the storefront:
catalogue, delivery eligibility, scheduling, basket pricing, accounts,
orders, payments, loyalty and referrals. The Next.js app is a pure frontend
that calls this service.

Run locally:  uvicorn app.main:app --reload --port 8000   (from the backend/ directory)
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import db
from .api_account import router as account_router
from .api_auth import router as auth_router
from .api_orders import router as orders_router
from .api_shop import router as shop_router
from .bootstrap import bootstrap

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("curry_crafted")

# Interactive API docs are opt-in so they are never exposed through the public storefront by accident.
DOCS = os.environ.get("API_DOCS") == "1"


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.open_pool()
    with db.connection() as conn:
        bootstrap(conn)
    log.info("Curry Crafted API ready")
    yield
    db.close_pool()


app = FastAPI(
    title="Curry Crafted API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if DOCS else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if DOCS else None,
)


@app.middleware("http")
async def json_only_posts(request: Request, call_next):
    """State-changing requests must be JSON. Browsers cannot send a cross-site
    ``application/json`` request without a CORS preflight (which this API never
    approves), so this doubles as CSRF protection. The Stripe webhook is exempt
    because it is authenticated by its signature instead."""
    if request.method == "POST" and request.url.path != "/api/stripe/webhook":
        if "application/json" not in request.headers.get("content-type", "").lower():
            return JSONResponse({"error": "Invalid request."}, status_code=400)
    return await call_next(request)


@app.exception_handler(RequestValidationError)
async def invalid_body(_: Request, __: RequestValidationError):
    return JSONResponse({"error": "Invalid request."}, status_code=400)


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    return JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code)


@app.exception_handler(Exception)
async def unexpected(_: Request, exc: Exception):
    log.exception("Unhandled error", exc_info=exc)
    return JSONResponse({"error": "Something went wrong. Please try again."}, status_code=500)


app.include_router(shop_router)
app.include_router(auth_router)
app.include_router(account_router)
app.include_router(orders_router)
