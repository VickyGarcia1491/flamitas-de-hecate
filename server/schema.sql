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
-- Claves de notificación privadas: persistentes, nunca se publican en el frontend.
CREATE TABLE IF NOT EXISTS push_config (id INTEGER PRIMARY KEY CHECK (id=1), keys JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS push_subscriptions (
 endpoint TEXT PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 session_hash TEXT NOT NULL,
 subscription JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS push_jobs (
 id BIGSERIAL PRIMARY KEY,
 order_id BIGINT NOT NULL,
 endpoint TEXT NOT NULL REFERENCES push_subscriptions(endpoint) ON DELETE CASCADE,
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(order_id, endpoint)
);
