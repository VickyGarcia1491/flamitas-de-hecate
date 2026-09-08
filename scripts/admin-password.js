import pg from 'pg';
import { email, password, hashPassword } from '../server/security.js';
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.');
const address = email(process.env.ADMIN_EMAIL);
const hash = await hashPassword(password(process.env.ADMIN_PASSWORD));
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});
const client = await pool.connect();
try {
 await client.query('BEGIN');
 const result = await client.query("UPDATE users SET password_hash=$1 WHERE email=$2 AND rol='admin' RETURNING id",[hash,address]);
 if (!result.rows.length) throw new Error('No existe esa cuenta administradora.');
 await client.query('DELETE FROM sessions WHERE user_id=$1',[result.rows[0].id]);
 await client.query('COMMIT'); console.log('Contraseña actualizada. Las sesiones anteriores se cerraron.');
} catch(error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
