"""PostgreSQL access: one shared connection pool, dict rows, autocommit by default.

Multi-statement units of work use ``with conn.transaction():`` explicitly.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Annotated, Iterator

import psycopg
from fastapi import Depends
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is required")
    return url


def open_pool() -> None:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            database_url(),
            min_size=1,
            max_size=int(os.environ.get("DB_POOL_SIZE", "10")),
            kwargs={"row_factory": dict_row, "autocommit": True},
            open=True,
        )


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def connection() -> Iterator[psycopg.Connection]:
    if _pool is None:
        open_pool()
    assert _pool is not None
    with _pool.connection() as conn:
        yield conn


def get_conn() -> Iterator[psycopg.Connection]:
    with connection() as conn:
        yield conn


Conn = Annotated[psycopg.Connection, Depends(get_conn)]
