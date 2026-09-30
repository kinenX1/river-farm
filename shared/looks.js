// What a farmer looks like. A "look" is a small plain object so it can travel
// over the network and be saved. The 12 ready-made farmers are presets; the
// character creator edits the same fields.

export const SKIN_TONES = ['#f7d7c0', '#f2c29b', '#e0a878', '#c98e5c', '#a86d43', '#8a5533', '#6b3f24', '#4a2a17'];
export const HAIR_COLORS = ['#1c1410', '#3b2414', '#6b4424', '#a9501f', '#d9a441', '#e8dcc0', '#f1f1ee', '#7a7a7a'];
export const CLOTH_COLORS = ['#e4dcc0', '#ffffff', '#c8632b', '#b8372a', '#d94a8a', '#e8a33a', '#f2d24a', '#5aa34a', '#2e7d4f', '#3a5a8c', '#274a7a', '#6a3d8f', '#6b5236', '#3b2a20', '#222222', '#8a8f94'];

export const OPTIONS = {
  hair: ['short', 'bald', 'long', 'bun', 'curly', 'braid'],
  facial: ['none', 'mustache', 'beard', 'fullbeard', 'goatee'],
  hat: ['none', 'straw', 'cap', 'turban', 'keffiyeh', 'ushanka', 'headwrap', 'kufi', 'hijab', 'headscarf', 'kasa', 'wide'],
  pattern: ['plain', 'plaid', 'stripes', 'kente', 'floral', 'embroidered'],
  bottom: ['overalls', 'trousers', 'robe', 'skirt'],
};
export const LABELS = {
  hair: { short: 'Short', bald: 'Bald', long: 'Long', bun: 'Bun', curly: 'Curly', braid: 'Braid' },
  facial: { none: 'None', mustache: 'Mustache', beard: 'Beard', fullbeard: 'Big beard', goatee: 'Goatee' },
  hat: { none: 'None', straw: 'Straw hat', cap: 'Cap', turban: 'Turban', keffiyeh: 'Keffiyeh', ushanka: 'Ushanka', headwrap: 'Head wrap', kufi: 'Kufi', hijab: 'Hijab', headscarf: 'Headscarf', kasa: 'Kasa hat', wide: 'Wide hat' },
  pattern: { plain: 'Plain', plaid: 'Plaid', stripes: 'Stripes', kente: 'Kente', floral: 'Flowers', embroidered: 'Embroidered' },
  bottom: { overalls: 'Overalls', trousers: 'Trousers', robe: 'Long robe', skirt: 'Skirt' },
};

const L = (name, from, o) => ({ name, from, skin: SKIN_TONES[1], hair: 'short', hairColor: HAIR_COLORS[1], facial: 'none', hat: 'none', hatColor: CLOTH_COLORS[0], top: CLOTH_COLORS[0], pattern: 'plain', bottom: 'overalls', bottomColor: CLOTH_COLORS[12], ...o });

