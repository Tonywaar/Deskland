
'use strict';

/* ======================================================================
   Parameters
   ====================================================================== */
const CELL_W = 76, CELL_H = 100, GRID_X0 = 4, GRID_Y0 = 6, TASKBAR = 48;
const STEP = 5;
const MORPH_MS = 1800;

const QS = new URLSearchParams(location.search);
const WALL = QS.has('wallpaper');      // Wallpaper mode: the desktop host loads this page, and messages come from the host
const PREVIEW = QS.has('preview');     // Preview mode: a thumbnail preview in the settings window (iframe); messages come from the parent page
const NIGHT = QS.has('night');         // Night forest: the same woods, darker colors, no moon disc
const PROTOTYPE_STATS = !WALL && !PREVIEW; // Frame-rate and timing samples are for the standalone prototype only
// Defaults must match the forest theme default in themes.json; grain and quality are not exposed
const P = {
  sigma: 85, warp: 40, edge: 10, wind: 1, birds: 5, grain: 1, quality: 2,   // quality 2: draw at the screen's real pixels (no blurry upscale at 150% zoom)
  debug: false, snap: true, cap30: true,
};
const DEFAULTS = Object.assign({}, P);
const SLIDERS = [
  { key: 'sigma',  label: 'Clearing size', min: 40,  max: 200, step: 1,    fmt: v => v + ' px', act: 'field' },
  { key: 'wind',   label: 'Wind', min: 0,   max: 3,   step: 0.05, fmt: v => '×' + v.toFixed(2) },
  { key: 'birds',  label: 'Birds', min: 0,   max: 12,  step: 1,    fmt: v => String(v) },
];

/* ======================================================================
   Icons and layout data
   ====================================================================== */
const PAGE = '<path d="M12 4h17l9 9v29a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#fbfbfb" stroke="#c4c4c4"/><path d="M29 4v7a2 2 0 0 0 2 2h7z" fill="#dedede"/>';
const LINES = '<path d="M24 20h10M24 25h10M24 30h10M24 35h10" stroke="#c9c9c9" stroke-width="1.6"/>';
const badge = (color, text, size = 11) => `<rect x="4" y="21" width="19" height="19" rx="3" fill="${color}"/><text x="13.5" y="34.5" text-anchor="middle" font-family="Segoe UI,Arial" font-weight="700" font-size="${size}" fill="#fff">${text}</text>`;
const SVG = {
  folder: '<path d="M4 12a3 3 0 0 1 3-3h11l4 4h19a3 3 0 0 1 3 3v2H4z" fill="#e09b1d"/><path d="M4 17h40v20a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#ffc83d"/><path d="M4 17h40v2.5H4z" fill="#ffd978"/>',
  docx: PAGE + LINES + badge('#185abd', 'W'),
  xlsx: PAGE + '<path d="M24 19h11v17H24zM24 24.5h11M24 30h11M29.5 19v17" stroke="#9ac9a9" stroke-width="1.3" fill="none"/>' + badge('#107c41', 'X'),
  pdf:  PAGE + LINES + badge('#d33a2c', 'PDF', 7.5),
  cad:  PAGE + LINES + badge('#2a7fd4', 'DWG', 7),
  txt:  PAGE + '<path d="M16 18h16M16 23h16M16 28h16M16 33h10" stroke="#9a9a9a" stroke-width="1.6"/>',
  png:  PAGE + '<rect x="14" y="17" width="20" height="17" rx="1.5" fill="#8fd0f5"/><path d="M14 30l6-6 5 5 3-3 6 6v1.5a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 14 34z" fill="#3fa35a"/><circle cx="29" cy="21.5" r="2" fill="#fff4b8"/>',
  shot: '<rect x="3" y="13" width="42" height="25" rx="1" fill="#1d2129" stroke="#f2f2f2" stroke-width="1.5"/><rect x="6" y="16" width="14" height="3" fill="#5b8def"/><rect x="6" y="21" width="22" height="2" fill="#6c7280"/><rect x="6" y="25" width="18" height="2" fill="#6c7280"/><rect x="31" y="16" width="11" height="18" fill="#2e3440"/>',
  zip:  PAGE + '<path d="M22 4v4h3v3h-3v3h3v3h-3v3h3v3h-3" stroke="#8a6d3b" stroke-width="2" fill="none"/><rect x="20" y="26" width="7" height="8" rx="1" fill="#8a6d3b"/>',
  bin:  '<path d="M12 14h24l-2.5 27a3 3 0 0 1-3 2.7H17.5a3 3 0 0 1-3-2.7z" fill="rgba(215,235,250,.55)" stroke="rgba(255,255,255,.9)" stroke-width="1.2"/><path d="M10 12.5h28" stroke="rgba(255,255,255,.95)" stroke-width="2.4" stroke-linecap="round"/><path d="M19 19l1 19M24 19v19M29 19l-1 19" stroke="rgba(255,255,255,.7)" stroke-width="1.2"/>',
  pc:   '<rect x="5" y="8" width="38" height="26" rx="2" fill="#1f8fe0" stroke="#bfe3ff" stroke-width="1.5"/><path d="M5 30h38" stroke="#0d5fa8" stroke-width="3"/><path d="M19 34l-2 6h14l-2-6z" fill="#9aa7b4"/>',
};
const APP_COLORS = ['#e8553e','#2f7de1','#18a058','#8b5cf6','#f59e0b','#0ea5a4','#db2777','#334155','#16a34a','#2563eb'];
function appSVG(name) {
  let h = 0; for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return `<rect x="5" y="5" width="38" height="38" rx="9" fill="${APP_COLORS[h % APP_COLORS.length]}"/><path d="M5 14a9 9 0 0 1 9-9h20a9 9 0 0 1 9 9v6H5z" fill="#fff" opacity=".14"/>` +
    `<text x="24" y="31.5" text-anchor="middle" font-family="Segoe UI,Microsoft YaHei,Arial" font-weight="700" font-size="18" fill="#fff">${[...name][0]}</text>`;
}
const glyphOf = (name, type) => type === 'app' ? appSVG(name) : SVG[type];

const FILES = [
  ['Recycle Bin','bin'], ['Project files','folder'], ['Quote 2026.xlsx','xlsx'], ['Requirements.docx','docx'],
  ['Shot_0927.png','png'], ['Contract.pdf','pdf'], ['New folder','folder'], ['Design assets','folder'],
  ['Travel photos','folder'], ['Setup.zip','zip'], ['Meeting notes.docx','docx'], ['Wallpaper ideas','folder'],
  ['Weekly.xlsx','xlsx'], ['Desktop 02.png','png'], ['Old backup','folder'], ['Photo.png','png'], ['Manual.pdf','pdf'], ['Resume.docx','docx'], ['Expenses.xlsx','xlsx'], ['Backup.zip','zip'], ['Asset.png','png'], ['Downloads','folder'], ['Stickers.png','png'], ['Payroll.xlsx','xlsx'], ['Lease.pdf','pdf'], ['Journal.docx','docx'], ['Desktop.png','png'],
];
const EXTRA = [
  ['New text.txt','txt'], ['New folder (2)','folder'], ['Invoice.pdf','pdf'], ['Export.xlsx','xlsx'],
  ['Shot_0928.png','png'], ['Memo.txt','txt'], ['Archive.zip','zip'], ['New folder (3)','folder'],
];
const APPS = ['Recycle Bin','This PC','Chat','Mail','Tasks','Meet','Music','Editor','Photoshop','Obsidian','VS Code','Krita',
  'AutoCAD','Rhino','KeyShot','Drive','Chrome','Blender','Figma','Notion','QQ','Steam','Eagle','OBS','Kimi','PureRef','Recorder','NX 12.0','MarkText','Codex'];
const MISC = [['projects','folder'],['Games','folder'],['todolist','folder'],['OKR.xlsx','xlsx'],['Fixed costs.xlsx','xlsx'],
  ['pdfarrange','app'],['stp.log','txt'],['Part.stp','txt'],['Part.3dm','png'],['Preview','folder']];
const RIGHT = [['plot.log','txt'],['Tools','folder'],['Archive.rar','zip'],['1685x128.png','png'],['Photo.jpg','png'],['0914.png','png'],
  ['Photo 2.jpg','png'],['images.png','png'],['Contents.docx','docx'],['api.txt','txt'],['c4ef.png','png'],['0918.png','png'],
  ['Board.pdf','pdf'],['recommend.txt','txt'],['button.stp','txt'],['New text (2).txt','txt'],['ugstep21','txt'],['New text (3).txt','txt'],
  ['Work plan.txt','txt'],['Photo 3.jpg','png'],['New doc.docx','docx'],['SEO.txt','txt'],['resend.txt','txt'],['Product intro.txt','txt'],
  ['USER.pdf','pdf'],['New text.txt','txt'],['Chair.pur','png'],['PAP-20.pdf','pdf'],['Slides.pptx','pdf'],['Issues.txt','txt']];
