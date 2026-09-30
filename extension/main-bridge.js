(()=>{if(window.__PIXELSQUAD_MAIN_BRIDGE__)return;window.__PIXELSQUAD_MAIN_BRIDGE__=true;
const clean=s=>String(s||"").trim();
function visible(el){if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0}
function chatInput(){
 const ss=['textarea[placeholder*="falar" i]','textarea[placeholder*="digite" i]','textarea[placeholder*="mensagem" i]','input[placeholder*="falar" i]','input[placeholder*="digite" i]','input[placeholder*="mensagem" i]','[contenteditable="true"][role="textbox"]','[contenteditable="true"]'];
 for(const s of ss){const e=[...document.querySelectorAll(s)].find(visible);if(e)return e}
 return [...document.querySelectorAll('textarea,input[type="text"],[contenteditable="true"]')].filter(visible).filter(e=>!/(senha|email|login|pesquisar|buscar|search)/i.test(e.getAttribute("placeholder")||"")).sort((a,b)=>b.getBoundingClientRect().top-a.getBoundingClientRect().top)[0]||null
}
function reactProps(el){return Object.keys(el||{}).filter(k=>k.startsWith("__reactProps$")).map(k=>el[k]).find(Boolean)||null}
function setValue(el,value){
 el.focus();
 if(el.isContentEditable)el.textContent=value;
 else {const p=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const s=Object.getOwnPropertyDescriptor(p,"value")?.set;s?s.call(el,value):el.value=value}
 el.dispatchEvent(new InputEvent("input",{bubbles:true,composed:true,inputType:"insertText",data:value}));
 el.dispatchEvent(new Event("change",{bubbles:true,composed:true}));
}
function clickReact(el){
 const p=reactProps(el);
 if(p?.onClick){try{p.onClick({target:el,currentTarget:el,nativeEvent:new MouseEvent("click",{bubbles:true}),button:0,bubbles:true,preventDefault(){},stopPropagation(){}});return "react"}catch{}}
 el.click();return "dom"
}
function sendChat(command){
 const input=chatInput();if(!input)return {ok:false,error:"chat-input-not-found"};
 setValue(input,command);
 const form=input.closest("form");
 const near=form||input.parentElement?.parentElement||input.parentElement;
 const buttons=[...(near?.querySelectorAll("button")||[])];
 const btn=buttons.find(b=>b.type==="submit"||/enviar|send/i.test((b.getAttribute("aria-label")||"")+" "+(b.getAttribute("title")||"")+" "+clean(b.textContent)));
 if(btn)return {ok:true,method:"chat-"+clickReact(btn),tag:input.tagName};
 if(form?.requestSubmit){form.requestSubmit();return {ok:true,method:"chat-form",tag:input.tagName}}
 input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:true,cancelable:true,composed:true}));
 input.dispatchEvent(new KeyboardEvent("keyup",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:true,composed:true}));
 return {ok:true,method:"chat-keyboard",tag:input.tagName}
}
function findDirectSit(){
 const exact=["sitAvatar","doSit","setSit","toggleSit","sit"];
 for(const name of exact){try{if(typeof window[name]==="function")return {fn:window[name],name}}catch{}}
 const seen=new Set(),queue=[];
 for(const k of Object.keys(window)){try{const v=window[k];if(v&&typeof v==="object"&&v!==window)queue.push([k,v,0])}catch{}}
 while(queue.length){
  const [path,obj,depth]=queue.shift();if(!obj||seen.has(obj)||depth>2)continue;seen.add(obj);
  for(const k of Object.keys(obj)){
   let v;try{v=obj[k]}catch{continue}
   if(typeof v==="function"&&/^(sit|doSit|setSit|toggleSit)$/i.test(k))return {fn:v.bind(obj),name:path+"."+k};
   if(v&&typeof v==="object"&&depth<2)queue.push([path+"."+k,v,depth+1])
  }
 }
 return null
}
function send(command){
 const value=clean(command);
 if(value===":sit"){const hit=findDirectSit();if(hit){try{hit.fn();return {ok:true,method:"client-"+hit.name}}catch{}}}
 return sendChat(value);
}
window.addEventListener("message",e=>{
 if(e.source!==window||e.data?.source!=="pixelsquad")return;
 if(e.data.type==="PS_COMMAND"){let r;try{r=send(clean(e.data.command))}catch(err){r={ok:false,error:String(err?.message||err)}}window.postMessage({source:"pixelsquad",type:"PS_RESULT",requestId:e.data.requestId,result:r},"*")}
 if(e.data.type==="PS_INSPECT"){window.postMessage({source:"pixelsquad",type:"PS_INSPECT_RESULT",requestId:e.data.requestId,result:{url:location.href,inputs:[...document.querySelectorAll("input,textarea,[contenteditable=true]")].filter(visible).slice(-12).map(e=>({tag:e.tagName,placeholder:e.getAttribute("placeholder")||"",aria:e.getAttribute("aria-label")||"",type:e.getAttribute("type")||""}))}},"*")}
});
})();