export const PRESETS = {
  zino:   L('Mr. Zino', 'The old farmer', { skin: SKIN_TONES[1], hair: 'short', hairColor: '#f1f1ee', facial: 'fullbeard', hat: 'straw', top: '#e4dcc0', bottom: 'overalls', bottomColor: '#6b5236' }),
  copper: L('Mr. Copper', 'The loud farmer', { skin: SKIN_TONES[0], hairColor: '#a9501f', facial: 'mustache', hat: 'cap', hatColor: '#2e7d4f', top: '#c8632b', pattern: 'plaid', bottom: 'overalls', bottomColor: '#3a5a8c' }),
  arjun:  L('Mr. Arjun', 'Punjab, India', { skin: SKIN_TONES[4], hairColor: '#1c1410', facial: 'fullbeard', hat: 'turban', hatColor: '#e8a33a', top: '#ffffff', bottom: 'trousers', bottomColor: '#274a7a' }),
  priya:  L('Mrs. Priya', 'Kerala, India', { skin: SKIN_TONES[4], hair: 'braid', hairColor: '#1c1410', top: '#d94a8a', pattern: 'embroidered', bottom: 'skirt', bottomColor: '#2e7d4f' }),
  khalid: L('Mr. Khalid', 'Oman', { skin: SKIN_TONES[3], hairColor: '#1c1410', facial: 'beard', hat: 'keffiyeh', hatColor: '#ffffff', top: '#ffffff', bottom: 'robe', bottomColor: '#ffffff' }),
  layla:  L('Ms. Layla', 'Jordan', { skin: SKIN_TONES[2], hair: 'long', hairColor: '#1c1410', hat: 'hijab', hatColor: '#274a7a', top: '#c8632b', pattern: 'embroidered', bottom: 'robe', bottomColor: '#c8632b' }),
  ivan:   L('Mr. Ivan', 'Siberia, Russia', { skin: SKIN_TONES[0], hairColor: '#d9a441', facial: 'fullbeard', hat: 'ushanka', hatColor: '#6b4424', top: '#3a5a8c', bottom: 'trousers', bottomColor: '#8a8f94' }),
  olga:   L('Babushka Olga', 'Tula, Russia', { skin: SKIN_TONES[0], hair: 'bun', hairColor: '#e8dcc0', hat: 'headscarf', hatColor: '#b8372a', top: '#274a7a', pattern: 'floral', bottom: 'skirt', bottomColor: '#274a7a' }),
  kwame:  L('Mr. Kwame', 'Kumasi, Ghana', { skin: SKIN_TONES[6], hair: 'short', hairColor: '#1c1410', facial: 'goatee', hat: 'kufi', hatColor: '#f2d24a', top: '#f2d24a', pattern: 'kente', bottom: 'trousers', bottomColor: '#3b2a20' }),
  amara:  L('Mama Amara', 'Enugu, Nigeria', { skin: SKIN_TONES[7], hair: 'curly', hairColor: '#1c1410', hat: 'headwrap', hatColor: '#e8a33a', top: '#5aa34a', pattern: 'stripes', bottom: 'skirt', bottomColor: '#e8a33a' }),
  kenji:  L('Mr. Kenji', 'Niigata, Japan', { skin: SKIN_TONES[1], hairColor: '#1c1410', facial: 'none', hat: 'kasa', top: '#274a7a', pattern: 'stripes', bottom: 'trousers', bottomColor: '#3b2a20' }),
  rosa:   L('Señora Rosa', 'Oaxaca, Mexico', { skin: SKIN_TONES[3], hair: 'braid', hairColor: '#1c1410', hat: 'wide', hatColor: '#e4dcc0', top: '#ffffff', pattern: 'embroidered', bottom: 'skirt', bottomColor: '#b8372a' }),
};

const pick = (list, v, d) => (list.includes(v) ? v : d);
const hex = v => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null);

// Accept a preset key or a look object; always returns a complete, safe look
export function sanitizeLook(input) {
  if (typeof input === 'string') return { ...(PRESETS[input] || PRESETS.zino) };
  const base = PRESETS.zino, o = input && typeof input === 'object' ? input : {};
  return {
    name: typeof o.name === 'string' ? o.name.slice(0, 20) : 'My farmer',
    from: typeof o.from === 'string' ? o.from.slice(0, 30) : '',
    skin: hex(o.skin) || base.skin,
    hair: pick(OPTIONS.hair, o.hair, 'short'),
    hairColor: hex(o.hairColor) || base.hairColor,
    facial: pick(OPTIONS.facial, o.facial, 'none'),
    hat: pick(OPTIONS.hat, o.hat, 'none'),
    hatColor: hex(o.hatColor) || '#e4dcc0',
    top: hex(o.top) || '#e4dcc0',
    pattern: pick(OPTIONS.pattern, o.pattern, 'plain'),
    bottom: pick(OPTIONS.bottom, o.bottom, 'overalls'),
    bottomColor: hex(o.bottomColor) || '#6b5236',
  };
}
