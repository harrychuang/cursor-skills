/**
 * PNG read/write with no npm dependencies (node:zlib only).
 *
 * Reads 8- and 16-bit greyscale, RGB, palette, and RGBA files, non-interlaced — which covers
 * browser screenshots and design-tool exports. Always returns 8-bit RGBA.
 */

import zlib from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function decodePng(buffer) {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error("Not a PNG file.");
  let offset = 8;
  let header = null;
  let palette = null;
  let transparency = null;
  const data = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      header = { width: body.readUInt32BE(0), height: body.readUInt32BE(4), depth: body[8], colorType: body[9], interlace: body[12] };
    } else if (type === "PLTE") palette = body;
    else if (type === "tRNS") transparency = body;
    else if (type === "IDAT") data.push(body);
    else if (type === "IEND") break;
  }
  if (!header) throw new Error("PNG has no header.");
  if (header.interlace) throw new Error("Interlaced PNG is not supported — re-export without interlacing.");
  if (header.depth !== 8 && header.depth !== 16) throw new Error(`PNG bit depth ${header.depth} is not supported — re-export as 8-bit.`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[header.colorType];
  if (!channels) throw new Error(`PNG colour type ${header.colorType} is not supported.`);
  const bytes = header.depth / 8;
  const bpp = channels * bytes;
  const stride = header.width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(data));
  const pixels = Buffer.alloc(header.width * header.height * bpp);

  // Undo the per-row prediction filters.
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < header.height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bpp ? out[x - bpp] : 0;
      const up = previous[x];
      const upLeft = x >= bpp ? previous[x - bpp] : 0;
      let value = row[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      out[x] = value & 0xff;
    }
    previous = out;
  }

  const rgba = new Uint8Array(header.width * header.height * 4);
  const count = header.width * header.height;
  for (let i = 0; i < count; i += 1) {
    const s = i * bpp;
    const d = i * 4;
    if (header.colorType === 6) {
      rgba[d] = pixels[s];
      rgba[d + 1] = pixels[s + bytes];
      rgba[d + 2] = pixels[s + 2 * bytes];
      rgba[d + 3] = pixels[s + 3 * bytes];
    } else if (header.colorType === 2) {
      rgba[d] = pixels[s];
      rgba[d + 1] = pixels[s + bytes];
      rgba[d + 2] = pixels[s + 2 * bytes];
      rgba[d + 3] = 255;
    } else if (header.colorType === 3) {
      const index = pixels[s];
      rgba[d] = palette[index * 3];
      rgba[d + 1] = palette[index * 3 + 1];
      rgba[d + 2] = palette[index * 3 + 2];
      rgba[d + 3] = transparency && index < transparency.length ? transparency[index] : 255;
    } else {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = pixels[s];
      rgba[d + 3] = header.colorType === 4 ? pixels[s + bytes] : 255;
    }
  }
  return { width: header.width, height: header.height, data: rgba };
}

export function encodePng({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const chunk = (type, body) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, "latin1");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
    return Buffer.concat([head, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([SIGNATURE, chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}

/** Shrink by a whole factor, averaging each block — used to bring a 2x capture down to a 1x one. */
export function downscale(image, factor) {
  if (factor === 1) return image;
  const width = Math.floor(image.width / factor);
  const height = Math.floor(image.height / factor);
  const data = new Uint8Array(width * height * 4);
  const n = factor * factor;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sum = [0, 0, 0, 0];
      for (let j = 0; j < factor; j += 1) {
        for (let i = 0; i < factor; i += 1) {
          const s = ((y * factor + j) * image.width + x * factor + i) * 4;
          sum[0] += image.data[s];
          sum[1] += image.data[s + 1];
          sum[2] += image.data[s + 2];
          sum[3] += image.data[s + 3];
        }
      }
      const d = (y * width + x) * 4;
      data[d] = Math.round(sum[0] / n);
      data[d + 1] = Math.round(sum[1] / n);
      data[d + 2] = Math.round(sum[2] / n);
      data[d + 3] = Math.round(sum[3] / n);
    }
  }
  return { width, height, data };
}

export function crop(image, x, y, width, height) {
  const x0 = Math.max(0, Math.min(image.width, Math.round(x)));
  const y0 = Math.max(0, Math.min(image.height, Math.round(y)));
  const w = Math.max(1, Math.min(image.width - x0, Math.round(width)));
  const h = Math.max(1, Math.min(image.height - y0, Math.round(height)));
  const data = new Uint8Array(w * h * 4);
  for (let row = 0; row < h; row += 1) {
    data.set(image.data.subarray(((y0 + row) * image.width + x0) * 4, ((y0 + row) * image.width + x0 + w) * 4), row * w * 4);
  }
  return { width: w, height: h, data };
}

/** Enlarge with hard pixel edges, so a one-pixel difference stays a visible square. */
export function upscale(image, factor) {
  if (factor === 1) return image;
  const width = image.width * factor;
  const height = image.height * factor;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < width; x += 1) {
      const s = (sy * image.width + Math.floor(x / factor)) * 4;
      const d = (y * width + x) * 4;
      data[d] = image.data[s];
      data[d + 1] = image.data[s + 1];
      data[d + 2] = image.data[s + 2];
      data[d + 3] = image.data[s + 3];
    }
  }
  return { width, height, data };
}

/** Place images side by side on a neutral ground with a gutter between them. */
export function sideBySide(images, gutter = 8, ground = [40, 40, 46, 255]) {
  const width = images.reduce((sum, image) => sum + image.width, 0) + gutter * (images.length + 1);
  const height = Math.max(...images.map((image) => image.height)) + gutter * 2;
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) data.set(ground, i * 4);
  let x = gutter;
  for (const image of images) {
    for (let row = 0; row < image.height; row += 1) {
      data.set(image.data.subarray(row * image.width * 4, (row + 1) * image.width * 4), ((row + gutter) * width + x) * 4);
    }
    x += image.width + gutter;
  }
  return { width, height, data };
}
