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
 if(el.isContentEditable){el.textContent=value}
 else {const p=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const s=Object.getOwnPropertyDescriptor(p,"value")?.set;s?s.call(el,value):el.value=value}
 const props=reactProps(el);
 const ev={target:el,currentTarget:el,nativeEvent:{target:el},type:"change",bubbles:true};
 if(props?.onChange)props.onChange(ev); else if(props?.onInput)props.onInput({...ev,type:"input"});
 el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));
}
function clickReact(el){
 const p=reactProps(el);
 if(p?.onClick){p.onClick({target:el,currentTarget:el,button:0,bubbles:true,preventDefault(){},stopPropagation(){}});return "react"}
 el.click();return "dom"
}
function send(command){
 const input=chatInput();if(!input)return {ok:false,error:"chat-input-not-found"};
 setValue(input,command);
 const form=input.closest("form");
 const near=form||input.parentElement?.parentElement||input.parentElement;
 const buttons=[...(near?.querySelectorAll("button")||[])];
 const btn=buttons.find(b=>b.type==="submit"||/enviar|send|chat/i.test((b.getAttribute("aria-label")||"")+" "+(b.getAttribute("title")||"")+" "+clean(b.textContent)));
 if(btn)return {ok:true,method:clickReact(btn),tag:input.tagName};
 if(form?.requestSubmit){form.requestSubmit();return {ok:true,method:"form",tag:input.tagName}}
 for(const t of ["keydown","keypress","keyup"])input.dispatchEvent(new KeyboardEvent(t,{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:true,cancelable:true,composed:true}));
 return {ok:true,method:"keyboard",tag:input.tagName};
}
window.addEventListener("message",e=>{
 if(e.source!==window||e.data?.source!=="pixelsquad")return;
 if(e.data.type==="PS_COMMAND"){let r;try{r=send(clean(e.data.command))}catch(err){r={ok:false,error:String(err?.message||err)}}window.postMessage({source:"pixelsquad",type:"PS_RESULT",requestId:e.data.requestId,result:r},"*")}
 if(e.data.type==="PS_INSPECT"){window.postMessage({source:"pixelsquad",type:"PS_INSPECT_RESULT",requestId:e.data.requestId,result:{url:location.href,inputs:[...document.querySelectorAll("input,textarea,[contenteditable=true]")].filter(visible).slice(-12).map(e=>({tag:e.tagName,placeholder:e.getAttribute("placeholder")||"",aria:e.getAttribute("aria-label")||"",type:e.getAttribute("type")||""}))}},"*")}
});
})();