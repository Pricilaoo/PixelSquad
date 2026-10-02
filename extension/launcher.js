(() => {
  if (window.PixelSquadLauncher) return;
  window.PixelSquadLauncher = {
    movable(button) {
      const key = 'pixelsquad_launcher_position';
      let saved = null, drag = null, suppressClick = false;
      try {saved = JSON.parse(localStorage.getItem(key) || 'null');} catch {}
      const position = (x, y) => {
        const box = button.getBoundingClientRect();
        x = Math.round(Math.max(8, Math.min(Math.max(8, innerWidth - box.width - 8), x)));
        y = Math.round(Math.max(8, Math.min(Math.max(8, innerHeight - box.height - 8), y)));
        button.classList.add('ps-launch-moved');
        button.style.setProperty('left', x + 'px', 'important');
        button.style.setProperty('top', y + 'px', 'important');
        button.style.setProperty('right', 'auto', 'important');
        button.style.setProperty('bottom', 'auto', 'important');
        try {localStorage.setItem(key, JSON.stringify({x, y}));} catch {}
      };
      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) position(saved.x, saved.y);
      button.title = 'PixelSquad • clique para abrir ou fechar • arraste para mover • comando :pixel';
      button.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        suppressClick = false;
        const box = button.getBoundingClientRect();
        drag = {id: event.pointerId, startX: event.clientX, startY: event.clientY, x: box.left, y: box.top, moved: false};
        button.setPointerCapture?.(event.pointerId);
      });
      button.addEventListener('pointermove', event => {
        if (drag?.id !== event.pointerId) return;
        const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        drag.moved = true; event.preventDefault(); position(drag.x + dx, drag.y + dy);
      });
      const finish = event => {
        if (drag?.id !== event.pointerId) return;
        suppressClick = drag.moved; drag = null;
        if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
      };
      button.addEventListener('pointerup', finish);
      button.addEventListener('pointercancel', finish);
      button.addEventListener('click', event => {
        if (!suppressClick || event.detail === 0) return;
        suppressClick = false; event.preventDefault(); event.stopImmediatePropagation();
      }, true);
      button.addEventListener('lostpointercapture', () => {if (drag) {suppressClick = drag.moved; drag = null;}});
      window.addEventListener('resize', () => {
        if (button.classList.contains('ps-launch-moved')) {
          const rect = button.getBoundingClientRect(); position(rect.left, rect.top);
        }
      });
    }
  };
})();