function mineCells() {
  const out = []; let a = 0, m = 0, rgt = 0, sh = 0;
  for (let c = 0; c < 3; c++) for (let r = 0; r < 10; r++) {
    const name = APPS[a++];
    out.push([c, r, name, name === 'Recycle Bin' ? 'bin' : name === 'This PC' ? 'pc' : 'app']);
  }
  for (let r = 0; r < 10; r++) out.push([3, r, ...MISC[m++]]);
  for (let r = 0; r < 5; r++) out.push([5, r, `Part layout ${r + 1}.dwg`, 'cad']);
  out.push([6, 0, 'Leg test.bak', 'txt']);
  for (const [c, r] of [[6,4],[6,5],[6,6],[6,7],[6,8],[7,3],[7,4],[7,5],[7,6],[7,7],[8,4],[8,5],[8,6],[9,2],[9,3],[9,4],[9,5],[9,6]])
    out.push([c, r, `ScreenShot ${++sh}.png`, 'shot']);
  for (const [c, r] of [[11,1],[11,2],[11,3],[12,1],[12,2],[12,3],[12,4],[13,1],[13,2],[13,3],[13,4],[14,1],[14,3],[14,4],[15,1],[15,6],
    [16,4],[16,6],[17,4],[17,5],[17,6],[17,7],[19,4],[19,5],[19,8],[20,0],[20,4],[20,6],[21,0],[21,5],[21,6]]) {
    const f = RIGHT[rgt++ % RIGHT.length]; out.push([c, r, f[0], f[1]]);
  }
  return out;
}

/* ======================================================================
   CPU noise and a tileable noise texture
   ====================================================================== */
let seed = (Math.random() * 1e6) | 0;
function hash2(x, y, k = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed + k, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, k = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, k), b = hash2(ix + 1, iy, k), c = hash2(ix, iy + 1, k), d = hash2(ix + 1, iy + 1, k);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, k = 0) {
  let a = 0.5, s = 0;
  for (let i = 0; i < 4; i++) { s += a * vnoise(x, y, k + i * 7); x = x * 2.03 + 17.1; y = y * 2.03 + 17.1; a *= 0.5; }
  return s;
}
function tileNoise(x, y, px, py, k) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const m = (v, p) => ((v % p) + p) % p;
  const x0 = m(ix, px), x1 = m(ix + 1, px), y0 = m(iy, py), y1 = m(iy + 1, py);
  const a = hash2(x0, y0, k), b = hash2(x1, y0, k), c = hash2(x0, y1, k), d = hash2(x1, y1, k);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function tileFbm(u, v, periods, k) {
  let s = 0, w = 0.5, tw = 0;
  for (let i = 0; i < periods.length; i++) { s += w * tileNoise(u * periods[i], v * periods[i], periods[i], periods[i], k + i * 13); tw += w; w *= 0.5; }
  return s / tw;
}
function makeNoiseImage() {
  const S = 256, d = new Uint8Array(S * S * 4);
  const chans = [[8, 16, 32, 64], [8, 16, 32, 64], [8, 16, 32], [16, 32, 64, 128]];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, i = (y * S + x) * 4;
    for (let c = 0; c < 4; c++) {
      let n = tileFbm(u, v, chans[c], 100 + c * 50);
      d[i + c] = Math.min(Math.max((n - 0.5) * 1.9 + 0.5, 0), 1) * 255;
    }
  }
  return { S, d };
}

/* ======================================================================
   Clearing field (CPU): s = signed distance to the edge (<0 inside the clearing)
   ====================================================================== */
let W = innerWidth, H = innerHeight, Gw = 1, Gh = 1, NZ = null;
function buildNoise() {
  const N = Gw * Gh;
  NZ = { wx: new Float32Array(N), wy: new Float32Array(N) };
  for (let gy = 0; gy < Gh; gy++) for (let gx = 0; gx < Gw; gx++) {
    const i = gy * Gw + gx, x = gx * STEP, y = gy * STEP;
    NZ.wx[i] = fbm(x * 0.0028, y * 0.0028, 1) - 0.47;
    NZ.wy[i] = fbm(x * 0.0028, y * 0.0028, 2) - 0.47;
  }
}
let fieldMs = 0;
function computeField(rects) {
  const t0 = performance.now();
  const N = Gw * Gh, f1 = new Float32Array(N);
  const sig = P.sigma, is1 = 1 / (sig * sig);
  const wa = P.warp * 2.2, wmax = wa * 0.5;
  for (const r of rects) {
    const R = 5.5 * sig + Math.max(r.hw, r.hh) * 0.5 + wmax;
    const gx0 = Math.max(0, Math.floor((r.cx - R) / STEP)), gx1 = Math.min(Gw - 1, Math.ceil((r.cx + R) / STEP));
    const gy0 = Math.max(0, Math.floor((r.cy - R) / STEP)), gy1 = Math.min(Gh - 1, Math.ceil((r.cy + R) / STEP));
    const chw = r.hw * 0.5, chh = r.hh * 0.5;
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const i = gy * Gw + gx;
      const qx = gx * STEP + NZ.wx[i] * wa, qy = gy * STEP + NZ.wy[i] * wa;
      let dx = Math.abs(qx - r.cx) - chw, dy = Math.abs(qy - r.cy) - chh;
      if (dx < 0) dx = 0; if (dy < 0) dy = 0;
      f1[i] += Math.exp(-(dx * dx + dy * dy) * is1);
    }
  }
  // Floor equals the contribution at the edge of the computed range: distance matches inside and outside that range, so far forest has no box-shaped seam
  const c0 = Math.sqrt(-Math.log(0.35)), s = new Float32Array(N), fMin = Math.exp(-30);
  for (let i = 0; i < N; i++) {
    const g = Math.log(Math.max(f1[i], fMin));
    s[i] = sig * (Math.sqrt(Math.max(-g, 0)) - c0) - sig * 0.6 * Math.max(g, 0);
  }
  fieldMs = performance.now() - t0;
  return { s };
}
function sampleArr(a, x, y) {
  const fx = Math.min(Math.max(x / STEP, 0), Gw - 1.001), fy = Math.min(Math.max(y / STEP, 0), Gh - 1.001);
  const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, i = iy * Gw + ix;
  return (a[i] * (1 - tx) + a[i + 1] * tx) * (1 - ty) + (a[i + Gw] * (1 - tx) + a[i + Gw + 1] * tx) * ty;
}

/* ======================================================================
   Shaders
   ====================================================================== */
const VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uNoise, uFA, uFB;
uniform vec2 uRes, uGrid;
uniform float uScale, uSeed, uStep, uMix, uTime, uDebug, uWind;
uniform highp sampler2D uTree;   // Trees (CPU bins them by cell, front to back in each cell): (foot x, y, size, type + 8 × color + fractional seed); size 0 means none
uniform vec2 uTGrid;             // Cell counts
uniform float uCellG;            // Cell size (px)
uniform float uBirdN;
uniform vec4 uBird[12];          // Birds: x, y, facing × (1 + wing fold), flap phase + 8 × color + 24 × perched
out vec4 o;

// ---- Palette ----
#ifdef FOREST_NIGHT
const vec3 G_LIGHT = vec3(0.16, 0.26, 0.20), G_MID = vec3(0.10, 0.17, 0.14);  // Night grass, cool and dark, no moon disc
const vec3 G_DEEP = vec3(0.06, 0.11, 0.09);
const vec3 INK = vec3(0.04, 0.08, 0.06);
const vec3 LEAF[10] = vec3[10](vec3(0.08, 0.18, 0.14), vec3(0.10, 0.24, 0.16), vec3(0.14, 0.30, 0.18), vec3(0.18, 0.32, 0.16), vec3(0.22, 0.30, 0.14),
                               vec3(0.12, 0.28, 0.26), vec3(0.10, 0.20, 0.26), vec3(0.18, 0.30, 0.24), vec3(0.24, 0.36, 0.22), vec3(0.08, 0.14, 0.16));
