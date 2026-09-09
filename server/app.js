import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { hashPassword, verifyPassword, tokenHash, newToken, fail, text, email, password, validateTree } from './security.js';
import { emptyState, validateState, checkout } from './business.js';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function initialize(db, config) {
  await db.query(await readFile(new URL('schema.sql', import.meta.url), 'utf8'));
  const products = JSON.parse(await readFile(new URL('seed.json', import.meta.url), 'utf8'));
  await db.query('INSERT INTO business_state(id,data) VALUES(1,$1) ON CONFLICT DO NOTHING', [JSON.stringify(emptyState(products))]);
  const admin = await db.query("SELECT id FROM users WHERE rol='admin' LIMIT 1");
  if (!admin.rows.length) {
    const address = email(config.ADMIN_EMAIL); const secret = password(config.ADMIN_PASSWORD);
    await db.query("INSERT INTO users(email,nombre,password_hash,rol) VALUES($1,'Administradora Flamitas',$2,'admin') ON CONFLICT DO NOTHING", [address, await hashPassword(secret)]);
  }
}
export function createApp(db, config = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({contentSecurityPolicy: {directives: {"script-src": ["'self'"], "img-src": ["'self'", 'data:'], "style-src": ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], "font-src": ["'self'", 'https://fonts.gstatic.com'], "upgrade-insecure-requests": config.NODE_ENV === 'production' ? [] : null}}}));
  app.use('/api', rateLimit({windowMs: 60000, limit: 180}));
  app.use(express.json({limit: '25mb'}));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) && req.get('X-Flamitas') !== '1') return res.status(403).json({error: 'Solicitud no permitida.'});
    next();
  });
  app.use('/api', async (req, res, next) => {
    const token = /(?:^|;\s*)flamitas_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    if (token) {
      const result = await db.query('SELECT u.id,u.email,u.nombre,u.telefono,u.rol FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>now()', [tokenHash(token)]);
      req.user = result.rows[0]; req.sessionHash = tokenHash(token);
    }
    next();
  });
  const auth = (req, res, next) => req.user ? next() : res.status(401).json({error: 'Iniciá sesión para continuar.'});
  const admin = (req, res, next) => req.user?.rol === 'admin' ? next() : res.status(403).json({error: 'Acceso exclusivo de administración.'});
  async function transact(work) {
    const client = await db.connect();
    try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
    catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  }
  async function session(req, res, user) {
    const token = newToken();
    if (req.sessionHash) await db.query('DELETE FROM sessions WHERE token_hash=$1', [req.sessionHash]);
    await db.query('DELETE FROM sessions WHERE expires_at<now()');
    await db.query("INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')", [tokenHash(token), user.id]);
    res.cookie('flamitas_session', token, {httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', maxAge: 604800000, path: '/'});
    const {password_hash, ...safe} = user; return safe;
  }
  const loginLimit = rateLimit({windowMs: 900000, limit: 30, message: {error: 'Demasiados intentos. Probá en 15 minutos.'}});
  app.post('/api/register', loginLimit, async (req, res) => {
    const address = email(req.body.email), nombre = text(req.body.nombre), telefono = text(req.body.telefono || '', 100, false);
    const hash = await hashPassword(password(req.body.password));
    const result = await db.query("INSERT INTO users(email,nombre,telefono,password_hash,rol) VALUES($1,$2,$3,$4,'cliente') RETURNING *", [address, nombre, telefono, hash]);
    res.status(201).json(await session(req, res, result.rows[0]));
  });
  app.post('/api/login', loginLimit, async (req, res) => {
    const address = email(req.body.email);
    if (typeof req.body.password !== 'string' || req.body.password.length > 128) fail('Email o contraseña incorrectos.', 401);
    const result = await db.query('SELECT * FROM users WHERE email=$1', [address]);
    if (!result.rows[0] || !await verifyPassword(req.body.password, result.rows[0].password_hash)) fail('Email o contraseña incorrectos.', 401);
    res.json(await session(req, res, result.rows[0]));
  });
  app.post('/api/logout', async (req, res) => {
    if (req.sessionHash) await db.query('DELETE FROM sessions WHERE token_hash=$1', [req.sessionHash]);
    res.clearCookie('flamitas_session', {path: '/'}).json({ok: true});
  });
  app.get('/api/bootstrap', async (req, res) => {
    const {data, version} = (await db.query('SELECT * FROM business_state WHERE id=1')).rows[0];
    res.json({usuario: req.user || null, version, productos: data.productos, esencias: data.esencias, pedidos: req.user?.rol === 'admin' ? data.pedidos : data.pedidos.filter(p => req.user && p.cliente.email === req.user.email), vistos: req.user?.rol === 'admin' ? data.vistos : []});
  });
  app.put('/api/admin/state', admin, async (req, res) => {
    validateState(req.body.data);
    const result = await db.query('UPDATE business_state SET data=$1,version=version+1 WHERE id=1 AND version=$2 RETURNING version', [JSON.stringify(req.body.data), req.body.version]);
    if (!result.rows.length) fail('Los datos cambiaron en otra sesión. Recargá la página y repetí el cambio.', 409);
    res.json(result.rows[0]);
  });
  app.post('/api/orders', auth, async (req, res) => {
    const key = text(req.body.requestId, 100);
    res.status(201).json(await transact(async client => {
      const state = (await client.query('SELECT data FROM business_state WHERE id=1 FOR UPDATE')).rows[0].data;
      const previous = state.pedidos.find(p => p.requestId === key && p.cliente.email === req.user.email);
      if (previous) return previous;
      const id = Number((await client.query("SELECT nextval('order_ids') AS id")).rows[0].id);
      const order = checkout(state, req.body, req.user, id); order.requestId = key;
      await client.query('UPDATE business_state SET data=$1,version=version+1 WHERE id=1', [JSON.stringify(state)]);
      return order;
    }));
  });
  app.post('/api/contact', rateLimit({windowMs: 3600000, limit: 15}), async (req, res) => {
    const data = {nombre: text(req.body.nombre), email: email(req.body.email), telefono: text(req.body.telefono || '', 100, false), mensaje: text(req.body.mensaje?.replace(/\r?\n/g, ' '), 5000), fecha: new Date().toISOString()};
    await db.query('INSERT INTO inquiries(data) VALUES($1)', [JSON.stringify(data)]); res.status(201).json({ok: true});
  });
  app.get('/api/admin/backup', admin, async (req, res) => {
    const state = (await db.query('SELECT data FROM business_state WHERE id=1')).rows[0].data;
    const consultas = (await db.query('SELECT data FROM inquiries ORDER BY id')).rows.map(r => r.data);
    res.json({format: 'flamitas-business-v1', ...state, consultas});
  });
  app.post('/api/admin/import', admin, async (req, res) => {
    const input = req.body;
    const state = {productos: input.productos, esencias: input.esencias || {mediana: {}, chica: {}}, pedidos: input.pedidos || [], vistos: input.vistos || []};
    validateState(state); validateTree(input.consultas || []);
    res.json(await transact(async client => {
      const current = (await client.query('SELECT data FROM business_state WHERE id=1 FOR UPDATE')).rows[0].data;
      if (current.pedidos.length || (await client.query('SELECT id FROM imports')).rows.length) fail('La importación inicial ya se hizo o hay pedidos nuevos. No se sobrescribieron datos.', 409);
      await client.query('INSERT INTO imports(id) VALUES(1)');
      await client.query('UPDATE business_state SET data=$1,version=version+1 WHERE id=1', [JSON.stringify(state)]);
      for (const inquiry of input.consultas || []) await client.query('INSERT INTO inquiries(data) VALUES($1)', [JSON.stringify(inquiry)]);
      const largest = Math.max(999999, ...state.pedidos.map(p => p.id));
      await client.query("SELECT setval('order_ids',$1,true)", [largest]);
      return {ok: true};
    }));
  });
  app.get('/health', async (req, res) => { await db.query('SELECT 1'); res.json({ok: true}); });
  // Servir únicamente recursos públicos; nunca .env, SQL, código del servidor ni backups.
  for (const folder of ['css', 'js', 'img', 'fonts']) app.use('/' + folder, express.static(path.join(root, folder)));
  app.get('/manifest.webmanifest', (req, res) => res.type('application/manifest+json').sendFile(path.join(root, 'manifest.webmanifest')));
  app.get('/sw.js', (req, res) => res.type('application/javascript').sendFile(path.join(root, 'sw.js')));
  app.get('/icon.svg', (req, res) => res.type('image/svg+xml').sendFile(path.join(root, 'icon.svg')));
  const pages = ['index', 'tienda', 'login', 'registro', 'mi-cuenta', 'admin', 'contacto', 'migracion'];
  app.get('/', (req, res) => res.sendFile(path.join(root, 'index.html')));
  for (const page of pages) app.get('/' + page + '.html', (req, res) => res.sendFile(path.join(root, page + '.html')));
  app.use((err, req, res, next) => {
    if (!err.status && err.code !== '23505') console.error('Request failed:', err.message);
    res.status(err.code === '23505' ? 409 : err.status || 500).json({error: err.code === '23505' ? 'Ya existe una cuenta con ese email.' : err.status ? err.message : 'No se pudo guardar. Intentá nuevamente.'});
  });
  return app;
}
