(()=>{ 
if(window.__PIXELSQUAD_TOOLSBLET__)return;
window.__PIXELSQUAD_TOOLSBLET__=true;
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const pageType=()=>location.pathname.toLowerCase().includes("handitems")?"handitems":"enables";
const storageKey=()=>pageType()==="handitems"?"pixelsquad_handitems":"pixelsquad_enables";
const typeName=()=>pageType()==="handitems"?"Handitem":"Enable";
const idFrom=(el,text,src)=>{
 for(const key of ['data-id','data-enable-id','data-handitem','data-handitem-id','data-code','data-item-id']){
  const value=el?.getAttribute?.(key);if(/^\d{1,6}$/.test(value||''))return Number(value);
 }
 const label=String(text||'').match(/(?:\b(?:id|enable|handitem|código|codigo)\s*[:#-]?\s*|#)(\d{1,6})\b/i);
 if(label)return Number(label[1]);
 try{const path=new URL(src).pathname,match=path.match(/(?:^|\/)(\d{1,6})\.(?:png|gif|webp|jpe?g)$/i);if(match)return Number(match[1]);}catch{}
 return null;
};
const nameFrom=(el,img,id)=>{
 let t=clean(el?.innerText||el?.textContent||"");
 t=t.replace(/\b(?:enable|enables|handitem|handitems|id|codigo|código|número|numero)\b\s*[:#-]?\s*\d+/ig,"").trim();
 if(!t)t=clean(img?.alt||"");
 if(!t)t=typeName()+" "+id;
 return t.slice(0,120);
};
function collect(){
 const root=document.querySelector("main")||document.body;
 const out=[],seen=new Set();
 root.querySelectorAll("img").forEach(img=>{
  const src=img.currentSrc||img.src||img.getAttribute("src")||"";
  if(!/^https:\/\//.test(src)||/loading|carregando|logo|parceiro/i.test(src+" "+img.alt))return;
  let el=img,best=img;
  for(let i=0;i<7&&el;i++,el=el.parentElement){
   const t=clean(el.innerText||el.textContent);
   if(t&&t.length<=220){best=el;if(el.querySelectorAll("img").length<=2)break;}
  }
  const text=clean(best.innerText||best.textContent||img.alt||"");
  const id=idFrom(best,text,src);
  if(id===null)return;
  const name=nameFrom(best,img,id);
  const key=String(id);
  if(seen.has(key))return;
  seen.add(key);
  out.push({id,name,image:src,source:"ToolsBlet",type:pageType(),importedAt:Date.now()});
 });
 return out.sort((a,b)=>a.id-b.id);
}
let timer=0,showAllClicked=false;
function clickShowAll(){
 const checkbox=[...document.querySelectorAll('input[type=checkbox],[role=checkbox]')].find(el=>/mostrar\s+todos/i.test(el.getAttribute('aria-label')||el.closest('label')?.textContent||el.parentElement?.textContent||''));
 if(checkbox){if(checkbox.checked!==true&&checkbox.getAttribute('aria-checked')!=='true')checkbox.click();return;}
 const buttons=[...document.querySelectorAll("button,a,[role=button]")];
 const hit=buttons.find(e=>/^\s*mostrar\s+todos\s*$/i.test(clean(e.innerText||e.textContent)));
 if(hit&&!showAllClicked){showAllClicked=true;try{hit.click()}catch{}}
}
let lastSignature="";
function run(){
 clickShowAll();
 const items=collect();
 const signature=JSON.stringify(items.map(({id,image,name})=>({id,image,name})));
 if(items.length&&signature!==lastSignature){
  lastSignature=signature;
  chrome.storage.local.set({
   [storageKey()]:items,
   ["pixelsquad_"+pageType()+"_imported_at"]:Date.now()
  });
 }
 console.log("[PixelSquad] ToolsBlet "+typeName()+": "+items.length+" itens encontrados.");
}
setTimeout(run,800);setTimeout(run,1800);setTimeout(run,3500);setTimeout(run,6500);
new MutationObserver(()=>{
 clearTimeout(timer);
 timer=setTimeout(run,600);
}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener("scroll",()=>{clearTimeout(timer);timer=setTimeout(run,500)},{passive:true});
})();