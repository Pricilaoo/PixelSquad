import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createServer} from './server.mjs';
const folder=dirname(fileURLToPath(import.meta.url));
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function launchSetup({directory=folder,setupPort=8788,apiPort=8787,openBrowser=false}={}){
 const csrf=randomBytes(32).toString('hex'),envPath=join(directory,'.env');let api=null,config=null,busy=false;
 const listen=(server,port)=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
 const start=async value=>{const server=createServer({key:value.OPENAI_API_KEY,token:value.PIXELSQUAD_VISION_TOKEN,model:value.OPENAI_VISION_MODEL||'gpt-4.1-mini'});server.requestTimeout=90000;await listen(server,apiPort);return server;};
 try{
  const text=await readFile(envPath,'utf8'),value=Object.fromEntries(text.split(/\r?\n/).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)];}));
  if(value.OPENAI_API_KEY&&value.PIXELSQUAD_VISION_TOKEN){api=await start(value);config=value;}
 }catch(error){if(error.code!=='ENOENT')throw Error('Não foi possível iniciar com a configuração salva. Confira o arquivo .env e se a porta 8787 já está ocupada.');}
 const page=message=>`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PixelSquad · Configurar IA</title><style>body{font:16px system-ui;background:#14262c;color:#edffff;margin:0;padding:24px}main{max-width:640px;margin:30px auto;padding:28px;border:1px solid #36595e;border-radius:18px;background:#1c343a}h1{font-size:27px}p{line-height:1.6}label{display:grid;gap:10px;margin:24px 0}input,button{font:inherit;padding:14px;border-radius:9px;border:1px solid #598284}input{background:#10252b;color:white;min-width:0}button{background:#8ce3cc;color:#15362c;cursor:pointer}code{display:block;background:#10252b;padding:12px;overflow-wrap:anywhere;user-select:all}small{color:#b3cfce}footer{margin-top:24px}</style><main><h1>Conectar a IA do PixelSquad</h1>${message?`<p role="status">${escape(message)}</p>`:''}${config?`<p>Servidor local iniciado. A chave foi salva somente neste computador e não aparece nesta tela.</p><p>No jogo, abra <strong>Construção → Foto de referência → Configurar IA</strong> e cole:</p><p>Endereço do servidor</p><code>http://127.0.0.1:${api.address().port}</code><p>Token do servidor PixelSquad</p><code>${escape(config.PIXELSQUAD_VISION_TOKEN)}</code><p>Depois clique em Conectar e volte ao jogo para analisar a foto. Mantenha a janela do servidor aberta. A validade da chave e o saldo da API serão verificados na primeira análise.</p>`:`<p>Cole sua <strong>nova chave da OpenAI</strong> abaixo. Ela ficará no servidor local, fora da extensão e do GitHub.</p><form method="post" action="/configure"><input type="hidden" name="csrf" value="${csrf}"><label>Nova chave da API<input name="key" type="password" autocomplete="off" spellcheck="false" minlength="40" maxlength="512" placeholder="sk-…" required></label><button>Salvar chave e iniciar</button></form><p><small>Use uma chave nova: revogue a que foi compartilhada no chat. A API pode cobrar pelas análises na sua conta.</small></p>`}<footer><small>Feito por Pricilao. · PixelSquad · Configuração local</small></footer></main></html>`;
 const setup=http.createServer(async(req,res)=>{
  const origin=`http://127.0.0.1:${setup.address().port}`;
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(body);};
  if(req.headers.host!==new URL(origin).host)return send(403,'Acesso permitido somente pelo endereço local.');
  if(req.method==='GET'&&req.url==='/')return send(200,page());
  if(req.method!=='POST'||req.url!=='/configure')return send(404,'Página não encontrada.');
  if(req.headers.origin!==origin||!/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers['content-type']||''))return send(403,'Abra a tela de configuração local.');
  if(busy||config)return send(409,page('O servidor já está configurado ou iniciando.'));
  busy=true;let next=null;
  try{
   let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)throw Error('Formulário muito grande.');body+=chunk.toString();}
   const fields=new URLSearchParams(body);if(fields.get('csrf')!==csrf)return send(403,'Reabra a tela de configuração.');
   const key=(fields.get('key')||'').trim();if(!/^sk-[A-Za-z0-9_-]{37,509}$/.test(key))throw Error('Confira a chave: ela deve começar com sk- e não conter espaços.');
   const value={OPENAI_API_KEY:key,PIXELSQUAD_VISION_TOKEN:randomBytes(32).toString('hex'),OPENAI_VISION_MODEL:'gpt-4.1-mini'};
   next=await start(value);
   const temporary=envPath+'.'+randomBytes(8).toString('hex')+'.tmp';
   try{await writeFile(temporary,Object.entries(value).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600,flag:'wx'});await rename(temporary,envPath);}catch{await unlink(temporary).catch(()=>{});throw Error('Não foi possível salvar a configuração nesta pasta.');}
   api=next;config=value;next=null;
   res.writeHead(303,{Location:'/', 'Cache-Control':'no-store'});res.end();
  }catch(error){if(next)next.close();send(400,page(error.code==='EADDRINUSE'?'A porta do servidor já está em uso. Feche a outra janela do PixelSquad e tente novamente.':error.message));}finally{busy=false;}
 });
 setup.requestTimeout=15000;
 try{await listen(setup,setupPort);}catch(error){api?.close();throw error;}
 const url=`http://127.0.0.1:${setup.address().port}/`;
 if(openBrowser){const command=process.platform==='win32'?'cmd':process.platform==='darwin'?'open':'xdg-open';const args=process.platform==='win32'?['/c','start','',url]:[url];const child=spawn(command,args,{stdio:'ignore'});child.on('error',()=>{});child.unref();}
 return {url,close:async()=>{for(const server of [setup,api].filter(Boolean)){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const app=await launchSetup({openBrowser:true});console.log(`PixelSquad: abra ${app.url}\nMantenha esta janela aberta enquanto usar a IA.`);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit(0);});}
 catch{console.error('Não foi possível iniciar. Feche outras janelas do servidor PixelSquad e tente novamente.');process.exitCode=1;}
}
