// Servidor completo de pruebas, aislado de Render y Supabase.
import { PGlite } from '@electric-sql/pglite';
import { createApp, initialize } from '../server/app.js';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
const directory = fileURLToPath(new URL('../.local-dev/', import.meta.url));
await mkdir(directory, {recursive:true});
const pg = new PGlite(directory);
let tail = Promise.resolve();
async function lock() { const previous=tail; let release; tail=new Promise(resolve=>release=resolve); await previous; return release; }
const query=(sql,args)=>args ? pg.query(sql,args) : sql.includes('CREATE TABLE') ? pg.exec(sql) : pg.query(sql);
const db={query:async(sql,args)=>{const release=await lock();try{return await query(sql,args)}finally{release()}},connect:async()=>{const release=await lock();return {query,release}}};
await initialize(db,{ADMIN_EMAIL:'admin@flamitas.test',ADMIN_PASSWORD:'Flamitas-local-2026!'});
const app=createApp(db,{NODE_ENV:'development'},{sendPush:async()=>{}});
const server=app.listen(4174,'127.0.0.1',()=>console.log('PRUEBAS LOCALES: http://127.0.0.1:4174 | Admin: admin@flamitas.test | Clave: Flamitas-local-2026! | Datos de ejemplo, sin conexión a producción.'));
async function stop(){server.close(async()=>{await pg.close();process.exit(0)})}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
server.on('error',async error=>{console.error(error.message);await pg.close();process.exitCode=1});
