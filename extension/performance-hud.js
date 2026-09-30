(() => {
  if (window.__PIXELSQUAD_PERFORMANCE_HUD__) return;
  window.__PIXELSQUAD_PERFORMANCE_HUD__ = true;
  let hud = null, fpsNode, pingNode, raf = null, poll = null;
  let frames = 0, began = null, ping = null, pingAt = performance.now(), status = 'waiting', suspended = false;
  const ready = () => !suspended && !document.hidden && !!document.querySelector('.nitro-toolbar');
  function pingText() {
    if (ping !== null && performance.now() - pingAt < 15000) return `Ping ${ping} ms • ${ping <= 100 ? 'Bom' : ping <= 200 ? 'Normal' : 'Ruim'}`;
    return status === 'disconnected' ? 'Ping desconectado' : status === 'waiting' && performance.now() - pingAt < 15000 ? 'Ping medindo…' : 'Ping indisponível';
  }
  function updatePing() {
    if (!pingNode) return;
    pingNode.textContent = pingText();
    const fresh = ping !== null && performance.now() - pingAt < 15000;
    pingNode.dataset.quality = fresh ? ping <= 100 ? 'good' : ping <= 200 ? 'normal' : 'bad' : 'unknown';
  }
  function frame(now) {
    raf = null;
    if (!ready()) { sync(); return; }
    if (began === null) began = now;
    else frames++;
    const elapsed = now - began;
    if (elapsed >= 1000) {
      fpsNode.textContent = `FPS ${Math.round(frames * 1000 / elapsed)}`;
      frames = 0; began = now; updatePing();
    }
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    if (!ready()) {
      if (hud) hud.hidden = true;
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null; frames = 0; began = null; return;
    }
    if (!hud) {
      hud = document.createElement('div'); hud.id = 'pixelsquad-performance';
      hud.setAttribute('role', 'group'); hud.setAttribute('aria-label', 'Desempenho do jogo');
      hud.title = 'FPS: quadros da página do jogo por segundo. Ping: ida e volta até o servidor do jogo.';
      fpsNode = document.createElement('span'); fpsNode.textContent = 'FPS medindo…';
      pingNode = document.createElement('span');
      pingNode.title = 'Latência até o servidor do jogo: bom até 100 ms; normal de 101 a 200 ms; ruim acima de 200 ms.';
      hud.append(fpsNode, pingNode); document.body.appendChild(hud);
    }
    if (hud.hidden) fpsNode.textContent = 'FPS medindo…';
    hud.hidden = false; updatePing();
    if (raf === null) raf = requestAnimationFrame(frame);
  }
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'pixelsquad-performance') return;
    const value = event.data.ping;
    ping = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 10000 ? value : null;
    pingAt = performance.now(); status = event.data.status;
    updatePing();
  });
  document.addEventListener('visibilitychange', () => { frames = 0; began = null; sync(); });
  const start = () => { if (!poll) poll = setInterval(sync, 1000); sync(); };
  window.addEventListener('pagehide', () => { suspended = true; clearInterval(poll); poll = null; sync(); });
  window.addEventListener('pageshow', () => { suspended = false; start(); });
  start();
})();
