(()=>{
  if(window.__PIXELSQUAD_TOOLSBLET__) return;
  window.__PIXELSQUAD_TOOLSBLET__=true;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const idFrom=(el,text,src)=>{
    const vals=[el?.getAttribute?.('data-id'),el?.getAttribute?.('data-enable-id'),el?.getAttribute?.('data-handitem'),el?.getAttribute?.('data-code'),el?.id,text,src];
    for(const v of vals){const m=String(v||'').match(/(?:^|[^0-9])(\d{1,6})(?:[^0-9]|$)/);if(m)return Number(m[1]);}
    return null;
  };
  function collect(){
    const root=document.querySelector('main')||document.body;
    const out=[];const seen=new Set();
    root.querySelectorAll('img').forEach(img=>{
      const src=img.currentSrc||img.src||img.getAttribute('src')||'';
      if(!src||src.startsWith('data:')) return;
      let el=img,best=null;
      for(let i=0;i<6&&el;i++,el=el.parentElement){
        const txt=clean(el.innerText||el.textContent);
        if(txt&&txt.length<=180&&el.querySelectorAll('img').length<=2){best={el,txt};break;}
      }
      const text=best?.txt||clean(img.alt||'');
      const id=idFrom(best?.el||img,text,src);
      if(id===null)return;
      const key=id+'|'+src;if(seen.has(key))return;seen.add(key);
      let name=text.replace(/\b(?:enable|handitem|id|codigo|código)\b[:#-]?\s*\d+/ig,'').trim();
      if(!name)name=img.alt||('Handitem '+id);
      out.push({id,name:clean(name),image:src,source:'ToolsBlet',importedAt:Date.now()});
    });
    return out.sort((a,b)=>a.id-b.id);
  }
  function run(){const items=collect();if(items.length)chrome.storage.local.set({pixelsquad_enables:items,pixelsquad_enables_imported_at:Date.now()});console.log('[PixelSquad] ToolsBlet: '+items.length+' itens encontrados.');}
  setTimeout(run,1200);setTimeout(run,3000);setTimeout(run,6000);
  new MutationObserver(()=>{clearTimeout(window.__PS_TOOLS_TIMER);window.__PS_TOOLS_TIMER=setTimeout(run,700);}).observe(document.documentElement,{childList:true,subtree:true});
})();