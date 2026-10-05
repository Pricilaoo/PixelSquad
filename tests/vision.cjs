const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'../extension',name),'utf8');
(async()=>{
 const {createServer,validateInput,validateResult}=await import('../services/vision/server.mjs');
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD/8AAAAASUVORK5CYII=',catalog=[{id:1,name:'Bloco Verde'}];
 const analysis={game:'habbo',summary:'Projeto estimado',items:[{label:'Bloco Verde',catalogId:1,quantity:2,confidence:'high'}],cells:[{x:0,y:0,z:0,catalogId:1},{x:0,y:0,z:1,catalogId:1}]};
 assert.throws(()=>createServer({key:'test',token:'short'}));
 assert.throws(()=>validateInput({image:'https://example.com/image.png',catalog}));
 for(const change of [{cells:[{x:0,y:0,z:1,catalogId:1}]},{cells:[{x:0,y:0,z:0,catalogId:99}]},{items:[{...analysis.items[0],confidence:'low'}]},{cells:[analysis.cells[0],analysis.cells[0]]}])assert.throws(()=>validateResult({...analysis,...change},catalog));
 assert.deepEqual(validateResult({...analysis,game:'other'},catalog).cells,[]);
 let calls=0,request;const token='t'.repeat(40),headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 const server=createServer({key:'fake-key-for-test',token,limit:1,fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');request=JSON.parse(options.body);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(analysis)}]}]}));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base+'/v1/analyze',{method:'POST'})).status,401);assert.equal(calls,0);
  const started=await fetch(base+'/v1/analyze',{method:'POST',headers,body:JSON.stringify({image,catalog})});assert.equal(started.status,202);const {jobId}=await started.json();
  const result=await fetch(base+'/v1/jobs/'+jobId,{headers});assert.equal(result.status,200);assert.deepEqual((await result.json()).analysis,analysis);assert.equal(request.store,false);assert.equal(request.text.format.strict,true);assert.equal(request.input[0].content[1].image_url,image);
  assert.equal((await fetch(base+'/v1/analyze',{method:'POST',headers,body:JSON.stringify({image,catalog})})).status,429);assert.equal(calls,1);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 const context=vm.createContext({window:{}});vm.runInContext(source('builder-projects.js'),context);const projects=context.window.PixelSquadBuilderProjects;
 assert.equal(projects.create({project:'photo',cells:analysis.cells}).cells.length,2);assert.throws(()=>projects.create({project:'photo',cells:[analysis.cells[1]]}),/apoio/);assert.throws(()=>projects.create({project:'photo',cells:[analysis.cells[0],analysis.cells[0]]}),/sobrepostos/);
 let listener,local={},session={},fetchCalls=0;
 const storage=store=>({get:async key=>({[key]:store[key]}),set:async value=>Object.assign(store,value),remove:async key=>delete store[key]});
 const chrome={runtime:{id:'test-extension',getURL:name=>`chrome-extension://test-extension/${name}`,onMessage:{addListener:fn=>listener=fn},openOptionsPage:async()=>{}},storage:{local:storage(local),session:storage(session)},permissions:{contains:async()=>true}};
 vm.runInNewContext(source('vision-background.js'),{chrome,URL,AbortSignal,setTimeout,fetch:async(url,options)=>{fetchCalls++;assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,`Bearer ${token}`);return new Response(JSON.stringify({analysis}));}});
 const options={id:'test-extension',url:chrome.runtime.getURL('vision-options.html')},game={id:'test-extension',url:'https://www.habblet.city/hotel'};
 const call=(data,sender)=>new Promise(resolve=>{if(!listener(data,sender,resolve))resolve(null);});
 assert.equal(await call({type:'PS_VISION_ANALYZE',image,catalog},{id:'else',url:game.url}),null);
 assert.equal((await call({type:'PS_VISION_SAVE',endpoint:'https://vision.example',token},game)).ok,false);
 assert.equal((await call({type:'PS_VISION_ANALYZE',image,catalog},game)).ok,false);assert.equal(fetchCalls,0);
 assert.equal((await call({type:'PS_VISION_SAVE',endpoint:'https://vision.example',token},options)).ok,true);assert(!JSON.stringify(local).includes(token));
 assert.equal((await call({type:'PS_VISION_ANALYZE',image,catalog},game)).ok,true);assert.equal(fetchCalls,1);
 await call({type:'PS_VISION_DISCONNECT'},options);assert.equal(session.psVisionToken,undefined);
 console.log('PASS: authenticated vision service, asynchronous jobs, OpenAI structured image request, quotas, ID/geometry checks, no arbitrary URLs, background sender isolation, session-only service token, photo plans with supported columns');
})().catch(error=>{console.error(error);process.exitCode=1;});
