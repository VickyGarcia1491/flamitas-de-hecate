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
 iniciarVistaFinanzas();limpiarFormularioFinanzas('#formGasto');limpiarFormularioFinanzas('#formMovimiento');leerFinanzas(false);
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
 renderPanelFinanzas();
 campoFinanzas('#formSaldoInicial','start').value=finanzas.data.start||hoyFinanzas();campoFinanzas('#formSaldoInicial','opening').value=finanzas.data.opening??'';
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
async function guardarGasto(event){event.preventDefault();if(!finanzas)return;const f=event.target;const installments=[...document.querySelectorAll('#cuotasGasto fieldset')].map(row=>({due:row.querySelector('[data-cuota=due]').value,amount:Number(row.querySelector('[data-cuota=amount]').value),paidAt:row.querySelector('[data-cuota=paidAt]').value||null}));if(!installments.length){document.querySelector('#mensajeFinanzas').textContent='Tocá Preparar cuotas antes de guardar.';return;}const e={id:f.elements.id.value||crypto.randomUUID(),description:f.elements.description.value,category:f.elements.category.value,supplier:f.elements.supplier.value,date:f.elements.date.value,total:Number(f.elements.total.value),installments};const data=structuredClone(finanzas.data);const pos=data.expenses.findIndex(x=>x.id===e.id);if(pos<0)data.expenses.push(e);else data.expenses[pos]=e;if(await guardarFinanzas(data)){limpiarFormularioFinanzas('#formGasto');document.querySelector('#editorGasto').open=false;}}
function editarGasto(e){const f=document.querySelector('#formGasto');for(const key of ['id','description','category','supplier','date','total'])f.elements.namedItem(key).value=e[key];f.elements.mode.value=e.installments.length===1?'1':'cuotas';f.elements.count.value=e.installments.length;f.elements.firstDue.value=e.installments[0].due;pintarCuotas(e.installments);f.closest('details').open=true;mostrarPestanaFinanzas(f.id==='formGasto'?'1':'3');f.scrollIntoView?.({block:'start'});}
async function guardarMovimiento(event){event.preventDefault();if(!finanzas)return;const f=event.target;const m={id:f.elements.id.value||crypto.randomUUID(),type:f.elements.type.value,description:f.elements.description.value,date:f.elements.date.value,amount:Number(f.elements.amount.value),orderId:f.elements.type.value==='cobro'&&f.elements.orderId.value?Number(f.elements.orderId.value):null};const data=structuredClone(finanzas.data);const pos=data.movements.findIndex(x=>x.id===m.id);if(pos<0)data.movements.push(m);else data.movements[pos]=m;if(await guardarFinanzas(data))limpiarFormularioFinanzas('#formMovimiento');}
function editarMovimiento(m){const f=document.querySelector('#formMovimiento');for(const key of ['id','type','description','date','amount'])f.elements.namedItem(key).value=m[key];f.elements.orderId.value=m.orderId||'';f.elements.orderId.disabled=m.type!=='cobro';f.closest('details').open=true;f.scrollIntoView?.({block:'start'});}

