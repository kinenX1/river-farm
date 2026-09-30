// Start menu: pick your farmer, then Play. The world keeps running behind it.
export function startMenu(game) {
  const $ = id => document.getElementById(id);
  let skin = 'zino';
  try { skin = localStorage.getItem('rf-skin') || 'zino'; } catch {}

  const portraits = game.portraits();
  document.querySelectorAll('[data-portrait]').forEach(img => img.src = portraits[img.dataset.portrait]);

  const cards = [...document.querySelectorAll('.farmer-card')];
  const select = s => {
    skin = s;
    cards.forEach(c => c.setAttribute('aria-checked', c.dataset.skin === s));
    try { localStorage.setItem('rf-skin', s); } catch {}
  };
  cards.forEach(c => c.onclick = () => select(c.dataset.skin));
  select(skin);

  $('playBtn').onclick = () => game.play(skin);
  $('howBtn').onclick = () => { $('howSheet').hidden = false; };
  document.querySelector('[data-close-how]').onclick = () => { $('howSheet').hidden = true; };
  return { skin: () => skin };
}
