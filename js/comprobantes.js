// Comprobantes privados, disponibles solo para el dueño del pedido y administración.
async function iniciarComprobantes() {
 if(!obtenerUsuarioActivo())return;
 let panel=document.querySelector('#panelComprobantes');
 if(!panel){panel=document.createElement('section');panel.id='panelComprobantes';panel.className='panel-comprobantes';(document.querySelector('#seccionDashboard')||document.querySelector('#historialCuentaCliente')?.parentElement||document.querySelector('.gallery')).append(panel);}
 panel.innerHTML='<h3>'+ (obtenerUsuarioActivo().rol==='admin'?'Comprobantes por revisar':'Ya hice la transferencia')+'</h3><p>El pago se confirma cuando Flamitas verifica la recepción del dinero.</p><button type="button" id="actualizarComprobantes">Actualizar comprobantes</button><p id="mensajeComprobantes" role="status" aria-live="polite"></p><div id="listaComprobantes"></div>';
 panel.querySelector('button').onclick=()=>cargarComprobantes(true);
 await cargarComprobantes(false);
}
async function cargarComprobantes(refrescar) {
 const mensaje=document.querySelector('#mensajeComprobantes');
 try {
 if(refrescar)await cargarDatosServidor();
 const receipts=await api('/api/receipts');datosServidor.comprobantes=receipts;if(typeof mostrarHistorialCuenta==='function')mostrarHistorialCuenta();const admin=obtenerUsuarioActivo().rol==='admin';
 const pedidos=datosServidor.pedidos.filter(p=>p.pago?.medio==='Transferencia bancaria');
 const pendientes=receipts.filter(r=>!r.reviewed_at&&pedidos.some(p=>String(p.id)===String(r.order_id)&&p.estado!=='Cancelado'&&p.pago.estado!=='Pagado'));
 if(admin){
 let aviso=document.querySelector('#avisoComprobantes');
 if(!aviso){aviso=document.createElement('button');aviso.type='button';aviso.id='avisoComprobantes';aviso.className='aviso-comprobantes';document.querySelector('.admin-panel').before(aviso);aviso.onclick=()=>{mostrarSeccionAdmin('dashboard');document.querySelector('#panelComprobantes').scrollIntoView?.({block:'start',behavior:'smooth'})};}
 aviso.textContent='Comprobantes por revisar: '+pendientes.length;aviso.hidden=!pendientes.length;
 }
 const lista=document.querySelector('#listaComprobantes');lista.replaceChildren();
 mensaje.textContent=admin?pendientes.length+' comprobantes por revisar.':'';
 const visibles=admin?pedidos.filter(p=>pendientes.some(r=>String(r.order_id)===String(p.id))):pedidos;
 if(!visibles.length)lista.textContent=admin?'No hay comprobantes pendientes.':'Después de guardar tu pedido por transferencia, aparecerá aquí para adjuntar el comprobante.';
 for(const pedido of visibles){
 const receipt=receipts.find(r=>String(r.order_id)===String(pedido.id));const card=document.createElement('article');card.className='comprobante-card';
 const titulo=document.createElement('strong');titulo.textContent='Pedido #'+pedido.id+' · $'+pedido.total+' UYU';card.append(titulo);
 const estado=document.createElement('p');estado.textContent=pedido.pago.estado==='Pagado'?'Pagado':pedido.estado==='Cancelado'?'Pedido cancelado':receipt?'Comprobante enviado · Pendiente de verificación':'Pago pendiente · Adjuntá tu comprobante';card.append(estado);
 const status=document.createElement('p');status.setAttribute('role','status');
 if(receipt){const a=document.createElement('a');a.href='/api/orders/'+pedido.id+'/receipt';a.textContent='Descargar comprobante';card.append(a);}
 if(admin){const button=document.createElement('button');button.type='button';button.textContent='Confirmar pago recibido';button.onclick=async()=>{
 if(!confirm('¿Verificaste que el dinero del pedido #'+pedido.id+' ingresó en la cuenta de Flamitas?'))return;
 button.disabled=true;try{await api('/api/orders/'+pedido.id+'/receipt/confirm','POST',{uploadedAt:new Date(receipt.uploaded_at).toISOString()});await cargarComprobantes(true);mostrarDashboardAdmin();mostrarPedidosAdmin();}catch(e){status.textContent=e.message;button.disabled=false;}
 };card.append(button);
 }else if(pedido.pago.estado!=='Pagado'&&pedido.estado!=='Cancelado'){
 const label=document.createElement('label');label.textContent=receipt?'Reemplazar comprobante (PDF, JPG o PNG, hasta 5 MB)':'Comprobante (PDF, JPG o PNG, hasta 5 MB)';
 const file=document.createElement('input');file.type='file';file.accept='.pdf,.jpg,.jpeg,.png';label.append(file);card.append(label);
 const button=document.createElement('button');button.type='button';button.textContent=receipt?'Reemplazar comprobante':'Enviar comprobante';button.onclick=async()=>{
 const selected=file.files[0];if(!selected||selected.size>5*1024*1024||!['application/pdf','image/jpeg','image/png'].includes(selected.type)){status.textContent='Elegí un PDF, JPG o PNG de hasta 5 MB.';return;}
 button.disabled=true;file.disabled=true;status.textContent='Enviando comprobante…';
 try{const content=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('No pudimos leer el archivo.'));reader.readAsDataURL(selected)});await api('/api/orders/'+pedido.id+'/receipt','POST',{name:selected.name,mime:selected.type,content});await cargarComprobantes(false);}
 catch(e){status.textContent='No pudimos confirmar el envío. '+e.message+' Actualizá la lista antes de volver a enviar.';button.disabled=false;file.disabled=false;}
 };card.append(button);}
 card.append(status);lista.append(card);
 }
 }catch(e){mensaje.textContent='No pudimos cargar los comprobantes. '+e.message;}
}
