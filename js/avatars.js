/* ============================================================
   WordBubbles — minimal geometric avatars (monochrome, currentColor)
   ============================================================ */
const AVATARS = [
  { id: 'dot',   svg: '<circle cx="50" cy="50" r="32"/>' },
  { id: 'ring',  svg: '<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="11"/>' },
  { id: 'sq',    svg: '<rect x="20" y="20" width="60" height="60" rx="10"/>' },
  { id: 'tri',   svg: '<path d="M50 16 L86 80 H14 Z"/>' },
  { id: 'dia',   svg: '<path d="M50 12 L88 50 L50 88 L12 50 Z"/>' },
  { id: 'moon',  svg: '<path d="M64 14 a38 38 0 1 0 0 72 a30 30 0 1 1 0 -72 Z"/>' },
  { id: 'star',  svg: '<path d="M50 12 L61 39 L90 40 L67 58 L75 86 L50 69 L25 86 L33 58 L10 40 L39 39 Z"/>' },
  { id: 'wave',  svg: '<path d="M10 54 q16 -24 32 0 t32 0 t16 -14" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>' },
  { id: 'plus',  svg: '<path d="M42 14 h16 v28 h28 v16 h-28 v28 h-16 v-28 h-28 v-16 h28 Z"/>' },
  { id: 'dots',  svg: '<circle cx="32" cy="32" r="15"/><circle cx="68" cy="32" r="15"/><circle cx="32" cy="68" r="15"/><circle cx="68" cy="68" r="15"/>' }
];

function avatarSvg(id) {
  const a = AVATARS.find(x => x.id === id) || AVATARS[0];
  return '<svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">' + a.svg + '</svg>';
}
