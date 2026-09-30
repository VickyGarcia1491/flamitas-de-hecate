let finanzas=null, guardandoFinanzas=false;
const hoyFinanzas=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Montevideo'});
const dineroFinanzas=n=>n===null?'Sin configurar':new Intl.NumberFormat('es-UY',{style:'currency',currency:'UYU'}).format(n);
const campoFinanzas=(form,name)=>document.querySelector(form).elements.namedItem(name);
function iniciarFinanzas(){
 if(obtenerUsuarioActivo()?.rol!=='admin')return;
 document.querySelector('#fechaResumenFinanzas').value=hoyFinanzas();
 document.querySelector('#actualizarFinanzas').onclick=()=>leerFinanzas(true);
 document.querySelector('#fechaResumenFinanzas').onchange=()=>leerFinanzas(false);
 document.querySelector('#generarCuotas').onclick=prepararCuotas;
 document.querySelector('#limpiarGasto').onclick=()=>limpiarFormularioFinanzas('#formGasto');
 document.querySelector('#limpiarMovimiento').onclick=()=>limpiarFormularioFinanzas('#formMovimiento');
 campoFinanzas('#formGasto','mode').onchange=()=>{campoFinanzas('#formGasto','count').value=campoFinanzas('#formGasto','mode').value==='1'?1:2;};
 campoFinanzas('#formMovimiento','type').onchange=()=>{campoFinanzas('#formMovimiento','orderId').value='';campoFinanzas('#formMovimiento','orderId').disabled=campoFinanzas('#formMovimiento','type').value!=='cobro';};
 document.querySelector('#pedidoCobro').onchange=()=>{const p=datosServidor.pedidos.find(p=>String(p.id)===campoFinanzas('#formMovimiento','orderId').value);if(p){campoFinanzas('#formMovimiento','amount').value=p.total;campoFinanzas('#formMovimiento','description').value='Cobro pedido #'+p.id;}};
 document.querySelector('#formSaldoInicial').onsubmit=async event=>{event.preventDefault();if(!finanzas)return;const data=structuredClone(finanzas.data);data.start=campoFinanzas('#formSaldoInicial','start').value;data.opening=Number(campoFinanzas('#formSaldoInicial','opening').value);await guardarFinanzas(data);};
 document.querySelector('#formGasto').onsubmit=guardarGasto;
 document.querySelector('#formMovimiento').onsubmit=guardarMovimiento;
 limpiarFormularioFinanzas('#formGasto');limpiarFormularioFinanzas('#formMovimiento');leerFinanzas(false);
}
function limpiarFormularioFinanzas(selector){const form=document.querySelector(selector);form.reset();form.elements.namedItem('id').value='';form.elements.namedItem('date').value=hoyFinanzas();if(selector==='#formGasto'){form.elements.namedItem('firstDue').value=hoyFinanzas();document.querySelector('#cuotasGasto').replaceChildren();}else {form.elements.namedItem('orderId').disabled=false;}}
async function leerFinanzas(refresh){
 if(guardandoFinanzas)return;
 const message=document.querySelector('#mensajeFinanzas');
 try{if(refresh)await cargarDatosServidor();const result=await api('/api/admin/finance?date='+encodeURIComponent(document.querySelector('#fechaResumenFinanzas').value));finanzas=result;renderFinanzas();message.textContent='Datos actualizados.';}catch(e){message.textContent=e.message;}
}
async function guardarFinanzas(data){
 if(!finanzas||guardandoFinanzas)return false;guardandoFinanzas=true;
 const controls=[...document.querySelectorAll('#seccionGastos button,#seccionGastos input,#seccionGastos select')].map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);
 const message=document.querySelector('#mensajeFinanzas');message.textContent='Guardando…';
 let saved=false;
 try{const result=await api('/api/admin/finance','PUT',{version:finanzas.version,data});finanzas={...finanzas,data,version:result.version};saved=true;const current=await api('/api/admin/finance?date='+encodeURIComponent(document.querySelector('#fechaResumenFinanzas').value));finanzas=current;renderFinanzas();message.textContent='Guardado correctamente.';return true;}
 catch(e){message.textContent=(saved?'El cambio quedó guardado, pero no pudimos actualizar el resumen. ':'No pudimos confirmar el guardado. ')+e.message+' Tus campos siguen visibles. Actualizá los datos antes de repetir.';return false;}
 finally{guardandoFinanzas=false;controls.forEach(([el,disabled])=>el.disabled=disabled);}
}
function renderFinanzas(){
 const s=finanzas.summary;const cards=[['Cobros de ventas',s.collected],['Gastos pagados',s.paid],['Resultado de caja',s.result],['Dinero en caja registrado',s.balance],['Cuotas por pagar',s.pending],['Vencidas',s.overdue],['Vencidas y próximos 30 días',s.next30],['Saldo tras reservar todas las cuotas',s.afterCommitments],['Aportes',s.contributions],['Retiros',s.withdrawals],['Devoluciones a clientes',s.refunds],['Reintegros de proveedores',s.reimbursements]];
 document.querySelector('#resumenFinanzas').innerHTML=cards.map(([label,value])=>'<article class="dashboard-card"><span>'+label+'</span><strong class="'+(value<0?'saldo-negativo':'')+'">'+dineroFinanzas(value)+'</strong></article>').join('');
 if(!s.configured)document.querySelector('#resumenFinanzas').insertAdjacentHTML('afterbegin','<p class="finanzas-aviso">Configurá la fecha de inicio y el saldo inicial para calcular el dinero disponible. No uses el total de ventas si incluye pedidos sin cobrar.</p>');
 campoFinanzas('#formSaldoInicial','start').value=finanzas.data.start||hoyFinanzas();campoFinanzas('#formSaldoInicial','opening').value=finanzas.data.opening??'';
 const lista=document.querySelector('#listaGastos');lista.innerHTML=finanzas.data.expenses.length?'':'<p>No hay gastos registrados.</p>';
 for(const e of [...finanzas.data.expenses].sort((a,b)=>b.date.localeCompare(a.date))){const card=document.createElement('article');card.className='finanzas-item';card.innerHTML='<strong>'+escaparHTML(e.description)+'</strong><p>'+escaparHTML(e.category)+' · '+e.date+' · '+dineroFinanzas(e.total)+' · '+(e.installments.length===1?'Contado':e.installments.length+' cuotas')+'</p><ul>'+e.installments.map((q,i)=>'<li>Cuota '+(i+1)+' · '+q.due+' · '+dineroFinanzas(q.amount)+' · '+(q.paidAt?'Pagada el '+q.paidAt:'Pendiente')+'</li>').join('')+'</ul>';botonFinanzas(card,'Editar / registrar pago',()=>editarGasto(e));botonFinanzas(card,'Eliminar',async()=>{if(confirm('¿Eliminar este gasto y sus pagos del registro? El saldo se recalculará.')){const d=structuredClone(finanzas.data);d.expenses=d.expenses.filter(x=>x.id!==e.id);await guardarFinanzas(d);}});lista.append(card);}
 const movimientos=document.querySelector('#listaMovimientos');movimientos.innerHTML=finanzas.data.movements.length?'':'<p>No hay movimientos registrados.</p>';
 for(const m of [...finanzas.data.movements].sort((a,b)=>b.date.localeCompare(a.date))){const card=document.createElement('article');card.className='finanzas-item';card.innerHTML='<strong>'+escaparHTML(m.description)+'</strong><p>'+m.date+' · '+escaparHTML(m.type)+' · '+dineroFinanzas(m.amount)+'</p>';botonFinanzas(card,'Editar',()=>editarMovimiento(m));botonFinanzas(card,'Eliminar',async()=>{if(confirm('¿Eliminar este movimiento? El saldo se recalculará.')){const d=structuredClone(finanzas.data);d.movements=d.movements.filter(x=>x.id!==m.id);await guardarFinanzas(d);}});movimientos.append(card);}
 const select=campoFinanzas('#formMovimiento','orderId');const previous=select.value;select.innerHTML='<option value="">Sin vincular / cobro externo</option>'+datosServidor.pedidos.filter(p=>p.pago?.estado==='Pagado'&&p.estado!=='Cancelado').map(p=>'<option value="'+p.id+'">Pedido #'+p.id+' · '+dineroFinanzas(p.total)+(finanzas.data.movements.some(m=>m.orderId===p.id)?' (registrado)':'')+'</option>').join('');select.value=previous;
}
function botonFinanzas(parent,label,callback){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=callback;parent.append(b);}
function pintarCuotas(cuotas){document.querySelector('#cuotasGasto').innerHTML=cuotas.map((q,i)=>'<fieldset><legend>Cuota '+(i+1)+'</legend><label>Vencimiento<input type="date" data-cuota="due" value="'+q.due+'" required></label><label>Importe UYU<input type="number" min="0.01" step="0.01" data-cuota="amount" value="'+q.amount+'" required></label><label>Fecha de pago (vacía si pendiente)<input type="date" data-cuota="paidAt" value="'+(q.paidAt||'')+'" max="'+hoyFinanzas()+'"></label></fieldset>').join('');}
function prepararCuotas(){
 const form=document.querySelector('#formGasto');const total=Math.round(Number(form.elements.total.value)*100);const count=form.elements.mode.value==='1'?1:Number(form.elements.count.value);const first=form.elements.firstDue.value;
 if(!Number.isSafeInteger(total)||total<1||!Number.isInteger(count)||count<1||count>60||total<count||!/^\d{4}-\d{2}-\d{2}$/.test(first)){document.querySelector('#mensajeFinanzas').textContent='Completá total, cantidad de cuotas y primer vencimiento.';return;}
 if(document.querySelector('#cuotasGasto fieldset')&&!confirm('¿Reemplazar las cuotas del formulario? Se borrarán las fechas de pago cargadas en este formulario.'))return;
 const [year,month,day]=first.split('-').map(Number);pintarCuotas(Array.from({length:count},(_,i)=>{const d=new Date(Date.UTC(year,month-1+i,1));const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return {due:d.toISOString().slice(0,10),amount:(Math.floor(total/count)+(i<total%count?1:0))/100,paidAt:null};}));
}
async function guardarGasto(event){event.preventDefault();if(!finanzas)return;const f=event.target;const installments=[...document.querySelectorAll('#cuotasGasto fieldset')].map(row=>({due:row.querySelector('[data-cuota=due]').value,amount:Number(row.querySelector('[data-cuota=amount]').value),paidAt:row.querySelector('[data-cuota=paidAt]').value||null}));if(!installments.length){document.querySelector('#mensajeFinanzas').textContent='Tocá Preparar cuotas antes de guardar.';return;}const e={id:f.elements.id.value||crypto.randomUUID(),description:f.elements.description.value,category:f.elements.category.value,supplier:f.elements.supplier.value,date:f.elements.date.value,total:Number(f.elements.total.value),installments};const data=structuredClone(finanzas.data);const pos=data.expenses.findIndex(x=>x.id===e.id);if(pos<0)data.expenses.push(e);else data.expenses[pos]=e;if(await guardarFinanzas(data))limpiarFormularioFinanzas('#formGasto');}
function editarGasto(e){const f=document.querySelector('#formGasto');for(const key of ['id','description','category','supplier','date','total'])f.elements.namedItem(key).value=e[key];f.elements.mode.value=e.installments.length===1?'1':'cuotas';f.elements.count.value=e.installments.length;f.elements.firstDue.value=e.installments[0].due;pintarCuotas(e.installments);f.closest('details').open=true;f.scrollIntoView?.({block:'start'});}
async function guardarMovimiento(event){event.preventDefault();if(!finanzas)return;const f=event.target;const m={id:f.elements.id.value||crypto.randomUUID(),type:f.elements.type.value,description:f.elements.description.value,date:f.elements.date.value,amount:Number(f.elements.amount.value),orderId:f.elements.type.value==='cobro'&&f.elements.orderId.value?Number(f.elements.orderId.value):null};const data=structuredClone(finanzas.data);const pos=data.movements.findIndex(x=>x.id===m.id);if(pos<0)data.movements.push(m);else data.movements[pos]=m;if(await guardarFinanzas(data))limpiarFormularioFinanzas('#formMovimiento');}
function editarMovimiento(m){const f=document.querySelector('#formMovimiento');for(const key of ['id','type','description','date','amount'])f.elements.namedItem(key).value=m[key];f.elements.orderId.value=m.orderId||'';f.elements.orderId.disabled=m.type!=='cobro';f.closest('details').open=true;f.scrollIntoView?.({block:'start'});}
