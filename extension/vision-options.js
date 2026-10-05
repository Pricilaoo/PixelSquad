const status=document.getElementById('status');
chrome.storage.local.get('psVisionEndpoint').then(v=>document.getElementById('endpoint').value=v.psVisionEndpoint||'');
document.getElementById('config').addEventListener('submit',async event=>{
 event.preventDefault();
 try{
  const url=new URL(document.getElementById('endpoint').value.trim());
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Informe somente a origem HTTPS do servidor, sem caminho. Para o servidor local use http://127.0.0.1:8787.');
  if(!await chrome.permissions.request({origins:[`${url.origin}/*`]}))throw Error('O acesso ao servidor não foi autorizado.');
  const result=await chrome.runtime.sendMessage({type:'PS_VISION_SAVE',endpoint:url.origin,token:document.getElementById('token').value});if(!result.ok)throw Error(result.error);
  document.getElementById('token').value='';status.textContent='Conexão configurada. Volte ao construtor e clique em Analisar foto.';
 }catch(error){status.textContent=error.message;}
});
document.getElementById('disconnect').onclick=async()=>{await chrome.runtime.sendMessage({type:'PS_VISION_DISCONNECT'});document.getElementById('token').value='';document.getElementById('endpoint').value='';status.textContent='Serviço desconectado.';};
