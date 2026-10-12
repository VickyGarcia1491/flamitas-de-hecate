
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('La foto se reduce y utiliza imágenes data compatibles con la política de seguridad',async()=>{
 let decodedSource;const canvas={getContext:()=>({fillRect(){},drawImage(){}}),toBlob:fn=>fn({size:100000})};
 const scope={document:{createElement:()=>canvas},Image:class{naturalWidth=4000;naturalHeight=3000;set src(v){decodedSource=v;queueMicrotask(()=>this.onload());}},FileReader:class{readAsDataURL(){this.result='data:image/webp;base64,AQID';this.onload();}}};
 vm.createContext(scope);vm.runInContext(readFileSync('js/fotos.js','utf8'),scope);
 assert.equal(await scope.optimizarFotoProducto({type:'image/jpeg',size:4000000}),'data:image/webp;base64,AQID');
 assert.equal(canvas.width,1200);assert.equal(canvas.height,900);assert.match(decodedSource,/^data:image\//);
 await assert.rejects(scope.optimizarFotoProducto({type:'text/html',size:1}));
 await assert.rejects(scope.optimizarFotoProducto({type:'image/jpeg',size:21000000}));
});
