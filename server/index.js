import pg from 'pg';
import { createApp, initialize } from './app.js';
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL. Seguí la guía DEPLOY_RENDER.md.');
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, max: 10});
await initialize(pool, process.env);
const server = createApp(pool, process.env).listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Flamitas está lista.'));
process.on('SIGTERM', () => server.close(() => pool.end()));
