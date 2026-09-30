import { PRESETS, OPTIONS, LABELS, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, sanitizeLook } from '../../shared/looks.js';

// Start menu: your farmer (12 ready-made or your own), Play solo, Online.
export function startMenu(game) {
  const $ = id => document.getElementById(id);
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let look = sanitizeLook(load('rf-look', 'zino'));
  let custom = sanitizeLook(load('rf-custom', { ...PRESETS.zino, name: 'My farmer', from: 'Made by me' }));
  const portraits = game.portraits();
  let customPortrait = null;

  function showMine() {
    const preset = Object.entries(PRESETS).find(([, p]) => p.name === look.name && p.hat === look.hat);
    $('myPortrait').src = preset ? portraits[preset[0]] : (customPortrait ||= game.portrait(look));
    $('myName').textContent = look.name;
    $('myFrom').textContent = look.from || '';
  }
  function choose(l) { look = sanitizeLook(l); save('rf-look', look); showMine(); }

  // ---- picker: 12 farmers + make your own ----
  function renderGrid() {
    $('farmerGrid').innerHTML = Object.entries(PRESETS).map(([k, p]) => `
      <button class="farmer-card small" data-preset="${k}" aria-checked="${p.name === look.name}">
        <img alt="" src="${portraits[k]}"><b>${p.name}</b><span>${p.from}</span></button>`).join('') + `
      <button class="farmer-card small make" data-make aria-checked="${look.name === custom.name && !Object.values(PRESETS).some(p => p.name === look.name)}">
        <img alt="" src="${customPortrait || game.portrait(custom)}"><b>Make your own</b><span>${custom.name}</span></button>`;
  }
  $('changeFarmer').onclick = $('myFarmer').onclick = () => { renderGrid(); $('farmerSheet').hidden = false; };
  document.querySelector('[data-close-farmer]').onclick = () => { $('farmerSheet').hidden = true; };
  $('farmerGrid').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.make !== undefined) { openCreator(); return; }
    choose(PRESETS[b.dataset.preset]); renderGrid();
  };

  // ---- creator ----
  const swatches = (field, colors) => `<div class="opt"><h4>${{ skin: 'Skin', hairColor: 'Hair colour', hatColor: 'Hat colour', top: 'Shirt colour', bottomColor: 'Trousers / skirt colour' }[field]}</h4><div class="sw-row">
    ${colors.map(c => `<button class="swatch ${custom[field] === c ? 'on' : ''}" style="background:${c}" data-field="${field}" data-v="${c}" aria-label="${c}"></button>`).join('')}</div></div>`;
  const chips = field => `<div class="opt"><h4>${{ hair: 'Hair', facial: 'Beard', hat: 'Headwear', pattern: 'Shirt pattern', bottom: 'Clothes' }[field]}</h4><div class="chip-row">
    ${OPTIONS[field].map(v => `<button class="chip ${custom[field] === v ? 'on' : ''}" data-field="${field}" data-v="${v}">${LABELS[field][v]}</button>`).join('')}</div></div>`;
  function renderCreator() {
    $('creatorOpts').innerHTML = swatches('skin', SKIN_TONES) + chips('hair') + swatches('hairColor', HAIR_COLORS) + chips('facial') +
      chips('hat') + swatches('hatColor', CLOTH_COLORS) + swatches('top', CLOTH_COLORS) + chips('pattern') + chips('bottom') + swatches('bottomColor', CLOTH_COLORS);
    $('creatorImg').src = game.portrait(custom);
  }
  function openCreator() { $('farmerSheet').hidden = true; $('creatorSheet').hidden = false; $('lookName').value = custom.name; renderCreator(); }
  $('creatorOpts').onclick = e => {
    const b = e.target.closest('[data-field]'); if (!b) return;
    custom = sanitizeLook({ ...custom, [b.dataset.field]: b.dataset.v });
    renderCreator();
  };
  $('lookName').oninput = e => { custom.name = e.target.value.slice(0, 20) || 'My farmer'; };
  document.querySelector('[data-back-farmer]').onclick = () => { $('creatorSheet').hidden = true; renderGrid(); $('farmerSheet').hidden = false; };
  document.querySelector('[data-save-look]').onclick = () => {
    custom = sanitizeLook({ ...custom, from: 'Made by me' });
    save('rf-custom', custom); customPortrait = game.portrait(custom);
    choose(custom); $('creatorSheet').hidden = true;
  };

  showMine();
  $('playBtn').onclick = () => game.play(look);
  $('howBtn').onclick = () => { $('howSheet').hidden = false; };
  document.querySelector('[data-close-how]').onclick = () => { $('howSheet').hidden = true; };
  return { look: () => look };
}
