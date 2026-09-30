(()=>{if(window.__PIXELSQUAD_TRANSLATION__)return;window.__PIXELSQUAD_TRANSLATION__=true;
const KEY="pixelsquad_translation",defaults={enabled:false,outgoing:true,incoming:true,source:"auto",target:"pt",showOriginal:true};
const langs={auto:"Detectar automaticamente",pt:"Português",en:"English",es:"Español",fr:"Français",de:"Deutsch",it:"Italiano",ja:"日本語",ko:"한국어",zh:"中文",ru:"Русский",ar:"العربية",hi:"हिन्दी",tr:"Türkçe",nl:"Nederlands",pl:"Polski"};
let cfg=Object.assign({},defaults);try{Object.assign(cfg,JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{}
const recent=new Map(),cache=new Map(),save=()=>localStorage.setItem(KEY,JSON.stringify(cfg));
const setConfig=p=>{cfg=Object.assign({},cfg,p);save();return cfg},getConfig=()=>Object.assign({},cfg);
const normalizeCode=x=>String(x||"").toLowerCase().replace("_","-").split("-")[0]||"auto";
async function translate(text,target=cfg.target,source=cfg.source){
 text=String(text||"").trim();target=normalizeCode(target);source=normalizeCode(source);
 if(!text||target==="auto"||source===target)return{text,source,target};
 const key=source+"|"+target+"|"+text;if(cache.has(key))return{text:cache.get(key),source,target};
 const url="https://translate.googleapis.com/translate_a/single?client=gtx&sl="+encodeURIComponent(source==="auto"?"auto":source)+"&tl="+encodeURIComponent(target)+"&dt=t&q="+encodeURIComponent(text);
 const res=await fetch(url,{credentials:"omit"});if(!res.ok)throw new Error("translation-http-"+res.status);
 const data=await res.json(),out=Array.isArray(data?.[0])?data[0].map(x=>x?.[0]||"").join(""):"",detected=normalizeCode(data?.[2]||source);
 if(!out)throw new Error("translation-empty");cache.set(key,out);if(cache.size>300)cache.delete(cache.keys().next().value);return{text:out,source:detected,target};
}
function rememberOutgoing(text){text=String(text||"").trim();if(!text)return;recent.set(text,Date.now());setTimeout(()=>recent.delete(text),12000)}
function isRecentOutgoing(text){const t=recent.get(String(text||"").trim());return !!t&&Date.now()-t<12000}
const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
function chatCandidates(root=document){
 const ss=["[data-message-id]","[data-message]","[class*='chat-message']","[class*='chatMessage']","[class*='message-container']","[class*='messageContainer']","[class*='bubble']"],all=[];
 for(const s of ss)try{all.push(...root.querySelectorAll(s))}catch{}
 return [...new Set(all)].filter(el=>visible(el)&&!el.closest("#pixelsquad")&&!el.closest("#pixelsquad-toast"));
}
function cleanText(el){const c=el.cloneNode(true);c.querySelectorAll(".pixelsquad-translation,.pixelsquad-translation-original,[aria-hidden='true']").forEach(x=>x.remove());return String(c.innerText||c.textContent||"").replace(/\s+/g," ").trim()}
async function decorateMessage(el){
 if(!cfg.enabled||!cfg.incoming||el.dataset.psTranslated==="1")return;
 const text=cleanText(el);if(!text||text.length<2||text.length>500||/^[:/]/.test(text)||isRecentOutgoing(text))return;
 el.dataset.psTranslated="1";
 try{const r=await translate(text,cfg.target,cfg.source);if(!r.text||r.text===text)return;const w=document.createElement("div");w.className="pixelsquad-translation";w.textContent=r.text;w.title="PixelSquad • tradução automática";if(cfg.showOriginal){const s=document.createElement("span");s.className="pixelsquad-translation-original";s.textContent="↳ "+text;w.appendChild(s)}el.appendChild(w)}catch{el.dataset.psTranslated="0"}
}
let observer=null,scanTimer=0;
function startObserver(){
 if(observer)return;
 observer=new MutationObserver(ms=>{clearTimeout(scanTimer);scanTimer=setTimeout(()=>{if(!cfg.enabled||!cfg.incoming)return;const list=[];for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1){list.push(...chatCandidates(n));if(n.matches?.("[data-message-id],[data-message],[class*='chat-message'],[class*='chatMessage'],[class*='message-container'],[class*='messageContainer'],[class*='bubble']"))list.push(n)}list.slice(-20).forEach(decorateMessage)},180)});
 observer.observe(document.body,{subtree:true,childList:true});setTimeout(()=>chatCandidates().slice(-30).forEach(decorateMessage),700);
}
function stopObserver(){observer?.disconnect();observer=null}
function findInput(){
 const ss=['textarea[placeholder*="falar" i]','textarea[placeholder*="digite" i]','textarea[placeholder*="mensagem" i]','textarea[aria-label*="chat" i]','input[placeholder*="falar" i]','input[placeholder*="digite" i]','input[placeholder*="mensagem" i]','[contenteditable="true"][role="textbox"]','[contenteditable="true"]'];
 for(const s of ss){const e=[...document.querySelectorAll(s)].find(visible);if(e)return e}return null;
}
const valueOf=input=>input?.isContentEditable?String(input.innerText||""):String(input?.value||"");
function setValue(input,value){
 input.focus();
 if(input.isContentEditable){input.textContent=value;input.dispatchEvent(new InputEvent("input",{bubbles:true,composed:true,inputType:"insertText",data:value}))}
 else{const p=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,s=Object.getOwnPropertyDescriptor(p,"value")?.set;s?s.call(input,value):input.value=value;input.dispatchEvent(new InputEvent("input",{bubbles:true,composed:true,inputType:"insertText",data:value}))}
 input.dispatchEvent(new Event("change",{bubbles:true,composed:true}));
}
function sendButton(input){const near=input?.closest("form")||input?.parentElement?.parentElement||input?.parentElement;return [...(near?.querySelectorAll("button")||[])].find(b=>b.type==="submit"||/enviar|send/i.test((b.getAttribute("aria-label")||"")+" "+(b.getAttribute("title")||"")+" "+(b.textContent||"")))}
let busy=false;
async function translateOutgoing(input){if(busy||!cfg.enabled||!cfg.outgoing||!input)return false;const text=valueOf(input).trim();if(!text||/^[:/]/.test(text))return false;busy=true;try{const r=await translate(text,cfg.target,cfg.source);if(r.text!==text){setValue(input,r.text);rememberOutgoing(r.text)}return true}catch{return false}finally{busy=false}}
function installOutgoing(){
 document.addEventListener("keydown",async e=>{if(e.key!=="Enter"||e.shiftKey||!cfg.enabled||!cfg.outgoing)return;const input=e.target?.closest?.("textarea,input,[contenteditable='true']");if(!input||input.dataset.psSending==="1")return;const text=valueOf(input).trim();if(!text||/^[:/]/.test(text))return;e.preventDefault();e.stopImmediatePropagation();input.dataset.psSending="1";try{await translateOutgoing(input);const form=input.closest("form"),btn=sendButton(input);if(btn)btn.click();else if(form?.requestSubmit)form.requestSubmit();else input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:true,cancelable:true}))}finally{setTimeout(()=>delete input.dataset.psSending,100)}},true);
 document.addEventListener("click",async e=>{if(!cfg.enabled||!cfg.outgoing)return;const btn=e.target?.closest?.("button");if(!btn)return;if(!/enviar|send/i.test((btn.getAttribute("aria-label")||"")+" "+(btn.getAttribute("title")||"")+" "+(btn.textContent||"")))return;const input=findInput();if(!input||input.dataset.psSending==="1")return;const text=valueOf(input).trim();if(!text||/^[:/]/.test(text))return;e.preventDefault();e.stopImmediatePropagation();input.dataset.psSending="1";try{await translateOutgoing(input);btn.click()}finally{setTimeout(()=>delete input.dataset.psSending,100)}},true);
}
window.PixelSquadTranslate={langs,getConfig,setConfig,translate,rememberOutgoing,startObserver,stopObserver,findInput,valueOf,setValue};
installOutgoing();if(cfg.enabled)startObserver();
})();