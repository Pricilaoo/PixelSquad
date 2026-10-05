const normalizeEndpoint=value=>{
 const url=new URL(value);
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!(url.protocol==='https:'||url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))throw Error('Use o endereço HTTPS do servidor, sem caminho, ou http://127.0.0.1:8787.');
 return url.origin;
};
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||!message?.type?.startsWith('PS_VISION_'))return;
 const options=sender.url===chrome.runtime.getURL('vision-options.html');
 const game=/^https:\/\/([\w-]+\.)*habblet\.city\//.test(sender.url||'');
 if(!options&&!game)return;
 (async()=>{
  if(message.type==='PS_VISION_CONFIGURE'){await chrome.runtime.openOptionsPage();return {ok:true};}
  if(message.type==='PS_VISION_SAVE'&&options){
   const endpoint=normalizeEndpoint(message.endpoint),token=String(message.token||'');
   if(token.length<32||token.length>256||/\s/.test(token)||token.startsWith('sk-'))throw Error('Use o token do servidor PixelSquad (mínimo 32 caracteres), não a chave da OpenAI.');
   if(!await chrome.permissions.contains({origins:[`${endpoint}/*`]}))throw Error('Permita o acesso ao endereço do servidor.');
   await chrome.storage.local.set({psVisionEndpoint:endpoint});await chrome.storage.session.set({psVisionToken:token});return {ok:true};
  }
  if(message.type==='PS_VISION_DISCONNECT'&&options){await chrome.storage.session.remove('psVisionToken');await chrome.storage.local.remove('psVisionEndpoint');return {ok:true};}
  if(message.type==='PS_VISION_ANALYZE'&&game){
   const {psVisionEndpoint:endpoint}=await chrome.storage.local.get('psVisionEndpoint');const {psVisionToken:token}=await chrome.storage.session.get('psVisionToken');
   if(!endpoint||!token)throw Error('Conecte o serviço de IA em Configurar IA.');
   normalizeEndpoint(endpoint);
   if(!await chrome.permissions.contains({origins:[`${endpoint}/*`]}))throw Error('Reconecte o servidor em Configurar IA.');
   if(typeof message.image!=='string'||message.image.length>11500000||!Array.isArray(message.catalog)||message.catalog.length>5000)throw Error('Foto ou catálogo inválido.');
   const response=await fetch(`${endpoint}/v1/analyze`,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({image:message.image,catalog:message.catalog}),signal:AbortSignal.timeout(20000)});
   let data=await response.json();if(!response.ok)throw Error(data.error||'O servidor não concluiu a análise.');if(response.status===202){
    if(typeof data.jobId!=='string'||!/^[a-f0-9-]{36}$/.test(data.jobId))throw Error('Resposta inválida do servidor.');
    const jobId=data.jobId;let completed=false;
    for(let i=0;i<90;i++){
     await new Promise(resolve=>setTimeout(resolve,1000));
     const next=await fetch(`${endpoint}/v1/jobs/${jobId}`,{redirect:'error',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});data=await next.json();
     if(!next.ok)throw Error(data.error||'A análise falhou.');if(next.status!==202){completed=true;break;}
    }
    if(!completed)throw Error('A análise demorou demais. Nenhuma compra foi executada.');
   }
   return {ok:true,analysis:data.analysis};
  }
  throw Error('Ação de IA indisponível.');
 })().then(reply,error=>reply({ok:false,error:error.message==='Failed to fetch'?'Não foi possível acessar o servidor de IA.':error.message}));return true;
});
