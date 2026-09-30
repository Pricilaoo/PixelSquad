(()=>{if(window.__PIXELSQUAD__)return;window.__PIXELSQUAD__=true;
const KEY="pixelsquad_state";
const stored=JSON.parse(localStorage.getItem(KEY)||"{}");
const S={tab:"home",enables:[],height:Number(stored.height)||0,direction:Number(stored.direction)||0,selected:stored.selected||null,favorites:Array.isArray(stored.favorites)?stored.favorites:[],history:Array.isArray(stored.history)?stored.history:[],lastAction:""};
const wired=[
["Ativadores","Entrada no quarto","Gatilho quando um usuário entra no quarto"],
["Ativadores","Periodicamente","Executa o sistema em intervalo"],
["Efeitos","Super Wired","Executa comandos configurados"],
["Efeitos","Mudar estado","Altera o estado de um mobi selecionado"],
["Efeitos","Teleporte aleatório","Teleporta para uma posição válida"],
["Condições","Badge","Verifica emblema do usuário"],
["Condições","Direitos","Verifica direitos do usuário"],
["Condições","VIP","Verifica status VIP"],
["Condições","Grupo","Verifica associação a grupo"],
["Condições","Nome","Compara o nome do usuário"],
["Seletores","Mobis","Seleciona mobis do quarto"],
["Seletores","Usuários","Seleciona usuários conforme regra"]
];
const commands=["enable","fastwalk","handitem","pullmode","pushmode","diagonal","kickpower","sit","lay","lock","roommute","walkthrough","clickthrough","addpoint","removepoint","setpoint","moonwalk","player:stand","player:sit","player:lay","tag","removetag","showgroupforum","randomstate","randomteleport","badge","nobadge","hasrights","norights","hasvip","novip","gender","groupmember","nogroupmember","handitem","nohanditem","mission","nomission","username"];
const buildTools=[["select","Selecionar mobi"],["move","Mover pilha"],["up","Subir altura"],["down","Descer altura"],["rotate","Girar"],["freeze","Congelar"],["unfreeze","Descongelar"],["undo","Desfazer"],["redo","Refazer"],["teleport","Teleporte"]];
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function persist(){localStorage.setItem(KEY,JSON.stringify({height:S.height,direction:S.direction,selected:S.selected,favorites:S.favorites,history:S.history}))}
function toast(msg){let t=document.getElementById("pixelsquad-toast");if(!t){t=document.createElement("div");t.id="pixelsquad-toast";document.body.appendChild(t)}t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),1800)}
function emitAction(action,data={}){S.lastAction=action;S.history.push({action,data,time:Date.now()});S.history=S.history.slice(-30);persist();window.dispatchEvent(new CustomEvent("pixelsquad-action",{detail:{action,data}}));toast(psT("applied")+": "+action+" • v0.5.1")}
function findChatInput(){
  const selectors=[
    'textarea[placeholder*="falar" i]','textarea[placeholder*="digite" i]',
    'textarea[placeholder*="mensagem" i]','textarea[aria-label*="chat" i]',
    'input[placeholder*="falar" i]','input[placeholder*="digite" i]',
    'input[placeholder*="mensagem" i]','input[aria-label*="chat" i]',
    '[contenteditable="true"][role="textbox"]','[contenteditable="true"]'
  ];
  const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
  const preferred=selectors.map(s=>[...document.querySelectorAll(s)]).flat().find(visible);
  if(preferred)return preferred;
  const candidates=[...document.querySelectorAll('textarea,input[type="text"],[contenteditable="true"]')]
    .filter(visible)
    .filter(el=>{const p=(el.getAttribute('placeholder')||'').toLowerCase();return !/senha|email|login|pesquisar|buscar|search/.test(p)});
  return candidates.sort((a,b)=>b.getBoundingClientRect().top-a.getBoundingClientRect().top)[0]||null;
}
function setNativeValue(input,value){
  if(input.isContentEditable){
    input.focus();
    input.textContent=value;
    input.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:value}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
    return;
  }
  const proto=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
  if(setter)setter.call(input,value);else input.value=value;
  input.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:value}));
  input.dispatchEvent(new Event("change",{bubbles:true}));
}
function findChatSendButton(input){
  const form=input.closest("form");
  const near=form||input.parentElement?.parentElement||input.parentElement;
  const selectors=['button[type="submit"]','button[aria-label*="enviar" i]','button[title*="enviar" i]','button[aria-label*="send" i]','button[title*="send" i]'];
  for(const s of selectors){const b=near?.querySelector(s);if(b)return b}
  return [...(near?.querySelectorAll("button")||[])].find(b=>/^(enviar|send)$/i.test((b.innerText||b.textContent||"").trim()))||null;
}
function sendHabbletCommand(command){
  const value=String(command||"").trim(); if(!value)return false;
  const input=findChatInput();
  if(!input){toast("Caixa de chat do Habblet não encontrada");return false}
  setNativeValue(input,value);
  const send=findChatSendButton(input);
  if(send){
    send.click();
  }else if(input.isContentEditable){
    input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:true,cancelable:true,composed:true}));
    input.dispatchEvent(new KeyboardEvent("keypress",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:true,cancelable:true,composed:true}));
    input.dispatchEvent(new KeyboardEvent("keyup",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:true,composed:true}));
  }else{
    const form=input.closest("form");
    if(form?.requestSubmit) form.requestSubmit();
    else if(form) form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
    else {
      input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:true,cancelable:true,composed:true}));
      input.dispatchEvent(new KeyboardEvent("keyup",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:true,composed:true}));
    }
  }
  emitAction("chat-command",{command:value});
  toast("Enviado ao Habblet: "+value);
  return true;
}
function avatarCommand(name,param=""){
  const command=":"+name+(String(param).trim()?" "+String(param).trim():"");
  return sendHabbletCommand(command);
}
function sitAvatar(){
  const input=findChatInput();
  if(!input){toast("Chat do Habblet não encontrado");return false}
  setNativeValue(input,":sit");
  input.focus();
  const send=findChatSendButton(input);
  if(send){
    send.click();
  }else{
    const form=input.closest("form");
    if(form?.requestSubmit) form.requestSubmit();
    else{
      for(const type of ["keydown","keypress","keyup"]){
        input.dispatchEvent(new KeyboardEvent(type,{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:true,cancelable:true,composed:true}));
      }
    }
  }
  emitAction("sit",{command:":sit"});
  toast("Sentar executado");
  return true;
}
function tryClientAction(action,data={}){const selectors={
select:["[data-id][class*=furni]","[class*=furni][class*=selected]","[data-furni-id]"],
undo:["button[aria-label*=undo i]","button[title*=undo i]"],
redo:["button[aria-label*=redo i]","button[title*=redo i]"]
};const found=(selectors[action]||[]).map(s=>document.querySelector(s)).find(Boolean);if(found){found.click();emitAction(action,data);return true}toast("Ação de construção ainda não conectada ao editor nativo do quarto");return false}
function enableDrag(root){const box=root.querySelector(".box"),header=root.querySelector(".drag");let drag=false,ox=0,oy=0;const saved=JSON.parse(localStorage.getItem("pixelsquad_panel_position")||"null");if(saved){box.style.left=saved.x+"px";box.style.top=saved.y+"px"}header.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;drag=true;header.setPointerCapture?.(e.pointerId);const r=box.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top});header.addEventListener("pointermove",e=>{if(!drag)return;const maxX=Math.max(8,innerWidth-box.offsetWidth-8),maxY=Math.max(8,innerHeight-box.offsetHeight-8);box.style.left=Math.min(maxX,Math.max(8,e.clientX-ox))+"px";box.style.top=Math.min(maxY,Math.max(8,e.clientY-oy))+"px"});header.addEventListener("pointerup",()=>{if(!drag)return;drag=false;const r=box.getBoundingClientRect();localStorage.setItem("pixelsquad_panel_position",JSON.stringify({x:Math.round(r.left),y:Math.round(r.top)}))})}
function panel(){document.getElementById("pixelsquad")?.remove();const root=document.createElement("div");root.id="pixelsquad";root.innerHTML='<div class="box"><header class="drag"><div><strong>PIXELSQUAD</strong><small>Construção • Wired • Ferramentas</small><div class="creator">'+esc(psT("creator"))+': Pricilao</div></div><button id="ps-close" title="'+esc(psT("close"))+'">×</button></header><nav id="ps-nav"></nav><main id="ps-main"></main></div>';document.body.appendChild(root);
const nav=root.querySelector("#ps-nav");const tabs=[["home","⌂"],["avatar","👤"],["build","▦"],["enables","✋"],["wired","⚙"],["effects","✨"],["commands","⌨"],["settings","☷"]];nav.innerHTML=tabs.map(([k,i])=>'<button data-tab="'+k+'" class="'+(S.tab===k?"active":"")+'">'+i+" "+esc(psT(k))+"</button>").join("");nav.onclick=e=>{const b=e.target.closest("[data-tab]");if(b){S.tab=b.dataset.tab;render()}};root.querySelector("#ps-close").onclick=()=>root.remove();enableDrag(root);render()}
function render(){const m=document.querySelector("#pixelsquad #ps-main");if(!m)return;
if(S.tab==="home")m.innerHTML='<section class="hero"><h2>PixelSquad</h2><p>Ferramentas de construção e configuração de Wired.</p><div class="status"><b>'+esc(psT("status"))+':</b> '+esc(S.lastAction||psT("ready"))+'</div></section><div class="grid"><article><b>▦ '+esc(psT("build"))+'</b><span>Ferramentas de seleção, altura, direção e histórico.</span></article><article><b>⚙ '+esc(psT("wired"))+'</b><span>Biblioteca pesquisável de gatilhos, efeitos, condições e seletores.</span></article><article><b>✨ '+esc(psT("effects"))+'</b><span>Favoritos e comandos rápidos.</span></article><article><b>⌨ '+esc(psT("commands"))+'</b><span>Gerador de comandos com cópia e salvamento.</span></article></div>';
if(S.tab==="avatar"){
  const avatarTools=[["sit","Sentar",false],["lay","Deitar",false],["jump","Pular",false],["moonwalk","Moonwalk",false],["cara","Esconder rosto",false],["kiss","Beijo",false],["enable","Efeito",true],["handitem","Handitem",true],["sign","Placa",true]];
  m.innerHTML='<h2>Personagem</h2><p class="muted">Comandos executados pelo chat nativo do Habblet.</p><div class="avatar-grid">'+avatarTools.map(x=>'<button class="avatar-tool" data-avatar-command="'+x[0]+'" data-needs-param="'+x[2]+'">'+x[1]+'</button>').join('')+'</div><input id="ps-avatar-param" placeholder="ID para efeito / handitem / placa"><button id="ps-avatar-custom">Executar comando</button><div class="status">Pronto.</div>';
  m.onclick=e=>{const b=e.target.closest("[data-avatar-command]");if(!b)return;const needs=b.dataset.needsParam==="true",param=m.querySelector("#ps-avatar-param").value.trim();if(needs&&!param){toast("Informe o ID primeiro");return}((b.dataset.avatar-command==="sit")?sitAvatar():avatarCommand(b.dataset.avatar-command,param))};
  m.querySelector("#ps-avatar-custom").onclick=()=>{const raw=m.querySelector("#ps-avatar-param").value.trim();if(!raw){toast("Digite um comando, por exemplo :sit");return}sendHabbletCommand(raw.startsWith(":")?raw:":"+raw)};
}
if(S.tab==="build"){m.innerHTML='<h2>'+esc(psT("build"))+'</h2><div class="tools">'+buildTools.map(([id,label])=>'<button class="tool" data-action="'+id+'">'+esc(psT(id)===id?label:psT(id))+'</button>').join("")+'</div><label>'+esc(psT("height"))+'<input id="ps-height" type="number" step="0.5" value="'+S.height+'"></label><label>'+esc(psT("direction"))+'<select id="ps-direction"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label><div class="status" id="build-status">'+esc(psT("ready"))+'</div>';m.querySelector("#ps-direction").value=String(S.direction);m.querySelector("#ps-height").onchange=e=>{S.height=Number(e.target.value)||0;persist();emitAction("height",{value:S.height})};m.querySelector("#ps-direction").onchange=e=>{S.direction=Number(e.target.value);persist();emitAction("direction",{value:S.direction})};m.querySelector(".tools").onclick=e=>{const b=e.target.closest("[data-action]");if(!b)return;tryClientAction(b.dataset.action,{height:S.height,direction:S.direction});if(b.dataset.action==="up"){S.height+=0.5;m.querySelector("#ps-height").value=S.height;persist()}if(b.dataset.action==="down"){S.height-=0.5;m.querySelector("#ps-height").value=S.height;persist()}if(b.dataset.action==="rotate"){S.direction=(S.direction+90)%360;m.querySelector("#ps-direction").value=S.direction;persist()}}}
if(S.tab==="enables"){m.innerHTML='<div class="row"><h2>Enables / Handitems</h2><input id="ps-enable-search" placeholder="Pesquisar por nome ou número..."></div><div class="enable-actions"><button id="ps-enable-refresh">Atualizar lista</button><span id="ps-enable-count" class="muted">Carregando...</span></div><div class="enablegrid" id="ps-enable-list"></div>';const list=()=>{const q=(m.querySelector("#ps-enable-search").value||"").toLowerCase();const arr=(S.enables||[]).filter(x=>String(x.id).includes(q)||String(x.name).toLowerCase().includes(q));m.querySelector("#ps-enable-count").textContent=arr.length+" itens";m.querySelector("#ps-enable-list").innerHTML=arr.map(x=>'<article class="enable-card"><img src="'+esc(x.image)+'" alt="'+esc(x.name)+'" loading="lazy"><div class="enable-info"><strong>'+esc(x.name)+'</strong><b>#'+esc(x.id)+'</b><button data-enable-id="'+esc(x.id)+'">Usar / Copiar ID</button></div></article>').join("")||'<div class="status">Nenhum enable importado. Abra o botão "Importar Enables / Handitems" da extensão e deixe o ToolsBlet carregar.</div>'};m.querySelector("#ps-enable-search").oninput=list;m.querySelector("#ps-enable-refresh").onclick=async()=>{try{const r=await chrome.storage.local.get(["pixelsquad_enables"]);S.enables=Array.isArray(r.pixelsquad_enables)?r.pixelsquad_enables:[];list();toast("Lista atualizada: "+S.enables.length)}catch{toast("Não foi possível atualizar")}};m.onclick=async e=>{const b=e.target.closest("[data-enable-id]");if(!b)return;const id=b.dataset.enableId;try{await navigator.clipboard.writeText(id)}catch{};avatarCommand("handitem",id)};list()}
if(S.tab==="wired"){m.innerHTML='<div class="row"><h2>'+esc(psT("wired"))+'</h2><input id="ps-wired-search" placeholder="'+esc(psT("search"))+'..."></div><div class="filters"><button data-filter="">'+esc(psT("all"))+'</button>'+["Efeitos","Condições","Ativadores","Seletores"].map(x=>'<button data-filter="'+x+'">'+x+'</button>').join("")+'</div><div id="ps-wired-list"></div>';let filter="";const list=()=>{const q=(m.querySelector("#ps-wired-search").value||"").toLowerCase();m.querySelector("#ps-wired-list").innerHTML=wired.filter(x=>(!filter||x[0]===filter)&&x.join(" ").toLowerCase().includes(q)).map(x=>'<article class="card"><b>'+esc(x[0])+'</b><strong>'+esc(x[1])+'</strong><span>'+esc(x[2])+'</span><button class="use-wired" data-name="'+esc(x[1])+'">Usar</button></article>').join("")||'<div class="status">Nenhum resultado.</div>'};m.querySelector("#ps-wired-search").oninput=list;m.querySelector(".filters").onclick=e=>{const b=e.target.closest("[data-filter]");if(b){filter=b.dataset.filter;list()}};m.onclick=e=>{const b=e.target.closest(".use-wired");if(b)emitAction("wired",{name:b.dataset.name})};list()}
if(S.tab==="effects"){const names=["enable","fastwalk","handitem","kickpower","moonwalk","sit","lay","lock","roommute","walkthrough","clickthrough","randomstate","tag","showgroupforum"];m.innerHTML='<h2>'+esc(psT("effects"))+'</h2><input id="ps-effect-search" placeholder="'+esc(psT("search"))+'..."><div class="effectgrid" id="ps-effects"></div>';const list=()=>{const q=m.querySelector("#ps-effect-search").value.toLowerCase();m.querySelector("#ps-effects").innerHTML=names.filter(x=>x.includes(q)).map(x=>'<button class="effect" data-command="'+x+'">★ '+x+'</button>').join("")};m.querySelector("#ps-effect-search").oninput=list;m.onclick=async e=>{const b=e.target.closest("[data-command]");if(!b)return;const cmd=b.dataset.command;if(!S.favorites.includes(cmd))S.favorites.push(cmd);persist();avatarCommand(cmd)};list()}
if(S.tab==="commands"){m.innerHTML='<h2>'+esc(psT("commands"))+'</h2><select id="ps-cmd">'+commands.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("")+'</select><input id="ps-param" placeholder="'+esc(psT("parameter"))+'"><div class="out" id="ps-out"></div><div class="command-actions"><button id="ps-execute">Executar no Habblet</button><button id="ps-copy">Copiar</button><button id="ps-save">Salvar</button></div>';const update=()=>{const c=m.querySelector("#ps-cmd").value,p=m.querySelector("#ps-param").value.trim();m.querySelector("#ps-out").textContent=c+(p?":"+p:"")};m.querySelector("#ps-cmd").onchange=update;m.querySelector("#ps-param").oninput=update;m.querySelector("#ps-copy").onclick=async()=>{try{await navigator.clipboard.writeText(m.querySelector("#ps-out").textContent);toast(psT("copied"))}catch{toast("Clipboard indisponível")}};m.querySelector("#ps-execute").onclick=()=>sendHabbletCommand(m.querySelector("#ps-out").textContent);m.querySelector("#ps-save").onclick=()=>{const v=m.querySelector("#ps-out").textContent;if(!S.favorites.includes(v))S.favorites.push(v);persist();toast(psT("saved"))};update()}
if(S.tab==="settings"){m.innerHTML='<h2>'+esc(psT("settings"))+'</h2><label>'+esc(psT("language"))+'<select id="ps-language">'+Object.entries(PIXELSQUAD_LANGUAGES).map(([k,v])=>'<option value="'+k+'" '+(k===psGetLanguage()?"selected":"")+'>'+esc(v.name)+'</option>').join("")+'</select></label><p class="muted">'+esc(psT("languageSaved"))+'</p><hr><small>PixelSquad v0.5.1 • '+esc(psT("creator"))+': Pricilao</small>';m.querySelector("#ps-language").onchange=e=>psSetLanguage(e.target.value)}}
window.addEventListener("pixelsquad-language-change",()=>{if(document.getElementById("pixelsquad"))panel()});
document.addEventListener("keydown",e=>{if(e.shiftKey&&e.key.toLowerCase()==="b"){e.preventDefault();panel()}});
try{chrome.storage.local.get(["pixelsquad_enables"]).then(r=>{S.enables=Array.isArray(r.pixelsquad_enables)?r.pixelsquad_enables:[];if(document.getElementById("pixelsquad"))render()})}catch{}
try{chrome.runtime.onMessage.addListener(m=>{if(m?.type==="openPanel")panel()})}catch{}
const launch=document.createElement("button");launch.id="pixelsquad-launch";launch.textContent="▦ PixelSquad";launch.onclick=panel;document.documentElement.appendChild(launch);
})();