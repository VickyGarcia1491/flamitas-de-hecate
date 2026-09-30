import {fail,text} from './security.js';
export const emptyFinance=()=>({start:null,opening:null,expenses:[],movements:[]});
export function validDate(d){return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;}
const cents=n=>Math.round(n*100);
function amount(n,zero=false){if(!Number.isFinite(n)||n<(zero?0:0.01)||n>100000000||Math.abs(n*100-cents(n))>0.00001)fail('Importe inválido. Usá hasta dos decimales.');}
export function validateFinance(data){
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Montevideo'});
 if(!data||!Array.isArray(data.expenses)||!Array.isArray(data.movements)||data.expenses.length>5000||data.movements.length>10000)fail('Formato de gastos inválido.');
 if(data.start!==null&&!validDate(data.start))fail('Fecha inicial inválida.');
 if(data.opening!==null)amount(data.opening,true);
 if((data.start===null)!==(data.opening===null))fail('Completá fecha y saldo inicial juntos.');
 for(const list of [data.expenses,data.movements]){const ids=new Set();for(const item of list){if(!item||typeof item.id!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(item.id)||ids.has(item.id))fail('Identificador repetido o inválido.');ids.add(item.id);}}
 for(const e of data.expenses){text(e.description,200);text(e.category,80);text(e.supplier||'',150,false);if(!validDate(e.date))fail('Fecha del gasto inválida.');amount(e.total);
 if(!Array.isArray(e.installments)||e.installments.length<1||e.installments.length>60)fail('Usá entre 1 y 60 cuotas.');
 let sum=0;for(const q of e.installments){if(!q||typeof q!=='object')fail('Cuota inválida.');amount(q.amount);sum+=cents(q.amount);if(!validDate(q.due)||q.due<e.date||q.paidAt!==null&&(!validDate(q.paidAt)||q.paidAt<e.date||q.paidAt>today))fail('Fecha de cuota o pago inválida.');}
 if(sum!==cents(e.total))fail('Las cuotas deben sumar el importe total.');
 }
 const orders=new Set();for(const m of data.movements){if(!['cobro','aporte','retiro','reintegro','devolucion'].includes(m.type)||(!validDate(m.date)||m.date>today))fail('Movimiento inválido.');amount(m.amount);text(m.description,200);
 if(m.orderId!=null){if(m.type!=='cobro'||!Number.isSafeInteger(m.orderId)||m.orderId<1||orders.has(m.orderId))fail('Este pedido ya tiene un cobro registrado.');orders.add(m.orderId);}
 }
}
export function financeSummary(data,asOf){
 if(!validDate(asOf))fail('Fecha de resumen inválida.');
 const range=d=>data.start&&d>=data.start&&d<=asOf;
 const sums={cobro:0,aporte:0,retiro:0,reintegro:0,devolucion:0};for(const m of data.movements)if(range(m.date))sums[m.type]+=cents(m.amount);
 let paid=0,pending=0,overdue=0,next30=0;const limit=new Date(asOf+'T12:00:00Z');limit.setUTCDate(limit.getUTCDate()+30);const until=limit.toISOString().slice(0,10);
 for(const e of data.expenses)if(e.date<=asOf)for(const q of e.installments){if(q.paidAt&&q.paidAt<=asOf){if(range(q.paidAt))paid+=cents(q.amount);}else{pending+=cents(q.amount);if(q.due<asOf)overdue+=cents(q.amount);if(q.due<=until)next30+=cents(q.amount);}}
 const configured=data.start!==null&&data.opening!==null&&asOf>=data.start;
 const net=sums.cobro-sums.devolucion-paid+sums.reintegro;
 const balance=configured?cents(data.opening)+net+sums.aporte-sums.retiro:null;
 return {configured,collected:sums.cobro/100,paid:paid/100,refunds:sums.devolucion/100,contributions:sums.aporte/100,withdrawals:sums.retiro/100,reimbursements:sums.reintegro/100,result:configured?net/100:null,balance:balance===null?null:balance/100,pending:pending/100,overdue:overdue/100,next30:next30/100,afterCommitments:balance===null?null:(balance-pending)/100};
}

// Se ejecuta dentro de la misma transacción que confirma o modifica el pedido.
export async function syncOrderPayments(client,previous,next){
 const before=new Map(previous.map(p=>[p.id,p]));
 const changes=next.filter(p=>{const old=before.get(p.id);return p.estado!=='Cancelado'&&(p.pago?.estado==='Pagado'||old?.pago?.estado==='Pagado')&&(!old||old.pago?.estado!==p.pago?.estado||old.total!==p.total)});
 if(!changes.length)return;
 const row=(await client.query('SELECT data FROM finance_state WHERE id=1 FOR UPDATE')).rows[0];
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Montevideo'});
 for(const order of changes){
  const index=row.data.movements.findIndex(m=>m.orderId===order.id);
  if(order.pago?.estado!=='Pagado'){if(index>=0)row.data.movements.splice(index,1);continue;}
  if(index>=0){row.data.movements[index].amount=order.total;continue;}
  if(order.total>0)row.data.movements.push({id:'order-payment-'+order.id,type:'cobro',description:'Cobro confirmado del pedido #'+order.id,date:today,amount:order.total,orderId:order.id});
 }
 validateFinance(row.data);
 await client.query('UPDATE finance_state SET data=$1,version=version+1 WHERE id=1',[JSON.stringify(row.data)]);
}
