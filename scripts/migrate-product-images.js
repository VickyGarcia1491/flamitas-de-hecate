
import pg from 'pg';
import {stat} from 'node:fs/promises';
import {migrateProductImages} from '../server/product-images.js';
const args=process.argv.slice(2),backup=args[args.indexOf('--backup')+1];
if(!args.includes('--restore-verified')||!args.includes('--backup')||!backup)throw Error('Primero restaurá y verificá un respaldo completo. Uso: --backup ruta.dump --restore-verified');
if(!(await stat(backup)).isFile()||(await stat(backup)).size===0)throw Error('El respaldo no existe o está vacío.');
if(!process.env.DATABASE_URL)throw Error('Falta DATABASE_URL; no la publiques ni la guardes en Git.');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000});
const client=await pool.connect();
try {await client.query('BEGIN');const count=await migrateProductImages(client);await client.query('COMMIT');console.log('Fotos separadas y verificadas:',count);}
catch(e){await client.query('ROLLBACK').catch(()=>{});console.error('Migración cancelada:',e.code||e.name);process.exitCode=1;}
finally{client.release();await pool.end();}
