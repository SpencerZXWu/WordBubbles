/* ============================================================
   WordBubbles — build a single standalone HTML file.
   Usage:  node tools/build-standalone.js
   Output: WordBubbles.html  (open it directly, no server needed)
   ============================================================ */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');

/* 1. inline the stylesheet */
const css = read('css/style.css');
html = html.replace(/[ \t]*<link rel="stylesheet" href="css\/style\.css\?v=\d+"\s*\/>\s*\n?/,
  '<style>\n' + css.trim() + '\n  </style>\n');

/* 2. inline every <script src="js/....js"></script> */
let inlined = 0;
html = html.replace(/[ \t]*<script src="js\/([\w-]+)\.js\?v=\d+"><\/script>\s*\n?/g, (m, name) => {
  const code = read('js/' + name + '.js');
  // guard against a literal </script> inside a string breaking the host document
  const safe = code.replace(/<\/script>/gi, '<\\/script>');
  inlined++;
  return '  <script>\n' + safe.trim() + '\n  </script>\n';
});

/* 3. mark it as a bundled build */
html = html.replace('<title>WordBubbles</title>',
  '<title>WordBubbles — standalone</title>');
html = html.replace('</head>',
  '  <!-- Single-file build: CSS and all JS are inlined. No external files needed. -->\n</head>');

const out = path.join(root, 'WordBubbles.html');
fs.writeFileSync(out, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log('inlined scripts:', inlined);
console.log('wrote', out, '(' + kb + ' KB)');
