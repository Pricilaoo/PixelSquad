const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
(async()=>{
 const {launchSetup}=await import('../services/vision/setup.mjs');const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pixelsquad-setup-'));let app;
 try{
  app=await launchSetup({directory,setupPort:0,apiPort:0});const origin=new URL(app.url).origin;
  const initial=await fetch(app.url),page=await initial.text();assert.equal(initial.status,200);assert.match(initial.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(page,/type="password"/);
  const csrf=page.match(/name="csrf" value="([a-f0-9]+)"/)[1],key='sk-'+ 'TEST_NOT_A_REAL_KEY_'.repeat(4),body=new URLSearchParams({csrf,key});
  let response=await fetch(app.url+'configure',{method:'POST',headers:{Origin:'https://untrusted.example'},body});assert.equal(response.status,403);await assert.rejects(fs.readFile(path.join(directory,'.env')));
  response=await fetch(app.url+'configure',{method:'POST',headers:{Origin:origin},body:new URLSearchParams({csrf:'wrong',key})});assert.equal(response.status,403);
  response=await fetch(app.url+'configure',{method:'POST',headers:{Origin:origin},body,redirect:'manual'});assert.equal(response.status,303);
  const saved=await fs.readFile(path.join(directory,'.env'),'utf8');assert(saved.includes(key));assert.match(saved,/PIXELSQUAD_VISION_TOKEN=[a-f0-9]{64}/);
  if(process.platform!=='win32')assert.equal((await fs.stat(path.join(directory,'.env'))).mode&0o777,0o600);
  const ready=await(await fetch(app.url)).text();assert(!ready.includes(key));assert(!ready.includes('type="password"'));assert.match(ready,/Servidor local iniciado/);const endpoint=ready.match(/<code>(http:\/\/127\.0\.0\.1:\d+)<\/code>/)[1];assert.equal((await fetch(endpoint+'/health')).status,200);
  assert.equal(await new Promise((resolve,reject)=>{require('node:http').get(app.url,{headers:{Host:'rebinding.example'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);}),403);
  await app.close();app=await launchSetup({directory,setupPort:0,apiPort:0});const restarted=await(await fetch(app.url)).text();assert.match(restarted,/Servidor local iniciado/);assert(!restarted.includes(key));
  console.log('PASS: local key setup, Origin/CSRF/Host rejection, password field, private config file, no key echo, API startup and restart from saved configuration');
 }finally{await app?.close();await fs.rm(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
