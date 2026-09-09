/**
 * Generates the PWA icons as real PNG files with no image dependencies.
 * Draws an original arcade-stick mark into an RGBA buffer and encodes it with
 * zlib, so all branding assets are produced locally and bundled with the app.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public');

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => Math.round(a + (b - a) * t);

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const r = size * 0.5;

  const put = (x, y, cr, cg, cb, alpha) => {
    if (alpha <= 0) return;
    const i = (y * size + x) * 4;
    const a = Math.min(1, alpha);
    buf[i] = mix(buf[i], cr, a);
    buf[i + 1] = mix(buf[i + 1], cg, a);
    buf[i + 2] = mix(buf[i + 2], cb, a);
    buf[i + 3] = Math.max(buf[i + 3], Math.round(a * 255));
  };

  // Rounded-square background with a diagonal indigo → pink gradient.
  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(radius - x, 0, x - (size - radius));
      const dy = Math.max(radius - y, 0, y - (size - radius));
      const dist = Math.hypot(dx, dy);
      const edge = Math.min(1, Math.max(0, radius - dist + 0.5));
      if (edge <= 0) continue;
      const t = (x / size) * 0.5 + (y / size) * 0.5;
      put(x, y, mix(79, 219, t), mix(70, 39, t), mix(229, 119, t), edge);
    }
  }

  // Stick ball.
  const ballY = size * 0.36;
  const ballR = size * 0.15;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - ballY);
      const a = Math.min(1, Math.max(0, ballR - d + 0.5));
      if (a > 0) put(x, y, 255, 255, 255, a);
    }
  }

  // Shaft.
  const shaftW = size * 0.075;
  for (let y = Math.floor(ballY); y < size * 0.63; y++) {
    for (let x = Math.floor(cx - shaftW); x <= Math.ceil(cx + shaftW); x++) {
      const a = Math.min(1, Math.max(0, shaftW - Math.abs(x - cx) + 0.5));
      if (a > 0) put(x, y, 255, 255, 255, a);
    }
  }

  // Base plate.
  const baseY = size * 0.68;
  const baseW = size * 0.3;
  const baseH = size * 0.075;
  for (let y = Math.floor(baseY - baseH); y <= Math.ceil(baseY + baseH); y++) {
    for (let x = Math.floor(cx - baseW); x <= Math.ceil(cx + baseW); x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const dx = Math.max(0, Math.abs(x - cx) - (baseW - baseH));
      const dy = Math.abs(y - baseY);
      const d = Math.hypot(dx, dy);
      const a = Math.min(1, Math.max(0, baseH - d + 0.5));
      if (a > 0) put(x, y, 255, 255, 255, a);
    }
  }

  // Two action buttons.
  for (const [ox, oy] of [
    [0.74, 0.72],
    [0.26, 0.72],
  ]) {
    const bx = size * ox;
    const by = size * oy;
    const br = size * 0.055;
    for (let y = Math.floor(by - br - 1); y <= Math.ceil(by + br + 1); y++) {
      for (let x = Math.floor(bx - br - 1); x <= Math.ceil(bx + br + 1); x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const a = Math.min(1, Math.max(0, br - Math.hypot(x - bx, y - by) + 0.5));
        if (a > 0) put(x, y, 255, 255, 255, a * 0.85);
      }
    }
  }

  void r;
  return encodePng(size, size, buf);
}

mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(resolve(outDir, `icon-${size}.png`), drawIcon(size));
  console.log(`wrote public/icon-${size}.png`);
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4f46e5"/>
      <stop offset="1" stop-color="#db2777"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <circle cx="32" cy="23" r="9.5" fill="#fff"/>
  <rect x="27.5" y="23" width="9" height="20" fill="#fff"/>
  <rect x="13" y="40" width="38" height="9" rx="4.5" fill="#fff"/>
  <circle cx="47" cy="46" r="3.5" fill="#fff" opacity="0.85"/>
  <circle cx="17" cy="46" r="3.5" fill="#fff" opacity="0.85"/>
</svg>
`;
writeFileSync(resolve(outDir, 'favicon.svg'), favicon);
console.log('wrote public/favicon.svg');
