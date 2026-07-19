import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("public/icons", { recursive: true });

// Rounded-square "notebook" logo on the brand blue.
function svg(size, maskable) {
  // For maskable icons keep the glyph within the safe zone (~80%).
  const pad = maskable ? size * 0.14 : size * 0.0;
  const inner = size - pad * 2;
  const radius = maskable ? size * 0.0 : size * 0.22;
  const fontSize = inner * 0.5;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#4f7ef8"/>
        <stop offset="1" stop-color="#2f57d6"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
    <text x="50%" y="50%" dy="0.02em" text-anchor="middle" dominant-baseline="central"
      font-size="${fontSize}" font-family="Segoe UI, Helvetica, Arial, sans-serif"
      font-weight="700" fill="#ffffff">B</text>
  </svg>`;
}

async function render(size, name, maskable = false) {
  await sharp(Buffer.from(svg(size, maskable)))
    .png()
    .toFile(`public/icons/${name}`);
  console.log("wrote public/icons/" + name);
}

await render(192, "icon-192.png");
await render(512, "icon-512.png");
await render(512, "icon-maskable-512.png", true);
