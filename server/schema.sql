CREATE TABLE IF NOT EXISTS users (
 id BIGSERIAL PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 nombre TEXT NOT NULL,
 telefono TEXT NOT NULL DEFAULT '',
 password_hash TEXT NOT NULL,
 rol TEXT NOT NULL CHECK (rol IN ('admin', 'cliente'))
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
-- Documento transaccional: catálogo, stock por esencia, pedidos y bandeja.
-- El bloqueo de esta fila mantiene pedido y stock atómicos para esta tienda pequeña.
CREATE TABLE IF NOT EXISTS business_state (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 version INTEGER NOT NULL DEFAULT 1,
 data JSONB NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS order_ids START 1000000;
CREATE TABLE IF NOT EXISTS inquiries (
 id BIGSERIAL PRIMARY KEY,
 data JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS imports (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
