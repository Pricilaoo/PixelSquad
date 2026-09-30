(()=>{if(window.__PIXELSQUAD_LOADING__)return;window.__PIXELSQUAD_LOADING__=true;
const start=()=>{
  if(document.getElementById("pixelsquad-loading"))return;
  const overlay=document.createElement("div");
  overlay.id="pixelsquad-loading";
  overlay.setAttribute("aria-hidden","true");
  overlay.style.cssText=[
    "position:fixed","inset:0","z-index:2147483646","display:flex",
    "align-items:center","justify-content:center","background:#000",
    "pointer-events:none","opacity:1","transition:opacity .22s ease",
    "contain:strict","overflow:hidden"
  ].join(";");
  const img=document.createElement("img");
  img.src=chrome.runtime.getURL("icons/pixelsquad-loading.gif");
  img.alt="";
  img.width=240;
  img.height=245;
  img.decoding="async";
  img.setAttribute("fetchpriority","high");
  img.style.cssText="display:block;width:240px;height:auto;max-width:46vw;image-rendering:auto;";
  overlay.appendChild(img);
  (document.documentElement||document.body).appendChild(overlay);
  let hidden=false;
  const hide=()=>{
    if(hidden)return;
    hidden=true;
    overlay.style.opacity="0";
    setTimeout(()=>overlay.remove(),260);
  };
  window.addEventListener("load",()=>setTimeout(hide,120),{once:true});
  setTimeout(hide,4200);
};
if(document.documentElement)start();else document.addEventListener("DOMContentLoaded",start,{once:true});
})();