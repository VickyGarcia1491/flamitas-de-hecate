import {imageHash,publicProducts,preserveProductImages,lightStateSql,createImageReader} from './product-images.js';
import {validateFinance, financeSummary, validDate, syncOrderPayments, auditFinance} from './finance.js';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { hashPassword, verifyPassword, tokenHash, newToken, fail, text, email, password, validateTree } from './security.js';
import { emptyState, validateState, checkout, reconcileOrderStock, applyProductChanges } from './business.js';
import {initializePush, createPushService, validateSubscription} from './push.js';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function initialize(db, config) {
  await db.query(await readFile(new URL('schema.sql', import.meta.url), 'utf8'));
  await initializePush(db);
  const products = JSON.parse(await readFile(new URL('seed.json', import.meta.url), 'utf8'));
  await db.query('INSERT INTO business_state(id,data) VALUES(1,$1) ON CONFLICT DO NOTHING', [JSON.stringify(emptyState(products))]);
  const admin = await db.query("SELECT id FROM users WHERE rol='admin' LIMIT 1");
  if (!admin.rows.length) {
    const address = email(config.ADMIN_EMAIL); const secret = password(config.ADMIN_PASSWORD);
    await db.query("INSERT INTO users(email,nombre,password_hash,rol) VALUES($1,'Administradora Flamitas',$2,'admin') ON CONFLICT DO NOTHING", [address, await hashPassword(secret)]);
  }
}
export function createApp(db, config = {}, dependencies = {}) {
  const app = express();
  const readProductImage = createImageReader(db);
  const push = createPushService(db, dependencies.sendPush);
  app.locals.deliverPush = () => push.deliver().catch(() => console.error('No se pudo procesar la cola de notificaciones.'));
  app.set('trust proxy', 1);
  app.use(helmet({contentSecurityPolicy: {directives: {"script-src": ["'self'"], "img-src": ["'self'", 'data:'], "style-src": ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], "font-src": ["'self'", 'https://fonts.gstatic.com'], "upgrade-insecure-requests": config.NODE_ENV === 'production' ? [] : null}}}));
  app.use('/api', rateLimit({windowMs: 60000, limit: 180, message: {error: 'Demasiadas solicitudes. Esperá un momento.'}}));
  app.use(express.json({limit: '25mb'}));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) && req.get('X-Flamitas') !== '1') return res.status(403).json({error: 'Solicitud no permitida.'});
    next();
  });
  app.get('/api/product-images/:id', async(req,res)=>{
    if(!/^\d+$/.test(req.params.id))return res.sendStatus(404);
    const image=await readProductImage(req.params.id);
    const match=/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(image||'');
    if(!match)return res.sendStatus(404);
    const hash=imageHash(image);
    if(req.query.v!==hash)return res.sendStatus(404);
    res.set('Cache-Control','public, max-age=31536000, immutable');
    res.type(match[1]).send(Buffer.from(match[2],'base64'));
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
  app.get('/api/admin/push/key', admin, async (req,res) => res.json({publicKey:await push.publicKey()}));
  app.post('/api/admin/push/subscription', admin, async (req,res) => {
    const subscription=validateSubscription(req.body);
    const count=(await db.query('SELECT count(*)::int AS count FROM push_subscriptions WHERE user_id=$1',[req.user.id])).rows[0].count;
    const existing=(await db.query('SELECT endpoint FROM push_subscriptions WHERE endpoint=$1',[subscription.endpoint])).rows[0];
    if (!existing && count>=20) fail('Llegaste al máximo de dispositivos. Desactivá uno antes de agregar otro.');
    await db.query('INSERT INTO push_subscriptions(endpoint,user_id,session_hash,subscription) VALUES($1,$2,$3,$4) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,session_hash=EXCLUDED.session_hash,subscription=EXCLUDED.subscription',[subscription.endpoint,req.user.id,req.sessionHash,JSON.stringify(subscription)]);
    res.json({ok:true});
  });
  app.post('/api/admin/push/unsubscribe', admin, async (req,res) => {
    await db.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2',[text(req.body.endpoint,2048),req.user.id]);
    res.json({ok:true});
  });
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
    if (req.sessionHash) await db.query('DELETE FROM push_subscriptions WHERE session_hash=$1',[req.sessionHash]);
    if (req.sessionHash) await db.query('DELETE FROM sessions WHERE token_hash=$1', [req.sessionHash]);
    res.clearCookie('flamitas_session', {path: '/'}).json({ok: true});
  });
  app.get('/api/bootstrap', async (req, res) => {
    const {data, version} = (await db.query(lightStateSql)).rows[0];
    res.json({usuario: req.user || null, version, productos: data.productos, esencias: data.esencias, esenciasCatalogo: data.esenciasCatalogo, pedidos: req.user?.rol === 'admin' ? data.pedidos : data.pedidos.filter(p => req.user && p.cliente.email === req.user.email), vistos: req.user?.rol === 'admin' ? data.vistos : []});
  });
  app.put(['/api/admin/state', '/api/admin/state/changes'], admin, async (req, res) => {
    res.json(await transact(async client => {
      const current = (await client.query('SELECT data,version FROM business_state WHERE id=1 FOR UPDATE')).rows[0];
      if (current.version !== req.body.version) fail('Los datos cambiaron en otra sesión. Recargá la página y repetí el cambio.', 409);
      // Conservar campos introducidos por otras versiones que un cliente antiguo no envía.
      if (!req.body.data || typeof req.body.data !== 'object' || Array.isArray(req.body.data)) fail('Formato de datos inválido.');
      const data = structuredClone({...current.data, ...req.body.data});
      if (req.body.productChanges !== undefined) {
        if (Object.hasOwn(req.body.data, 'productos')) fail('No mezcles catálogo completo y cambios parciales.');
        data.productos = applyProductChanges(current.data.productos, req.body.productChanges);
      }
      preserveProductImages(data.productos,current.data.productos);
      validateState(data);
      const stockChanged = reconcileOrderStock(current.data, data);
      await syncOrderPayments(client,current.data.pedidos,data.pedidos,req.user);
      validateState(data);
      const saved = (await client.query('UPDATE business_state SET data=$1,version=version+1 WHERE id=1 RETURNING version', [JSON.stringify(data)])).rows[0];
      return {...saved, ...(stockChanged ? {productos: publicProducts(data.productos), esencias: data.esencias} : {})};
    }));
  });
  app.post('/api/orders', auth, async (req, res) => {
    const key = text(req.body.requestId, 100);
    const order = await transact(async client => {
      const state = (await client.query('SELECT data FROM business_state WHERE id=1 FOR UPDATE')).rows[0].data;
      const previous = state.pedidos.find(p => p.requestId === key && p.cliente.email === req.user.email);
      if (previous) return previous;
      const id = Number((await client.query("SELECT nextval('order_ids') AS id")).rows[0].id);
      const order = checkout(state, req.body, req.user, id); order.requestId = key;
      await client.query('UPDATE business_state SET data=$1,version=version+1 WHERE id=1', [JSON.stringify(state)]);
      await client.query("INSERT INTO push_jobs(order_id,endpoint) SELECT $1,s.endpoint FROM push_subscriptions s JOIN users u ON u.id=s.user_id WHERE u.rol='admin' ON CONFLICT DO NOTHING",[id]);
      return order;
    });
    await app.locals.deliverPush();
    res.status(201).json(order);
  });
  // Los comprobantes nunca forman parte del catálogo público ni del documento de stock.
  app.get('/api/receipts', auth, async(req,res)=>{
    const rows=(await db.query('SELECT order_id,name,uploaded_at,reviewed_at FROM payment_receipts'+(req.user.rol==='admin'?'':' WHERE user_id=$1'),req.user.rol==='admin'?[]:[req.user.id])).rows;
    const state=(await db.query('SELECT data FROM business_state WHERE id=1')).rows[0].data;
    res.json(rows.filter(r=>state.pedidos.some(p=>String(p.id)===String(r.order_id) && (req.user.rol==='admin'||p.cliente.email===req.user.email))));
  });
  app.post('/api/orders/:id/receipt',auth,async(req,res)=>{
    const {name,mime,content}=req.body;
    if(typeof content!=='string'||content.length>6990508||/[^A-Za-z0-9+/=]/.test(content))fail('Archivo inválido o mayor a 5 MB.');
    const bytes=Buffer.from(content,'base64');
    if(bytes.toString('base64')!==content)fail('Archivo inválido.');
    const detected=bytes.subarray(0,5).toString()==='%PDF-'?'application/pdf':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':null;
    if(!detected||detected!==mime||bytes.length>5*1024*1024)fail('Usá un comprobante PDF, JPG o PNG de hasta 5 MB.');
    const filename=text(name,180);
    await transact(async client=>{
      const state=(await client.query('SELECT data FROM business_state WHERE id=1 FOR UPDATE')).rows[0].data;
      const order=state.pedidos.find(p=>String(p.id)===req.params.id&&p.cliente.email===req.user.email);
      if(!order)fail('Pedido no disponible.',404);
      if(order.pago?.medio!=='Transferencia bancaria'||order.pago?.estado==='Pagado'||order.estado==='Cancelado')fail('Este pedido no admite comprobantes.',409);
      await client.query('INSERT INTO payment_receipts(order_id,user_id,name,mime,content) VALUES($1,$2,$3,$4,$5) ON CONFLICT(order_id) DO UPDATE SET name=EXCLUDED.name,mime=EXCLUDED.mime,content=EXCLUDED.content,uploaded_at=now(),reviewed_at=NULL,reviewed_by=NULL',[order.id,req.user.id,filename,detected,content]);
    });res.status(201).json({ok:true});
  });
  app.get('/api/orders/:id/receipt',auth,async(req,res)=>{
    if(!/^\d+$/.test(req.params.id))fail('Comprobante no disponible.',404);
    const receipt=(await db.query('SELECT * FROM payment_receipts WHERE order_id=$1',[req.params.id])).rows[0];
    const state=(await db.query('SELECT data FROM business_state WHERE id=1')).rows[0].data;
    const order=state.pedidos.find(p=>String(p.id)===req.params.id);
    if(!receipt||!order||(req.user.rol!=='admin'&&(String(receipt.user_id)!==String(req.user.id)||order.cliente.email!==req.user.email)))fail('Comprobante no disponible.',404);
    const ext=receipt.mime==='application/pdf'?'pdf':receipt.mime==='image/png'?'png':'jpg';
    res.set('Content-Disposition','attachment; filename="comprobante-'+order.id+'.'+ext+'"');res.type(receipt.mime).send(Buffer.from(receipt.content,'base64'));
  });
  app.post('/api/orders/:id/receipt/confirm',admin,async(req,res)=>{
    await transact(async client=>{
      const current=(await client.query('SELECT data FROM business_state WHERE id=1 FOR UPDATE')).rows[0];
      const receipt=(await client.query('SELECT uploaded_at FROM payment_receipts WHERE order_id=$1',[req.params.id])).rows[0];
      if(!receipt)fail('Comprobante no disponible.',404);
      if(new Date(receipt.uploaded_at).toISOString()!==req.body.uploadedAt)fail('El comprobante cambió. Actualizá la lista y revisalo nuevamente.',409);
      const order=current.data.pedidos.find(p=>String(p.id)===req.params.id);
      if(!order||order.estado==='Cancelado'||order.pago?.medio!=='Transferencia bancaria')fail('El pedido no puede confirmarse.',409);
      const previous=structuredClone(current.data.pedidos);
      order.pago.estado='Pagado';
      await syncOrderPayments(client,previous,current.data.pedidos,req.user);
      await client.query('UPDATE business_state SET data=$1,version=version+1 WHERE id=1',[JSON.stringify(current.data)]);
      await client.query('UPDATE payment_receipts SET reviewed_at=now(),reviewed_by=$1 WHERE order_id=$2',[req.user.id,req.params.id]);
    });res.json({ok:true});
  });
  app.post('/api/contact', rateLimit({windowMs: 3600000, limit: 15, message: {error: 'Demasiadas consultas. Intentá más tarde.'}}), async (req, res) => {
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
    const state = {productos: input.productos, esencias: input.esencias || {mediana: {}, chica: {}}, pedidos: input.pedidos || [], vistos: input.vistos || [], ...(input.esenciasCatalogo !== undefined ? {esenciasCatalogo: input.esenciasCatalogo} : {})};
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
  app.get('/api/admin/receivables',admin,async(req,res)=>{
   const state=(await db.query('SELECT data FROM business_state WHERE id=1')).rows[0].data;
   const pending=state.pedidos.filter(p=>p.estado!=='Cancelado'&&p.pago?.estado!=='Pagado');
   const paid=state.pedidos.filter(p=>p.estado!=='Cancelado'&&p.pago?.estado==='Pagado');
   const finance=(await db.query('SELECT data FROM finance_state WHERE id=1')).rows[0].data;
   const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Montevideo'});
   res.json({pending:pending.map(p=>({id:p.id,cliente:p.cliente.nombre,date:p.fechaISO||'',total:p.total,medio:p.pago?.medio||'Sin definir'})),toCollect:Math.round(pending.reduce((s,p)=>s+p.total,0)*100)/100,cash:financeSummary(finance,today).balance,unregisteredPaid:paid.filter(p=>!finance.movements.some(m=>m.orderId===p.id)).length});
  });
  app.post('/api/admin/orders/:id/payment',admin,async(req,res)=>{
   await transact(async client=>{
    const current=(await client.query('SELECT data FROM business_state WHERE id=1 FOR UPDATE')).rows[0];
    const order=current.data.pedidos.find(p=>String(p.id)===req.params.id);
    if(!order||order.estado==='Cancelado')fail('Pedido no disponible para cobrar.',409);
    if(req.body.total!==order.total)fail('El importe cambió. Actualizá y revisá el pedido.',409);
    const previous=structuredClone(current.data.pedidos);order.pago={...order.pago,estado:'Pagado'};
    await syncOrderPayments(client,previous,current.data.pedidos,req.user);
    await client.query('UPDATE business_state SET data=$1,version=version+1 WHERE id=1',[JSON.stringify(current.data)]);
    await client.query('UPDATE payment_receipts SET reviewed_at=now(),reviewed_by=$1 WHERE order_id=$2',[req.user.id,order.id]);
   });res.json({ok:true});
  });
  app.get('/api/admin/finance',admin,async(req,res)=>{
   const current=(await db.query('SELECT data,version FROM finance_state WHERE id=1')).rows[0];
   const asOf=req.query.date||new Date().toLocaleDateString('en-CA',{timeZone:'America/Montevideo'});
   if(!validDate(asOf))fail('Fecha inválida.');
   const history=(await db.query('SELECT id,at,actor,change FROM finance_audit ORDER BY id DESC')).rows;
   const business=(await db.query('SELECT data FROM business_state WHERE id=1')).rows[0].data;
   const toCollect=Math.round(business.pedidos.filter(p=>p.estado!=='Cancelado'&&p.pago?.estado!=='Pagado').reduce((n,p)=>n+p.total,0)*100)/100;
   res.json({...current,history,toCollect,summary:financeSummary(current.data,asOf)});
  });
  app.put('/api/admin/finance',admin,async(req,res)=>{
   validateFinance(req.body.data);
   res.json(await transact(async client=>{
    const current=(await client.query('SELECT data,version FROM finance_state WHERE id=1 FOR UPDATE')).rows[0];
    if(current.version!==req.body.version)fail('Los gastos cambiaron en otra sesión. Actualizá antes de volver a guardar.',409);
    const business=(await client.query('SELECT data FROM business_state WHERE id=1')).rows[0].data;
    for(const movement of req.body.data.movements){
     if(movement.orderId==null)continue;
     const old=current.data.movements.find(m=>m.id===movement.id);
     if(old&&old.orderId===movement.orderId&&old.amount===movement.amount)continue;
     const order=business.pedidos.find(p=>p.id===movement.orderId);
     if(!order||order.estado==='Cancelado'||order.pago?.estado!=='Pagado'||Math.round(order.total*100)!==Math.round(movement.amount*100))fail('Vinculá únicamente un pedido pagado, por su importe total. Para ajustes usá un movimiento separado.');
    }
    await auditFinance(client,current.data,req.body.data,req.user);
    const result=(await client.query('UPDATE finance_state SET data=$1,version=version+1 WHERE id=1 RETURNING version',[JSON.stringify(req.body.data)])).rows[0];
    return result;
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