const vec3 TRUNK[4] = vec3[4](vec3(0.22, 0.16, 0.12), vec3(0.28, 0.28, 0.26), vec3(0.30, 0.24, 0.22), vec3(0.16, 0.22, 0.22));
#else
const vec3 G_LIGHT = vec3(0.86, 0.91, 0.67), G_MID = vec3(0.76, 0.85, 0.58);  // Grass: pale yellow-green / green (broad watercolor washes)
const vec3 G_DEEP = vec3(0.68, 0.80, 0.52);                                   // A few darker patches in the grass
const vec3 INK = vec3(0.36, 0.52, 0.30);                                      // Dark green ink strokes for grass
// Leaves: ink green, deep green, green, grass green, yellow-green, teal, blue-green, gray-green, light green, deep ink blue-green (gouache colors from the reference)
const vec3 LEAF[10] = vec3[10](vec3(0.13, 0.33, 0.21), vec3(0.18, 0.42, 0.26), vec3(0.27, 0.52, 0.30), vec3(0.40, 0.60, 0.30), vec3(0.56, 0.62, 0.26),
                               vec3(0.30, 0.55, 0.50), vec3(0.22, 0.40, 0.45), vec3(0.46, 0.66, 0.52), vec3(0.58, 0.74, 0.46), vec3(0.12, 0.22, 0.22));
// Trunks: brown, gray, gray-pink, gray-teal
const vec3 TRUNK[4] = vec3[4](vec3(0.47, 0.36, 0.26), vec3(0.58, 0.57, 0.54), vec3(0.64, 0.53, 0.49), vec3(0.33, 0.43, 0.41));
#endif
const int TREE_K = 32;

float hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float ss(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
vec4 N(vec2 p, float scale) { return texture(uNoise, p / scale + uSeed * 0.013); }
float fieldS(sampler2D t, vec2 p) { return texture(t, (p / uStep + 0.5) / uGrid).r; }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float box(vec2 q, vec2 c, vec2 hs) { vec2 d = abs(q - c) - hs; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }

// Distance to a line segment
float segD(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }

// Grass strokes: at most one stroke per 12×6 cell. Direction follows large regions (parallel hatching), and density varies by region (some packed, some empty)
// Only this cell and the cells above and below are checked (a stroke does not reach the cells to the left or right)
float grassInk(vec2 p) {
  const vec2 G = vec2(12.0, 6.0);
  vec2 c0 = floor(p / G);
  float ink = 0.0;
  for (int j = -1; j <= 1; j++) {
    vec2 c = c0 + vec2(0.0, float(j));
    vec2 cp = (c + 0.5) * G;
    float h = hash2(c + 3.1);
    float dens = 0.75 * ss(0.42, 0.72, N(cp, 900.0).r) * ss(0.35, 0.6, N(cp + 50.0, 380.0).g) + 0.02;   // Painted in patches and clumps, with gaps between them
    if (h > dens) continue;
    float ang = (N(cp, 1400.0).g - 0.5) * 0.7 + (hash2(c + 7.7) - 0.5) * 0.3;    // Mostly near horizontal; strokes in one patch stay roughly parallel
    float len = 2.5 + 3.0 * hash2(c + 1.9);                                      // Half-length 2.5-5.5 px
    vec2 ctr = cp + (vec2(hash2(c + 4.3), hash2(c + 5.9)) - 0.5) * vec2(2.0, 3.0);
    vec2 dir = vec2(cos(ang), sin(ang)) * len;
    float d = segD(p, ctr - dir, ctr + dir);
    ink = max(ink, (1.0 - ss(0.2, 0.9, d)) * (0.35 + 0.45 * hash2(c + 9.1)));
  }
  return ink;
}

float sdTri(vec2 p, vec2 a, vec2 b, vec2 c) {
  vec2 e0 = b - a, e1 = c - b, e2 = a - c, v0 = p - a, v1 = p - b, v2 = p - c;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float sg = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(pq0, pq0), sg * (v0.x * e0.y - v0.y * e0.x)),
                   vec2(dot(pq1, pq1), sg * (v1.x * e1.y - v1.y * e1.x))),
                   vec2(dot(pq2, pq2), sg * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
// Songbird (side view, +x forward, +y down, body about 17 px long at scale 1): round body, small tail, pointed beak, one wing flapping (folded flat on the back)
// Colors stand out against the green: dark blue-gray (white belly), brick red, cream; BIRD_B is the belly color
#ifdef FOREST_NIGHT
const vec3 BIRD_C[3] = vec3[3](vec3(0.16, 0.20, 0.28), vec3(0.42, 0.22, 0.16), vec3(0.55, 0.52, 0.46));
const vec3 BIRD_B[3] = vec3[3](vec3(0.42, 0.44, 0.42), vec3(0.48, 0.36, 0.24), vec3(0.50, 0.50, 0.46));
#else
const vec3 BIRD_C[3] = vec3[3](vec3(0.20, 0.26, 0.36), vec3(0.80, 0.36, 0.24), vec3(0.95, 0.92, 0.84));
const vec3 BIRD_B[3] = vec3[3](vec3(0.95, 0.94, 0.90), vec3(0.96, 0.78, 0.52), vec3(0.99, 0.98, 0.95));
#endif
vec3 drawSongbird(vec3 col, vec2 q, float ph, float fold, vec3 c, vec3 belly) {
  float body = (length(q / vec2(4.9, 3.1)) - 1.0) * 3.1;
  float head = length(q - vec2(4.4, -1.6)) - 2.6;
  float tail = segD(q, vec2(-3.5, -0.3), vec2(-8.5, -1.6)) - 1.1;
  float beak = segD(q, vec2(6.6, -1.2), vec2(8.4, -0.8)) - 0.45;
  float d = min(min(smin(body, head, 1.2), tail), beak);
  col = mix(col, mix(c, belly, ss(0.3, 1.8, q.y + 0.25 * (q.x - 2.0))), ss(0.35, -0.35, d));   // Belly and chest use the other color
  col = mix(col, vec3(0.10, 0.10, 0.12), ss(0.45, -0.1, length(q - vec2(5.3, -2.2)) - 0.55));   // Small eye
  vec2 sh = vec2(0.8, -1.4);
  vec2 tip = mix(sh + vec2(-2.0, -8.5 * sin(ph)), sh + vec2(-6.5, 0.3), fold);    // Flap: wing tip moves up and down; fold: wing lies back along the body
  float wd = sdTri(q, sh + vec2(2.4, 0.0), sh + vec2(-2.6, 0.4), tip) - 0.3;
  return mix(col, c * 0.8, ss(0.35, -0.35, wd));
}

// ---- Tree (side view, standing on the ground; q is in scale-1 units, origin at the trunk base, +y up) ----
// Returns x = distance to the tree, y = 1 on the trunk, z = crown pattern / branch lines (0..1, higher is darker)
vec3 treeSD(vec2 q, float type, float seed) {
  float trunk = 1e9, crown = 1e9, mark = 0.0;
  if (type < 0.5) {                                                               // Pine: stacked triangles that narrow toward the top
    trunk = box(q, vec2(0.0, 6.0), vec2(3.0, 7.0));
    float yy = clamp((q.y - 10.0) / 90.0, 0.0, 0.9999), ti = floor(yy * 4.0), tf = fract(yy * 4.0);
    float wb = 30.0 * (1.0 - ti * 0.2);                                           // Half-width at the base of this tier; higher tiers are narrower
    float w = ti > 2.5 ? wb * (1.0 - tf) : wb * (1.0 - tf * 0.6);
    w *= 1.0 - 0.18 * ss(0.7, 1.0, abs(q.x) / max(wb, 1.0)) * (1.0 - tf);           // The two corners of each tier droop a little
    crown = max((abs(q.x) - w) * 0.8, max(10.0 - q.y, q.y - 100.0));
    // One dark branch line in each tier, drooping toward both sides
    float br = abs(tf - 0.25 - 0.35 * abs(q.x) / max(wb, 1.0));
    mark = (1.0 - ss(0.02, 0.06, br)) * ss(2.0, 5.0, abs(q.x)) * step(abs(q.x), w - 2.0) * 0.8;
  } else if (type < 1.5) {                                                        // Round crown: a few plump canopy blobs plus a trunk
    trunk = box(q, vec2(0.0, 16.0), vec2(5.0, 17.0));
    crown = smin(length(q - vec2(0.0, 54.0)) - 27.0, smin(length(q - vec2(-15.0, 40.0)) - 18.0, length(q - vec2(15.0, 42.0)) - 19.0, 4.0), 4.0);
    if (seed < 0.3) {                                                             // Some crowns get a scale pattern
      vec2 g = vec2(q.x / 9.0, q.y / 7.0);
      g.x += 0.5 * mod(floor(g.y), 2.0);
      vec2 c = fract(g) - vec2(0.5, 1.0);
      mark = (1.0 - ss(0.04, 0.1, abs(length(c * vec2(1.0, 1.3)) - 0.5))) * step(c.y, 0.0) * 0.7;
    }
  } else if (type < 2.5) {                                                        // Cypress: tall and narrow, a bit pointed at the top
    trunk = box(q, vec2(0.0, 5.0), vec2(2.5, 6.0));
    vec2 e = (q - vec2(0.0, 52.0)) / vec2(13.0, 46.0);
    e.x /= 1.0 - 0.45 * ss(-0.2, 1.0, e.y);                                       // Narrower toward the top
    crown = (length(e) - 1.0) * 13.0;
  } else if (type < 3.5) {                                                        // Shrub: a low clump
    crown = max(smin(smin(length(q - vec2(-9.0, 13.0)) - 13.0, length(q - vec2(9.0, 14.0)) - 14.0, 4.0), length(q - vec2(0.0, 22.0)) - 13.0, 4.0), -q.y);
  } else {                                                                        // Double ball: two circles stacked
    trunk = box(q, vec2(0.0, 12.0), vec2(3.5, 14.0));
    crown = min(length(q - vec2(0.0, 40.0)) - 19.0, length(q - vec2(0.0, 72.0)) - 16.0);
  }
  if (seed > 0.3 && seed < 0.48 && q.y < 30.0)                                    // Some trunks get a few vertical lines
    mark = max(mark, (1.0 - ss(0.12, 0.3, abs(fract(q.x / 3.2) - 0.5))) * step(trunk, 0.0) * 0.6);
  return crown < trunk ? vec3(crown, 0.0, mark) : vec3(trunk, 1.0, mark);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uScale - gl_FragCoord.y) / uScale;
  float t = uTime;

  // ---------- Grass: broad yellow-green and green watercolor washes, a few darker patches, slightly brighter toward the upper left (sunlit); paper grain ----------
  float w1 = N(p, 1900.0).b, w2 = N(p + 311.0, 650.0).g;
  vec3 col = mix(G_MID, G_LIGHT, ss(0.3, 0.75, w1 * 0.7 + w2 * 0.3));
  col = mix(col, G_DEEP, ss(0.45, 0.85, N(p + 977.0, 1300.0).r) * 0.4);       // Wide threshold: the noise is scaled up a lot, and a steep cutoff turns into blocky steps
  col *= 1.0 + 0.05 * (0.5 - (p.x + p.y) / (uRes.x + uRes.y));
  col *= 1.0 + (hash2(floor(p * (0.8 * max(uScale, 1.0)))) - 0.5) * 0.035;   // Grain is sampled in real screen pixels
  // Dark green ink strokes for grass
  col = mix(col, INK, grassInk(p) * 0.75);

  // ---------- Trees: composite this cell's trees front to back (lower on screen is in front) and stop once the pixel is covered ----------
  vec4 acc = vec4(0.0);                                                           // Trees already composited (color is premultiplied by opacity)
  float gsh = 0.0;                                                                // Shadow on the grass under the trunk
  ivec2 cell = ivec2(floor(p / uCellG));
  if (cell.x >= 0 && cell.y >= 0 && float(cell.x) < uTGrid.x && float(cell.y) < uTGrid.y) {
    float rough = (N(p, 380.0).g - 0.5) * 2.2;                                    // Gouache edge: not a hard cut
    vec3 tex = vec3(1.0 + (N(p, 260.0).r - 0.5) * 0.16 + (hash2(floor(p * max(uScale, 1.0))) - 0.5) * 0.06);   // Gouache grain (sampled in real screen pixels)
    for (int k = 0; k < TREE_K; k++) {
      vec4 tr = texelFetch(uTree, ivec2(cell.x * TREE_K + k, cell.y), 0);
      if (tr.z <= 0.0) break;
      float s = tr.z;
      vec2 q = vec2(p.x - tr.x, tr.y - p.y);
      if (q.y < -10.0 * s || q.y > 104.0 * s || abs(q.x) > 40.0 * s) continue;
      float ci = floor(tr.w), seed = fract(tr.w), type = mod(ci, 8.0), color = floor(ci / 8.0);
      // Shadow at the foot (a flat ellipse shifted down and to the right)
      gsh = max(gsh, ss(1.0, 0.2, length((q - vec2(6.0, -1.5) * s) / (vec2(26.0, 6.0) * s))) * 0.55);
      // Wind sways the crown left and right (more sway higher up; nearby trees stay roughly in sync, in gusts)
      float hy = max(q.y, 0.0) / (100.0 * s);
      q.x -= uWind * 2.4 * s * hy * hy * (sin(t * 1.1 + tr.x * 0.011 + tr.y * 0.004) * 0.7 + sin(t * 2.3 + seed * 40.0) * 0.3);
      vec2 qq = q / s;
      qq.x /= 0.85 + 0.3 * fract(seed * 7.31);                                    // Width varies from tree to tree
      vec3 r = treeSD(qq, type, seed);
      float d = r.x * s + rough;
      float a = ss(0.8, -0.8, d);
      if (a <= 0.0) continue;
      vec3 c;
      if (r.y > 0.5) c = TRUNK[int(mod(floor(seed * 37.0), 4.0))];
      else {
        c = LEAF[int(color)];
        c *= 1.07 - 0.14 * ss(-25.0, 25.0, qq.x);                                  // Left side (toward the light) is brighter; right side is darker
      }
      c = mix(c, c * 0.72, r.z);                                                  // Branch lines, scales, and trunk stripes
      c *= tex;
      acc.rgb += (1.0 - acc.a) * a * c;
      acc.a += (1.0 - acc.a) * a;
      if (acc.a > 0.995) break;
    }
  }
  col = mix(col, col * vec3(0.62, 0.72, 0.55), gsh);
  col = acc.rgb + (1.0 - acc.a) * col;

  // ---------- Birds: mostly perched on a treetop (body tipped up, two small feet), sometimes flying to a nearby tree ----------
  for (int i = 0; i < 12; i++) {
    if (float(i) >= uBirdN) break;
    vec4 b = uBird[i];
    vec2 d0 = p - b.xy;
    if (dot(d0, d0) > 1000.0) continue;
    float face = sign(b.z), fold = abs(b.z) - 1.0;
    float perched = floor(b.w / 24.0), rem = mod(b.w, 24.0), ci = floor(rem / 8.0);
    vec2 qs = vec2(d0.x * face, d0.y) / 1.6;
    if (perched > 0.5) {
      float legs = min(segD(qs, vec2(0.4, 2.0), vec2(0.1, 3.3)), segD(qs, vec2(-0.8, 2.0), vec2(-1.1, 3.3))) - 0.3;
      col = mix(col, vec3(0.22, 0.18, 0.16), ss(0.3, -0.3, legs));
      qs = rot(0.45) * qs;                                                          // While perched, the head tips up and the tail drops
    }
    col = drawSongbird(col, qs, mod(rem, 8.0), fold, BIRD_C[int(ci)], BIRD_B[int(ci)]);
  }

  if (uDebug > 0.5) {
    float sF = mix(fieldS(uFA, p), fieldS(uFB, p), uMix);
    col = mix(col, vec3(0.9, 0.15, 0.15), 1.0 - ss(0.0, 1.5, abs(sF + 8.0)));
  }
  o = vec4(col, 1.0);
}`;

/* ======================================================================
   WebGL
   ====================================================================== */
const cv = document.getElementById('art');
const gl = cv.getContext('webgl2', { antialias: false });
if (!gl) document.getElementById('nogl').style.display = 'grid';
function program(fs) {
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); throw new Error('shader'); }
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, VS));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
  const U = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); U[nm] = gl.getUniformLocation(p, nm); }
  return { p, U };
}
function themeFS() {
  if (!NIGHT) return FS;
  return FS.replace('#version 300 es', '#version 300 es\n#define FOREST_NIGHT');
}
const PR = program(themeFS());
gl.bindVertexArray(gl.createVertexArray());

let noiseTex = null;
function buildNoiseTex() {
  const { S, d } = makeNoiseImage();
  noiseTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, noiseTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
function toHalf(v) {
  f32[0] = v; const x = u32[0];
  const sign = (x >>> 16) & 0x8000, e = ((x >>> 23) & 0xff) - 112, m = x & 0x7fffff;
  if (e <= 0) return sign;
  if (e >= 31) return sign | 0x7c00;
  return sign | (e << 10) | (m >>> 13);
}
// Two field textures: interpolate from → to
const ftex = [null, null];
let fromI = 0, toI = 0, morphT0 = -1e9, morphDur = MORPH_MS, FA = null, FB = null;
function allocField() {
  for (let i = 0; i < 2; i++) {
    if (ftex[i]) gl.deleteTexture(ftex[i]);
    ftex[i] = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, ftex[i]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, Gw, Gh, 0, gl.RED, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
}
function uploadField(i, Fd) {
  const d = new Uint16Array(Gw * Gh);
  for (let k = 0; k < d.length; k++) d[k] = toHalf(Fd.s[k]);
  gl.bindTexture(gl.TEXTURE_2D, ftex[i]);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // Odd-width R16F rows are uploaded as packed data too
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, Gw, Gh, gl.RED, gl.HALF_FLOAT, d);
}

const iconRects = () => icons.map(ic => ({ cx: ic.x + ic.w / 2, cy: ic.y + ic.h / 2, hw: ic.w / 2 - 4, hh: ic.h / 2 - 2 }));
function commit(fromEmpty = false) {
  const nf = computeField(iconRects());
  const target = 1 - toI;
  if (fromEmpty) { FA = nf; uploadField(toI, FA); treesIntro = true; }   // Opening: the clearing is set at once, then trees grow out of the grass one by one
  else FA = FB;
  FB = nf;
  uploadField(target, FB);
  fromI = toI; toI = target;
  morphT0 = performance.now();
  morphDur = fromEmpty ? 2600 : MORPH_MS;
}
function refresh() {
  FA = FB = computeField(iconRects());
  uploadField(toI, FB);
  fromI = toI; morphT0 = -1e9;
  treesRecheck = true;                            // No morph (for example clearing size changed): every tree is checked again
}

/* ======================================================================
   Current field (morphs between the old and new textures while icons move)
   ====================================================================== */
let curMix = 1;
const curS = (x, y) => FB ? sampleArr(FA.s, x, y) * (1 - curMix) + sampleArr(FB.s, x, y) * curMix : 999;

/* ======================================================================
   Trees: scatter candidate trees on a staggered grid across the whole view (position, type, size, and color are fixed random values).
   A tree grows only when the whole tree (crown and trunk) sits outside the clearing. When icons move, trees in the way shrink and trees grow into the space that opens.
   Trees are ordered by foot (trunk base) from bottom to top: lower trees are in front. They are binned into cells and uploaded as a small texture; the shader reads only its own cell.
   ====================================================================== */
const CELL_G = 48, TREE_K = 32;
const TREE_SX = 50, TREE_SY = 34;                          // Spacing between candidate trees
// Types: 0 pine, 1 round crown, 2 cypress, 3 shrub, 4 double ball; height and half-width at scale 1 (px)
const TREE_SIZE = [[100, 30], [84, 34], [100, 13], [36, 26], [90, 20]];
const CLEAR_S = -8;                                        // A field value below this is the clearing (icon corners are about -22)
let trees = [], treeTex = null, treeBuf = null, tgW = 0, tgH = 0, treeStats = null, treesDirty = true, treesRecheck = true, treesW = 0, treesH = 0;
// Opening: grass first, then trees grow in one by one (far from icons first, clearing edge last).
// treesIntro: start growing next frame; treesHold: in wallpaper / preview the icon positions are still unknown, so hold the trees
let treesIntro = false, treesHold = WALL || PREVIEW;
const rnd1 = (x, y, k) => hash2(x, y, k);                  // Fixed random value (changes when the seed changes)
function buildTrees() {
  trees = [];
  const rows = Math.ceil((H + 160) / TREE_SY) + 1, cols = Math.ceil((W + 120) / TREE_SX) + 1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const u = rnd1(c, r, 3);
    const t = {
      x: -60 + (c + (r % 2) * 0.5) * TREE_SX + (rnd1(c, r, 1) - 0.5) * TREE_SX * 0.8,
      y: r * TREE_SY + (rnd1(c, r, 2) - 0.5) * TREE_SY * 0.8,
      type: u < 0.34 ? 0 : u < 0.6 ? 1 : u < 0.75 ? 2 : u < 0.88 ? 3 : 4,
      scale: 0.85 + 0.6 * rnd1(c, r, 4),
      color: Math.floor(rnd1(c, r, 5) * 10),
      seed: rnd1(c, r, 6) * 0.999,
      grow: 0,
    };
    t.grow = treeFits(t) ? 1 : 0;
    trees.push(t);
  }
  trees.sort((a, b) => b.y - a.y);                         // Front to back
  treesDirty = true; treesW = W; treesH = H; treesGen++;
}
// Is the whole tree outside the clearing? Foot, mid-trunk, both sides of the crown, and the top must all sit far enough out
function treeFits(t) {
  const [h, w] = TREE_SIZE[t.type], s = t.scale;
  const pts = [[0, 0], [0, -h * s * 0.5], [-w * s, -h * s * 0.45], [w * s, -h * s * 0.45], [0, -h * s]];
  for (const [dx, dy] of pts) if (curS(t.x + dx, t.y + dy) < CLEAR_S) return false;
  return true;
}
// While icons move (the field is morphing), each frame rechecks which trees belong; keepers grow in, the rest shrink away
// (a clearing-size change → refresh() rechecks every tree)
function stepTrees(dt) {
  if (treesHold) return;
  if (!trees.length || treesW !== W || treesH !== H) buildTrees();
  if (treesIntro) {
    treesIntro = false; treesGen++;                         // Birds also fly in from the edge of the view again
    for (const t of trees) {
      t.grow = 0; t.want = treeFits(t) ? 1 : 0;
      t.delay = Math.max(0, 1 - curS(t.x, t.y) / 500) * 2.6 + Math.random() * 1.1;   // Closer to an icon means a later start
    }
    treesDirty = true;
  }
  const check = curMix < 1 || treesRecheck;
  treesRecheck = false;
  let changed = false;
  for (const t of trees) {
    if (check || t.want === undefined) t.want = treeFits(t) ? 1 : 0;
    if (t.delay > 0) { t.delay -= dt; continue; }
    if (t.grow !== t.want) {
      t.grow = t.want > t.grow ? Math.min(1, t.grow + dt / 0.7) : Math.max(0, t.grow - dt / 0.5);
      changed = true;
    }
  }
  if (changed) treesDirty = true;
}
function uploadTrees() {
  gl.activeTexture(gl.TEXTURE3);                            // Texture unit 3, so the other textures stay bound
  const gw = Math.ceil(W / CELL_G), gh = Math.ceil(H / CELL_G);
  if (!treeTex || gw !== tgW || gh !== tgH) {
    tgW = gw; tgH = gh;
    if (treeTex) gl.deleteTexture(treeTex);
    treeTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, treeTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, gw * TREE_K, gh);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    treeBuf = new Float32Array(gw * TREE_K * gh * 4);
    treesDirty = true;
  }
  if (!treesDirty) return;
  treesDirty = false;
  // Bin into cells: one copy in every cell the tree covers (trees are already front to back); if a cell is full, drop the ones farthest back
  treeBuf.fill(0);
  const cnt = new Uint8Array(gw * gh);
  let n = 0;
  for (const t of trees) {
    if (t.grow <= 0.02) continue;
    n++;
    const e = t.grow * t.grow * (3 - 2 * t.grow), s = t.scale * e;
    const [h, w] = TREE_SIZE[t.type];
    const x0 = Math.max(0, Math.floor((t.x - (w + 10) * s) / CELL_G)), x1 = Math.min(gw - 1, Math.floor((t.x + (w + 10) * s) / CELL_G));
    const y0 = Math.max(0, Math.floor((t.y - (h + 4) * s) / CELL_G)), y1 = Math.min(gh - 1, Math.floor((t.y + 10 * s) / CELL_G));
    const code = t.type + 8 * t.color + t.seed;
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const ci = gy * gw + gx;
      if (cnt[ci] >= TREE_K) continue;
      const o = (ci * TREE_K + cnt[ci]++) * 4;
      treeBuf[o] = t.x; treeBuf[o + 1] = t.y; treeBuf[o + 2] = s; treeBuf[o + 3] = code;
    }
  }
  treeStats = { trees: n, maxPerCell: Math.max(...cnt) };
  gl.bindTexture(gl.TEXTURE_2D, treeTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gw * TREE_K, gh, gl.RGBA, gl.FLOAT, treeBuf);
}

/* ======================================================================
   Birds: mostly perched on a treetop (swaying with the crown, sometimes turning), then flying to another nearby tree.
   They fly only over the forest: the landing crown must not be hidden by a tree in front, and the whole path stays above the trees, never through the clearing around icons.
   If the perched tree is about to shrink (an icon moved in), the bird leaves first.
   ====================================================================== */
const birds = [];
const birdBuf = new Float32Array(48);
const TOP_Y = [99, 81, 97, 35, 88];                        // How far each type's top sits above its foot (scale = 1)
let treesGen = 0;                                          // Increments when trees are scattered again (birds forget the trees they remembered)
const treeTop = t => ({ x: t.x, y: t.y - TOP_Y[t.type] * t.scale });
// How far the crown sways in the wind (same formula as the shader, so a perched bird sways with it)
function treeSway(t, time) {
  const hy = TOP_Y[t.type] / 100;
  return P.wind * 2.4 * t.scale * hy * hy * (Math.sin(time * 1.1 + t.x * 0.011 + t.y * 0.004) * 0.7 + Math.sin(time * 2.3 + t.seed * 40) * 0.3);
}
// Can a bird land here? Fully grown, top on screen, not hidden by a tree in front, and no other bird
function perchable(t, self) {
  if (t.grow < 0.98 || t.want !== 1) return false;
  const p = treeTop(t), H2 = H - TASKBAR;
  if (p.x < 20 || p.x > W - 20 || p.y < 24 || p.y > H2 - 10) return false;
  if (birds.some(b => b !== self && (b.tree === t || b.to === t))) return false;
  for (const o of trees) {
    if (o.y <= t.y || o.grow < 0.5) continue;               // Only trees in front
    if (o.y - TOP_Y[o.type] * o.scale < p.y - 4 && Math.abs(o.x - p.x) < TREE_SIZE[o.type][1] * o.scale * 0.95) return false;
  }
  return true;
}
// Flight path: from a to b, arched upward in the middle (t: 0..1)
const ARC = d => Math.min(40, d * 0.3);
function flightAt(a, b, t) {
  const e = t * t * (3 - 2 * t), d = Math.hypot(b.x - a.x, b.y - a.y);
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e - ARC(d) * Math.sin(Math.PI * t) };
}
// Is the whole path from a to b, including the arch, above the forest and on screen?
function overForest(a, b) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 15) + 2;
  for (let i = 0; i <= n; i++) {
    const p = flightAt(a, b, i / n);
    if (p.y < 10 || curS(p.x, p.y) < CLEAR_S + 12) return false;
  }
  return true;
}
function pickPerch(b, from) {
  let best = null;
  for (let k = 0; k < 60; k++) {
    const t = trees[Math.floor(Math.random() * trees.length)];
    if (!t || !perchable(t, b)) continue;
    if (from) {
      const p = treeTop(t), d = Math.hypot(p.x - from.x, p.y - from.y);
      if (d < 60 || d > 300 || !overForest(from, p)) continue;
    }
    best = t; break;
  }
  return best;
}
// A new bird flies in from the edge: the on-screen part of that path must also stay above the forest
function overForestEntry(a, b) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 15) + 2;
  for (let i = 0; i <= n; i++) {
    const p = flightAt(a, b, i / n);
    if (p.x < 0 || p.x > W || p.y < 0) continue;
    if (curS(p.x, p.y) < CLEAR_S + 12) return false;
  }
  return true;
}
function newBird(color) {
  return { state: 'none', tree: null, to: null, gen: -1, x: -100, y: -100, face: Math.random() < 0.5 ? 1 : -1, fold: 1, ph: 0,
    beat: 36 + Math.random() * 8, color, timer: 0, turnT: 3 + Math.random() * 6, t: 0, dur: 1, ax: 0, ay: 0 };
}
function perchOn(b, t) {
  b.state = 'perch'; b.tree = t; b.to = null; b.gen = treesGen; b.fold = 1;
  b.timer = 6 + Math.random() * 18;                         // Perch for 6-24 seconds
}
function stepBirds(dt) {
  const want = Math.max(0, Math.min(12, Math.round(P.birds)));
  while (birds.length > want) birds.pop();
  while (birds.length < want) birds.push(newBird(birds.length % 3));
  const time = (performance.now() - T0) / 1000;
  for (const b of birds) {
    if (b.gen !== treesGen && b.state !== 'none') { b.state = 'none'; b.tree = b.to = null; b.timer = 0; }
    if (b.state === 'none') {                               // Not landed yet (just spawned, or trees were scattered again): fly in from the edge and land on a tree
      if ((b.timer -= dt) > 0) continue;
      const t = pickPerch(b, null);
      if (!t) { b.timer = 2; continue; }
      const p = treeTop(t);
      let from = null;
      for (let k = 0; k < 12 && !from; k++) {
        const side = Math.floor(Math.random() * 3);                                     // Enter from the top, left, or right
        const a = side === 0 ? { x: p.x + (Math.random() - 0.5) * 300, y: -30 } : { x: side === 1 ? -30 : W + 30, y: p.y - 40 - Math.random() * 120 };
        if (overForestEntry(a, p)) from = a;
      }
      if (!from) { b.timer = 1 + Math.random() * 2; continue; }
      b.state = 'fly'; b.to = t; b.tree = null; b.gen = treesGen; b.ax = from.x; b.ay = from.y; b.t = 0; b.x = from.x; b.y = from.y;
      b.dur = Math.hypot(p.x - from.x, p.y - from.y) / 80 + 0.4; b.face = p.x >= from.x ? 1 : -1;
      continue;
    }
    if (b.state === 'perch') {
      const t = b.tree, p = treeTop(t);
      b.x = p.x + treeSway(t, time); b.y = p.y - 5;
      if ((b.turnT -= dt) <= 0) { b.face = -b.face; b.turnT = 3 + Math.random() * 8; }   // Sometimes turn around
      // Perch time is up, or this tree is about to shrink: fly to another nearby tree
      if ((b.timer -= dt) <= 0 || t.want !== 1) {
        const to = pickPerch(b, { x: b.x, y: b.y });
        if (to) {
          b.state = 'fly'; b.to = to; b.tree = null; b.ax = b.x; b.ay = b.y; b.t = 0;
          const p2 = treeTop(to);
          b.dur = Math.hypot(p2.x - b.x, p2.y - b.y) / 80 + 0.4;
          b.face = p2.x >= b.x ? 1 : -1;
        } else if (t.want !== 1) { b.state = 'none'; b.tree = null; b.timer = 0; b.x = b.y = -100; }   // No tree nearby to land on: hide for now
        else b.timer = 2 + Math.random() * 3;
      }
    } else if (b.state === 'fly') {
      const to = b.to;
      if (to.want !== 1) {                                  // The target tree is gone: pick another
        const n = pickPerch(b, { x: b.x, y: b.y });
        if (!n) { b.state = 'none'; b.to = null; b.x = b.y = -100; continue; }
        b.to = n; b.ax = b.x; b.ay = b.y; b.t = 0;
        const p2 = treeTop(n);
        b.dur = Math.hypot(p2.x - b.x, p2.y - b.y) / 80 + 0.4; b.face = p2.x >= b.x ? 1 : -1;
      }
      b.t = Math.min(1, b.t + dt / b.dur);
      const p2 = treeTop(b.to);
      const q = flightAt({ x: b.ax, y: b.ay }, { x: p2.x + treeSway(b.to, time), y: p2.y - 5 }, b.t);
      b.x = q.x; b.y = q.y;
      b.fold += ((b.t > 0.82 ? 0.6 : 0) - b.fold) * Math.min(1, dt * 12);                // Half-fold the wings and glide in just before landing
      b.ph = (b.ph + dt * b.beat) % (Math.PI * 2);
      if (b.t >= 1) perchOn(b, b.to);
    }
  }
}
function packBirds() {
  birdBuf.fill(0);
  let i = 0;
  for (const b of birds) {
    if (b.state === 'none' || i >= 12) continue;
    const perched = b.state === 'perch' ? 1 : 0;
    birdBuf.set([b.x, b.y, b.face * (1 + b.fold), b.ph + 8 * b.color + 24 * perched], i * 4);   // Facing × (1 + wing fold); phase + 8 × color + 24 × perched
    i++;
  }
  return i;
}

/* ======================================================================
   Desktop icons (DOM)
   ====================================================================== */
const desktop = document.getElementById('desktop');
let icons = [], layoutKind = 'mine', selected = null, drag = null, extraIdx = 0, layoutCapacity = 0;
const grid = { cols: 1, rows: 1 };
let DW = innerWidth, DH = innerHeight - TASKBAR;
const ripples = [];
function computeGrid() {
  DW = innerWidth; DH = innerHeight - TASKBAR;
  grid.cols = Math.max(1, Math.floor((DW - GRID_X0) / CELL_W));
  grid.rows = Math.max(1, Math.floor((DH - GRID_Y0) / CELL_H));
}
const cellPos = (c, r) => ({ x: GRID_X0 + c * CELL_W, y: GRID_Y0 + r * CELL_H });
const occupied = (x, y, self) => icons.some(ic => ic !== self && Math.abs(ic.x - x) < CELL_W / 2 && Math.abs(ic.y - y) < CELL_H / 2);
function nearestFreeCell(cx, cy, self) {
  let best = null, bd = Infinity;
  for (let c = 0; c < grid.cols; c++) for (let r = 0; r < grid.rows; r++) {
    const pos = cellPos(c, r);
    if (occupied(pos.x, pos.y, self)) continue;
    const dd = Math.hypot(pos.x + CELL_W / 2 - cx, pos.y + CELL_H / 2 - cy);
    if (dd < bd) { bd = dd; best = pos; }
  }
  return best;
}
const isWater = (x, y) => curS(x, y) > 4;
function addRipple(x, y, str = 1) {
  ripples.push({ x, y, t0: performance.now(), str });
  if (ripples.length > 6) ripples.shift();
}
function addIcon([name, type], pos, born = false) {
  const el = document.createElement('div');
  el.className = 'icon' + (born ? ' born' : '');
  el.innerHTML = `<div class="glyph"><svg viewBox="0 0 48 48">${glyphOf(name, type)}</svg></div><div class="label">${name}</div>`;
  el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
  desktop.appendChild(el);
  const ic = { name, type, x: pos.x, y: pos.y, w: el.offsetWidth, h: el.offsetHeight, el };
  icons.push(ic); bindDrag(ic);
  return ic;
}
function setPos(ic, x, y) { ic.x = x; ic.y = y; ic.el.style.left = x + 'px'; ic.el.style.top = y + 'px'; }
function select(ic) {
  if (selected) selected.el.classList.remove('sel');
  selected = ic;
  if (ic) ic.el.classList.add('sel');
}
function bindDrag(ic) {
  const el = ic.el;
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.stopPropagation(); select(ic);
    el.setPointerCapture(e.pointerId); el.classList.remove('settle');
    drag = { ic, sx: e.clientX, sy: e.clientY, ox: ic.x, oy: ic.y, moved: false };
  });
  el.addEventListener('pointermove', e => {
    if (!drag || drag.ic !== ic) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true; el.classList.add('drag');
    el.style.left = drag.ox + dx + 'px'; el.style.top = drag.oy + dy + 'px';
  });
  const end = (e, cancel) => {
    if (!drag || drag.ic !== ic) return;
    const d = drag; drag = null;
    el.classList.remove('drag');
    if (!d.moved) return;
    let nx = cancel ? d.ox : d.ox + (e.clientX - d.sx), ny = cancel ? d.oy : d.oy + (e.clientY - d.sy);
    nx = Math.min(Math.max(nx, 0), DW - ic.w); ny = Math.min(Math.max(ny, 0), DH - ic.h);
    if (P.snap && !cancel) { const c = nearestFreeCell(nx + ic.w / 2, ny + ic.h / 2, ic); if (c) { nx = c.x; ny = c.y; } }
    if (Math.hypot(nx - d.ox, ny - d.oy) < 0.5) { setPos(ic, nx, ny); return; }
    const cx = nx + ic.w / 2, cy = ny + ic.h / 2;
    if (isWater(cx, cy)) addRipple(cx, cy, 1.3);
    el.classList.add('settle'); setPos(ic, nx, ny);
    commit();
  };
  el.addEventListener('pointerup', e => end(e, false));
  el.addEventListener('pointercancel', e => end(e, true));
}
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function applyLayout(kind) {
  layoutKind = kind;
  icons.forEach(ic => ic.el.remove()); icons = []; selected = null; extraIdx = 0;
  computeGrid();
  layoutCapacity = grid.cols * grid.rows;
  if (kind === 'mine') {
    for (const [c, r, name, type] of mineCells()) {
      const pos = cellPos(Math.round(c * (grid.cols - 1) / 21), Math.round(r * (grid.rows - 1) / 9));
      if (!occupied(pos.x, pos.y, null)) addIcon([name, type], pos);
    }
  } else if (kind === 'arranged') {
    FILES.forEach((f, i) => { const c = Math.floor(i / grid.rows), r = i % grid.rows; if (c < grid.cols) addIcon(f, cellPos(c, r)); });
  } else if (kind === 'messy') {
    const rnd = mulberry32(20260928);
    for (const f of FILES) for (let t = 0; t < 300; t++) {
      const c = rnd() < 0.45 ? Math.floor(rnd() * Math.min(3, grid.cols)) : Math.floor(rnd() * grid.cols);
      const pos = cellPos(c, Math.floor(rnd() * grid.rows));
      if (!occupied(pos.x, pos.y, null)) { addIcon(f, pos); break; }
    }
  } else {
    Array.from({ length: 10 }, (_, r) => [[0, r], [1, r]]).flat().concat([[2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2], [Math.floor(grid.cols * 0.45), Math.floor(grid.rows * 0.5)]])
      .forEach(([c, r], i) => addIcon(FILES[i], cellPos(Math.min(c, grid.cols - 1), Math.min(r, grid.rows - 1))));
  }
  commit(true);
}

/* ======================================================================
   Size / main loop
   ====================================================================== */
function resize() {
  W = innerWidth; H = innerHeight;
  // Preview mode: the page is laid out at full desktop size, then scaled down, so the canvas only needs a low resolution
  const scale = PREVIEW ? 0.45 : Math.min(devicePixelRatio || 1, P.quality);
  // Size from the canvas box (fractional: a 2560-wide screen at 150% is 1706.67, while innerWidth rounds to 1707).
  // Otherwise the canvas is one pixel larger than the screen and the browser scales the whole image, which blurs it
  const box = cv.getBoundingClientRect();
  cv.width = Math.round((box.width || W) * scale); cv.height = Math.round((box.height || H) * scale); cv._scale = scale;
  Gw = Math.ceil(W / STEP) + 2; Gh = Math.ceil(H / STEP) + 2;
  buildNoise();
  allocField();
}

const T0 = performance.now();
let lastT = 0, fpsEMA = 0, frameN = 0, frameMs = 0;
const px = new Uint8Array(4);
let paused = false;                              // Host signal: a foreground window is maximized or fullscreen → pause
function frame(now) {
  requestAnimationFrame(frame);
  if (paused) { lastT = 0; return; }
  if (P.cap30 && now - lastT < 31) return;
  const dt = lastT ? Math.min((now - lastT) / 1000, 0.1) : 0.03;
  if (PROTOTYPE_STATS && lastT) fpsEMA = fpsEMA ? fpsEMA * 0.9 + (1 / dt) * 0.1 : 1 / dt;
  lastT = now;
  const e = Math.min((now - morphT0) / morphDur, 1);
  curMix = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
  stepTrees(dt); stepBirds(dt);
  draw(now);
  if (++frameN % 10 === 0 && PROTOTYPE_STATS) updateStats();
}
function draw(now) {
  const { p, U } = PR;
  gl.useProgram(p);
  gl.viewport(0, 0, cv.width, cv.height);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, noiseTex);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ftex[fromI]);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ftex[toI]);
  gl.uniform1i(U.uNoise, 0); gl.uniform1i(U.uFA, 1); gl.uniform1i(U.uFB, 2);
  gl.uniform2f(U.uRes, cv.width / cv._scale, cv.height / cv._scale);   // Match the canvas box in real pixels (innerWidth and innerHeight are rounded)
  gl.uniform2f(U.uGrid, Gw, Gh);
  gl.uniform1f(U.uScale, cv._scale);
  gl.uniform1f(U.uSeed, (seed % 997) * 0.37);
  gl.uniform1f(U.uStep, STEP);
  gl.uniform1f(U.uMix, curMix);
  gl.uniform1f(U.uTime, (now - T0) / 1000);
  gl.uniform1f(U.uDebug, P.debug ? 1 : 0);
  uploadTrees();
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, treeTex); gl.uniform1i(U.uTree, 3);
  gl.uniform2f(U.uTGrid, tgW, tgH); gl.uniform1f(U.uCellG, CELL_G);
  gl.uniform1f(U.uWind, P.wind);
  gl.uniform1f(U.uBirdN, packBirds()); gl.uniform4fv(U.uBird, birdBuf);
  const measure = PROTOTYPE_STATS && frameN % 20 === 0, t0 = measure ? performance.now() : 0;
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (measure) { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); frameMs = performance.now() - t0; }
}

/* ======================================================================
   Panel
   ====================================================================== */
const statsEl = document.getElementById('stats');
const GPU = (() => {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return name.replace(/^ANGLE \([^,]+,\s*/, '').replace(/\s*\(0x[0-9a-f]+\).*$/i, '')
    .replace(/\s*(Direct3D|vs_|OpenGL).*$/, '').replace(/\(R\)|\(TM\)/g, '').trim();
})();
function updateStats() {
  statsEl.innerHTML =
    `<span class="live">● Animating · ${fpsEMA.toFixed(0)} fps</span><br>GPU ${GPU}<br>` +
    `Frame ${frameMs.toFixed(1)} ms · Field ${fieldMs.toFixed(0)} ms<br>` +
    `Canvas ${cv.width}×${cv.height} · Icons ${icons.length}`;
}
function syncPanel() {
  document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.v === layoutKind));
  document.querySelectorAll('.toggles input').forEach(inp => { inp.checked = P[inp.dataset.key]; });
}
const slidersEl = document.getElementById('sliders');
for (const s of SLIDERS) {
  const wrap = document.createElement('div');
  wrap.className = 'slider';
  wrap.innerHTML = `<div class="row"><span>${s.label}</span><span></span></div><input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${P[s.key]}">`;
  const out = wrap.querySelector('.row span:last-child'), inp = wrap.querySelector('input');
  out.textContent = s.fmt(P[s.key]);
  inp.addEventListener('input', () => {
    P[s.key] = +inp.value; out.textContent = s.fmt(P[s.key]);
    if (s.act === 'field') refresh();
    else if (s.act === 'size') { resize(); refresh(); }
  });
  slidersEl.appendChild(wrap);
}
document.querySelector('.seg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  applyLayout(b.dataset.v); syncPanel();
});
document.querySelectorAll('.toggles input').forEach(inp => inp.addEventListener('change', () => {
  P[inp.dataset.key] = inp.checked;
}));
document.getElementById('collapse').addEventListener('click', () => {
  const p = document.getElementById('panel');
  p.classList.toggle('collapsed');
  document.getElementById('collapse').textContent = p.classList.contains('collapsed') ? '+' : '–';
});
// New woods: a new seed (Refresh in the settings window, and New woods on the panel). If icon positions are already known, play the opening again from the start.
// If wallpaper or preview has just opened and positions are still unknown, only store the seed, and draw with it once the icons arrive
let iconsSeen = !(WALL || PREVIEW);
function reseed(v) {
  seed = v; buildNoise();
  if (!iconsSeen) return;
  trees = [];                                     // Scatter the trees again so they grow out of the grass one by one
  commit(true);
}
document.getElementById('btnSeed').addEventListener('click', () => reseed((Math.random() * 1e6) | 0));
document.getElementById('btnAdd').addEventListener('click', () => {
  const f = EXTRA[extraIdx++ % EXTRA.length];
  let pos = null;
  for (let t = 0; t < 300 && !pos; t++) {
    const c = cellPos(Math.floor(Math.random() * grid.cols), Math.floor(Math.random() * grid.rows));
    if (!occupied(c.x, c.y, null)) pos = c;
  }
  if (!pos) return;
  const ic = addIcon(f, pos, true);
  select(ic);
  if (isWater(pos.x + ic.w / 2, pos.y + ic.h / 2)) addRipple(pos.x + ic.w / 2, pos.y + ic.h / 2, 1.3);
  commit();
});
desktop.addEventListener('pointerdown', e => {
  select(null);
  if (isWater(e.clientX, e.clientY)) addRipple(e.clientX, e.clientY);
});
addEventListener('keydown', e => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
    const ic = selected; select(null); ic.el.remove(); icons = icons.filter(x => x !== ic); commit();
  } else if (e.key === 'h' || e.key === 'H') document.getElementById('panel').classList.toggle('hidden');
});
let resizeT = 0;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (WALL || PREVIEW) { resize(); refresh(); return; }
    resize(); computeGrid();
    if (grid.cols * grid.rows > layoutCapacity && layoutCapacity < 40) { applyLayout(layoutKind); syncPanel(); return; }
    for (const ic of icons) setPos(ic, Math.min(ic.x, Math.max(0, DW - ic.w)), Math.min(ic.y, Math.max(0, DH - ic.h)));
    refresh();
  }, 100);
});
function tickClock() {
  const d = new Date(), z = n => String(n).padStart(2, '0');
  document.getElementById('clock').innerHTML = `${z(d.getHours())}:${z(d.getMinutes())}<br>${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
setInterval(tickClock, 15000); tickClock();

/* ---------- Startup ---------- */
window.__dbg = {
  P, applyLayout,
  bench() {
    const ts = [];
    for (let i = 0; i < 10; i++) { const a = performance.now(); draw(performance.now()); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - a); }
    ts.sort((a, b) => a - b);
    return { frame: +ts[5].toFixed(1), canvas: cv.width + 'x' + cv.height, gpu: GPU };
  },
};
resize();
buildNoiseTex();
if (WALL || PREVIEW) startHostedMode();
else { applyLayout('mine'); syncPanel(); }
requestAnimationFrame(frame);

/* ======================================================================
   Hosted mode: the picture is driven from outside
   - Wallpaper mode (?wallpaper=1): the desktop host host/Deskland.exe sends messages through WebView2
   - Preview mode (?preview=1): the settings window (settings.html) sends messages through iframe postMessage
   Messages: icons (real icon rectangles, physical pixels) / settings (parameters, a partial update) / reset (restore defaults) / pause
   ====================================================================== */
// Apply settings: accept only parameters that are on the panel. Clearing size rebuilds the field
function applySettings(v) {
  if (typeof v.seed === 'number' && v.seed !== seed) reseed(v.seed);   // Refresh in the settings window: new woods (the desktop and the preview share one seed)
  let field = false;
  for (const k in v) {
    if (!SLIDERS.some(s => s.key === k) || typeof v[k] !== typeof P[k] || P[k] === v[k]) continue;
    P[k] = v[k];
    if (k === 'sigma') field = true;
  }
  if (field && FB) refresh();

}

function drawGhosts() {
  const box = document.getElementById('ghosts');
  box.innerHTML = icons.map(ic => `<div class="ghost" style="left:${ic.x}px;top:${ic.y}px;width:${ic.w}px;height:${ic.h}px"><i></i><b></b></div>`).join('');
}

function startHostedMode() {
  document.body.classList.add('wall');
  if (PREVIEW) {
    document.body.classList.add('preview');
    const g = document.createElement('div'); g.id = 'ghosts'; document.body.appendChild(g);
  }
  icons = [];
  commit(true);                                   // Grass first (icon positions are still unknown, so do not grow trees yet)
  let first = true;
  const handle = m => {
    if (m.t === 'pause') { paused = PREVIEW ? false : m.v; return; }
    if (m.t === 'settings') { applySettings(m.v || {}); return; }
    if (m.t === 'reset') { applySettings(Object.assign({}, DEFAULTS, m.v || {})); return; }
    if (m.t !== 'icons') return;
    const k = window.devicePixelRatio || 1;       // Physical pixels → CSS pixels
    icons = m.vis ? m.r.map(([l, t, r, b]) => ({ x: l / k, y: t / k, w: (r - l) / k, h: (b - t) / k })) : [];
    if (PREVIEW) drawGhosts();
    treesHold = false;                            // Icon positions are known: start growing trees
    iconsSeen = true;
    commit(first);                                // First time: the woods grow out of the grass; after that the clearing follows the icons smoothly
    first = false;
  };
  if (PREVIEW) {
    addEventListener('message', ev => { if (ev.source === parent) handle(typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data); });
    parent.postMessage(JSON.stringify({ t: 'ready' }), '*');
    return;
  }
  const host = window.chrome && window.chrome.webview;
  if (!host) return;
  host.addEventListener('message', ev => handle(JSON.parse(ev.data)));
  host.postMessage('ready');
}