function mostrarPestanaFinanzas(id){document.querySelectorAll('[data-fin-panel]').forEach(p=>p.hidden=p.dataset.finPanel!==String(id));document.querySelectorAll('[data-fin-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.finTab===String(id))));}
function iniciarVistaFinanzas(){
 document.querySelectorAll('[data-fin-tab]').forEach(b=>b.onclick=()=>mostrarPestanaFinanzas(b.dataset.finTab));
 for(const id of ['mesMovimientos','tipoMovimientos'])document.getElementById(id).onchange=()=>renderPanelFinanzas();
 document.getElementById('mesMovimientos').value=hoyFinanzas().slice(0,7);document.getElementById('mesExportacion').value=hoyFinanzas().slice(0,7);
 document.getElementById('exportarFinanzas').onclick=exportarResumenFinanzas;
}
function tablaFinanzas(target,headers){const container=document.getElementById(target);container.classList.add('finanzas-tabla');container.innerHTML='<table><thead><tr>'+headers.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody></tbody></table>';return container.querySelector('tbody');}
function filaFinanzas(table,values){const tr=document.createElement('tr');for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}table.append(tr);return tr;}
function estadoCuota(q){return q.paidAt?'Pagada':q.due<hoyFinanzas()?'Vencida':'Próxima';}
function movimientosFinanzas(){
 const rows=finanzas.data.movements.map(m=>({...m,status:m.cancelled?'Anulado':'Registrado'}));
 for(const e of finanzas.data.expenses)for(const [i,q] of e.installments.entries())if(q.paidAt)rows.push({id:e.id+'-'+i,type:'gasto',date:q.paidAt,description:e.description+' · cuota '+(i+1),amount:q.amount,status:'Pagado',category:e.category});
 return rows.sort((a,b)=>b.date.localeCompare(a.date));
}
function renderPanelFinanzas(){
 const s=finanzas.summary;const cards=[['Dinero en caja',s.balance],['Dinero por cobrar · actual',finanzas.toCollect??null],['Cuotas vencidas y próximos 30 días',s.next30],['Saldo después de esos compromisos',s.balance===null?null:Math.round((s.balance-s.next30)*100)/100]];
 document.getElementById('resumenFinanzas').innerHTML=cards.map(([label,value])=>'<article class="dashboard-card"><span>'+label+'</span><strong class="'+(value<0?'saldo-negativo':'')+'">'+dineroFinanzas(value)+'</strong></article>').join('');
 document.getElementById('detalleFinanzas').textContent=(!s.configured?'Configurá el saldo inicial para calcular el disponible. ':'')+'Cobros: '+dineroFinanzas(s.collected)+' · Gastos pagados: '+dineroFinanzas(s.paid)+' · Resultado de caja: '+dineroFinanzas(s.result)+' · Total de cuotas pendientes: '+dineroFinanzas(s.pending)+'. El dinero por cobrar aún no está incluido en caja.';
 const gastos=tablaFinanzas('listaGastos',['Fecha','Concepto / categoría','Importe','Estado','Acciones']);
 for(const e of [...finanzas.data.expenses].sort((a,b)=>b.date.localeCompare(a.date))){const status=e.cancelled?'Anulado':e.installments.every(q=>q.paidAt)?'Pagado':e.installments.some(q=>q.paidAt)?'Pago parcial':'Pendiente';const row=filaFinanzas(gastos,[e.date,e.description+' · '+e.category,dineroFinanzas(e.total),status,'']);if(e.cancelled){row.cells[4].textContent=e.cancelled.reason;}else{botonFinanzas(row.cells[4],'Editar',()=>editarGasto(e));botonFinanzas(row.cells[4],'Anular',()=>anularFinanzas('expenses',e));}}
 if(!gastos.children.length)filaFinanzas(gastos,['Sin gastos registrados','','','','']);
 const cuotas=tablaFinanzas('listaCuotasFinanzas',['Vencimiento','Gasto / cuota','Importe','Estado','Acción']);
 const schedule=finanzas.data.expenses.flatMap(e=>e.installments.map((q,i)=>({e,q,i}))).filter(x=>!x.e.cancelled||x.q.paidAt).sort((a,b)=>a.q.due.localeCompare(b.q.due));
 for(const {e,q,i} of schedule){const status=estadoCuota(q);const row=filaFinanzas(cuotas,[q.due,e.description+' · '+(i+1)+'/'+e.installments.length,dineroFinanzas(q.amount),status,q.paidAt?'Pagada el '+q.paidAt:'']);row.cells[3].innerHTML='<span class="fin-estado '+status.toLowerCase()+'">'+status+'</span>';if(!q.paidAt)botonFinanzas(row.cells[4],'Registrar pago',()=>pagarCuotaFinanzas(e.id,i));}
 if(!cuotas.children.length)filaFinanzas(cuotas,['Sin vencimientos','','','','']);
 const month=document.getElementById('mesMovimientos').value;const type=document.getElementById('tipoMovimientos').value;const table=tablaFinanzas('listaMovimientos',['Fecha','Concepto','Tipo','Importe','Estado / acciones']);
 for(const m of movimientosFinanzas().filter(m=>(!month||m.date.startsWith(month))&&(!type||m.type===type))){const row=filaFinanzas(table,[m.date,m.description,m.type,dineroFinanzas(m.amount),m.status]);if(m.type!=='gasto'&&!m.cancelled&&m.orderId==null){botonFinanzas(row.cells[4],'Editar',()=>editarMovimiento(m));botonFinanzas(row.cells[4],'Anular',()=>anularFinanzas('movements',finanzas.data.movements.find(x=>x.id===m.id)));}if(m.cancelled)row.cells[4].append(' · '+m.cancelled.reason);}
 if(!table.children.length)filaFinanzas(table,['Sin movimientos para estos filtros','','','','']);
 const history=document.getElementById('historialFinanzas');history.replaceChildren();
 for(const h of finanzas.history||[]){const d=document.createElement('details');const title=document.createElement('summary');const c=h.change;const action=c.after?.cancelled?'Anulación':c.before?'Modificación':'Alta';title.textContent=new Date(h.at).toLocaleString('es-UY')+' · '+h.actor+' · '+action+' · '+(c.after?.description||'Configuración');const pre=document.createElement('pre');pre.textContent='Antes:\n'+describirRegistroFinanzas(c.before)+'\nDespués:\n'+describirRegistroFinanzas(c.after);d.append(title,pre);history.append(d);}if(!history.children.length)history.textContent='Los próximos cambios quedarán registrados aquí. Los registros anteriores no tienen autor histórico disponible.';
}
async function anularFinanzas(kind,item){const reason=prompt('Motivo de la anulación. Los pagos de gastos ya realizados se conservarán en caja.');if(reason===null)return;if(!reason.trim()){document.getElementById('mensajeFinanzas').textContent='Indicá el motivo de la anulación.';return;}const data=structuredClone(finanzas.data);data[kind].find(x=>x.id===item.id).cancelled={reason:reason.trim()};await guardarFinanzas(data);}
async function pagarCuotaFinanzas(id,index){const date=prompt('Fecha real del pago (AAAA-MM-DD)',hoyFinanzas());if(date===null)return;const data=structuredClone(finanzas.data);data.expenses.find(e=>e.id===id).installments[index].paidAt=date;await guardarFinanzas(data);}
function resumenMensualFinanzas(month){const rows=movimientosFinanzas().filter(m=>!m.cancelled&&m.date.startsWith(month));const sums={cobro:0,gasto:0,aporte:0,retiro:0,devolucion:0,reintegro:0};for(const m of rows)sums[m.type]+=Math.round(m.amount*100);return {rows,sums,result:(sums.cobro-sums.gasto-sums.devolucion+sums.reintegro)/100};}
function exportarResumenFinanzas(){const month=document.getElementById('mesExportacion').value;if(!/^\d{4}-\d{2}$/.test(month)){document.getElementById('mensajeFinanzas').textContent='Elegí el mes a descargar.';return;}const {rows,sums,result}=resumenMensualFinanzas(month);const records=[['Flamitas · Resumen mensual UYU',month],['Cobros',sums.cobro/100],['Gastos pagados',sums.gasto/100],['Devoluciones',sums.devolucion/100],['Reintegros',sums.reintegro/100],['Resultado de caja',result],['Aportes',sums.aporte/100],['Retiros',sums.retiro/100],[],['Fecha','Concepto','Tipo','Importe UYU'],...rows.map(m=>[m.date,m.description,m.type,m.amount])];const csv='\uFEFF'+records.map(r=>r.map(v=>'"'+(typeof v==='number'?v.toFixed(2).replace('.',','):String(v).replace(/^[=+@\-\t\r]/,"'$&")).replaceAll('"','""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Flamitas-finanzas-'+month+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}


function describirRegistroFinanzas(item){
 if(!item)return 'Sin registro';
 const lines=[];const names={description:'Concepto',category:'Categoría',supplier:'Proveedor',date:'Fecha',type:'Tipo',orderId:'Pedido',start:'Fecha inicial'};
 for(const [key,label] of Object.entries(names))if(item[key]!=null&&item[key]!=='')lines.push(label+': '+item[key]);
 for(const [key,label] of [['total','Importe'],['amount','Importe'],['opening','Saldo inicial']])if(item[key]!=null)lines.push(label+': '+dineroFinanzas(item[key]));
 for(const [i,q] of (item.installments||[]).entries())lines.push('Cuota '+(i+1)+': '+dineroFinanzas(q.amount)+' · vence '+q.due+' · '+(q.paidAt?'pagada '+q.paidAt:'pendiente'));
 if(item.cancelled)lines.push('Anulado: '+item.cancelled.reason+' · '+item.cancelled.date);
 return lines.join('\n');
}
