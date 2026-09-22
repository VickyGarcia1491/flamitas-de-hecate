import webpush from 'web-push';
import {fail} from './security.js';

export async function initializePush(db) {
 const keys = webpush.generateVAPIDKeys();
 await db.query('INSERT INTO push_config(id,keys) VALUES(1,$1) ON CONFLICT DO NOTHING',[JSON.stringify(keys)]);
}
export function validateSubscription(input) {
 let url;
 try { url = new URL(input?.endpoint); } catch { fail('Suscripción inválida.'); }
 // Solo servicios de envío conocidos: no permitir que el servidor consulte URLs arbitrarias.
 const hosts=['fcm.googleapis.com','android.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'];
 if (url.protocol!=='https:' || !hosts.includes(url.hostname) || url.port || url.username || url.password || url.hash || url.href.length>2048) fail('Servicio de notificaciones no permitido.');
 if (!/^[A-Za-z0-9_-]{87}=?$/.test(input.keys?.p256dh || '') || !/^[A-Za-z0-9_-]{22}={0,2}$/.test(input.keys?.auth || '')) fail('Claves de notificación inválidas.');
 return {endpoint:url.href,keys:{p256dh:input.keys.p256dh,auth:input.keys.auth}};
}
export function createPushService(db, send = (...args) => webpush.sendNotification(...args)) {
 let working=false;
 return {
  async publicKey() { return (await db.query('SELECT keys FROM push_config WHERE id=1')).rows[0].keys.publicKey; },
  async deliver() {
   if (working) return;
   working=true;
   try {
    const keys=(await db.query('SELECT keys FROM push_config WHERE id=1')).rows[0]?.keys;
    if (!keys) return;
    // Reclamo atómico y plazo de reintento: no perder avisos si el proceso reinicia.
    const jobs=(await db.query(`UPDATE push_jobs SET attempts=attempts+1,next_attempt=now()+interval '2 minutes'
     WHERE id IN (SELECT id FROM push_jobs WHERE next_attempt<=now() AND attempts<5 ORDER BY id LIMIT 20 FOR UPDATE SKIP LOCKED)
     RETURNING id,order_id,endpoint`)).rows;
    await Promise.all(jobs.map(async job => {
     const row=(await db.query("SELECT s.subscription FROM push_subscriptions s JOIN users u ON u.id=s.user_id WHERE s.endpoint=$1 AND u.rol='admin'",[job.endpoint])).rows[0];
     if (!row) { await db.query('DELETE FROM push_jobs WHERE id=$1',[job.id]); return; }
     try {
      await send(row.subscription, JSON.stringify({title:'Nuevo pedido en Flamitas',body:'Tenés un pedido nuevo. Tocá para verlo.',orderId:Number(job.order_id)}), {
       vapidDetails:{subject:'mailto:flamitasdehecate@gmail.com',publicKey:keys.publicKey,privateKey:keys.privateKey},TTL:86400,timeout:4000
      });
      await db.query('DELETE FROM push_jobs WHERE id=$1',[job.id]);
     } catch(error) {
      if ([404,410].includes(error.statusCode)) await db.query('DELETE FROM push_subscriptions WHERE endpoint=$1',[job.endpoint]);
      // Los fallos temporales permanecen en la cola; nunca afectan al pedido guardado.
     }
    }));
   } finally {working=false;}
  }
 };
}
