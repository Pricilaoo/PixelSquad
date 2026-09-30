(()=>{ 
if(window.__PIXELSQUAD_TOOLSBLET__)return;
window.__PIXELSQUAD_TOOLSBLET__=true;
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const pageType=()=>location.pathname.toLowerCase().includes("handitems")?"handitems":"enables";
const storageKey=()=>pageType()==="handitems"?"pixelsquad_handitems":"pixelsquad_enables";
const typeName=()=>pageType()==="handitems"?"Handitem":"Enable";
const idFrom=(el,text,src)=>{
 const vals=[
  el?.getAttribute?.("data-id"),el?.getAttribute?.("data-enable-id"),
  el?.getAttribute?.("data-handitem"),el?.getAttribute?.("data-handitem-id"),
  el?.getAttribute?.("data-code"),el?.getAttribute?.("data-item-id"),
  el?.id,text,src
 ];
 for(const v of vals){
  const s=String(v||"");
  const m=s.match(/(?:^|[^0-9])(\d{1,6})(?:[^0-9]|$)/);
  if(m)return Number(m[1]);
 }
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
  if(!src||src.startsWith("data:"))return;
  let el=img,best=img;
  for(let i=0;i<7&&el;i++,el=el.parentElement){
   const t=clean(el.innerText||el.textContent);
   if(t&&t.length<=220){best=el;if(el.querySelectorAll("img").length<=2)break;}
  }
  const text=clean(best.innerText||best.textContent||img.alt||"");
  const id=idFrom(best,text,src);
  if(id===null)return;
  const name=nameFrom(best,img,id);
  const key=id+"|"+src;
  if(seen.has(key))return;
  seen.add(key);
  out.push({id,name,image:src,source:"ToolsBlet",type:pageType(),importedAt:Date.now()});
 });
 return out.sort((a,b)=>a.id-b.id);
}
let timer=0;
function clickShowAll(){
 const buttons=[...document.querySelectorAll("button,a,[role=button]")];
 const hit=buttons.find(e=>/^\s*mostrar\s+todos\s*$/i.test(clean(e.innerText||e.textContent)));
 if(hit){try{hit.click()}catch{}}
}
function run(){
 clickShowAll();
 const items=collect();
 if(items.length){
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