/* =====================================================================
 * helper_function.js — Tugas 2 Grafika Komputer (WebGL2)
 * Scene: jalan paving di sekitar ITS (jalan, curb kuning-hitam, rumput,
 *        pohon, lampu jalan, rambu 30, mobil, langit).
 *
 * Isi file (urut dari dasar ke atas):
 *   1. WebGL dasar      : setupGL, createShader, createProgram, uniform locs
 *   2. Matematika       : dipisah ke math3d.js (Vec3, Mat4, normalMatrixFromMat4)
 *   3. Mesh & Geometry  : createMesh, drawMesh, box/plane/cylinder/sphere
 *   4. Texture prosedural (canvas 2D) : paving, curb, rumput, daun, langit...
 *   5. Shader standar   : Blinn-Phong + texture + fog (siap pakai)
 *   6. Hierarchical     : SceneNode (parent-child), find, toTreeString
 *   7. Camera           : first-person camera + kontrol keyboard/mouse
 *   8. Animasi          : loop, lerp, pingPong, wrap
 *   9. Render scene     : renderScene (sky + tree)
 *
 * Konvensi: right-handed, Y ke atas, Mat4 dari math3d.js (multiply(a,b) = a dulu, lalu b).
 * Jalan membentang di sumbu -Z, kamera default di (0, 1.6, 8) melihat ke -Z.
 * File ini dipakai sebagai ES Module:
 *   <script type="module" src="main.js"></script>
 *   import { ... } from "./helper_function.js";
 * ===================================================================== */

import { Vec3, Mat4, degToRad, normalMatrixFromMat4 } from "./math3d.js";

// Re-export supaya main.js cukup import dari satu tempat
export { Vec3, Mat4, degToRad, normalMatrixFromMat4 };

/* =====================================================================
 * 1. WEBGL DASAR
 * ===================================================================== */

/** Ambil WebGL2 context + state default (depth test, warna clear). */
export function setupGL(canvas, clearColor = [0.81, 0.9, 0.97, 1]) {
  const gl = canvas.getContext("webgl2", { antialias: true });
  if (!gl) throw new Error("WebGL2 tidak tersedia.");
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(...clearColor);
  return gl;
}

/** Samakan resolusi canvas dengan ukuran tampilannya. true jika berubah. */
export function resizeCanvasToDisplaySize(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w && h && (canvas.width !== w || canvas.height !== h)) {
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  return false;
}

export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compile error:\n" + info);
  }
  return shader;
}

export function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Program link error:\n" + info);
  }
  return program;
}

/** Shortcut: source vertex + fragment -> program. */
export function createProgramFromSource(gl, vsSource, fsSource) {
  return createProgram(
    gl,
    createShader(gl, gl.VERTEX_SHADER, vsSource),
    createShader(gl, gl.FRAGMENT_SHADER, fsSource)
  );
}

/** Ambil SEMUA uniform location sekaligus -> { u_model: loc, ... }. */
export function getUniformLocations(gl, program) {
  const result = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    const name = info.name.replace(/\[0\]$/, "");
    result[name] = gl.getUniformLocation(program, info.name);
  }
  return result;
}

/* =====================================================================
 * 2. UTILITAS RANDOM (matriks ada di math3d.js)
 * ===================================================================== */

/* ---- RNG deterministik (agar tekstur & jitter selalu sama tiap reload) ---- */
export function createRng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =====================================================================
 * 3. MESH & GEOMETRY
 *    Semua generator mengembalikan { positions, normals, uvs, indices }
 *    Attribute location tetap: 0 = position, 1 = normal, 2 = texCoord
 * ===================================================================== */

export function createArrayBuffer(gl, data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

export function setupAttribute(gl, buffer, location, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

/** Geometry -> mesh siap gambar (VAO + buffer). */
export function createMesh(gl, geo) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  setupAttribute(gl, createArrayBuffer(gl, new Float32Array(geo.positions)), 0, 3);
  setupAttribute(gl, createArrayBuffer(gl, new Float32Array(geo.normals)), 1, 3);
  setupAttribute(gl, createArrayBuffer(gl, new Float32Array(geo.uvs)), 2, 2);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geo.indices), gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  return { vao, count: geo.indices.length };
}

export function drawMesh(gl, mesh) {
  gl.bindVertexArray(mesh.vao);
  gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
}

/**
 * Box. pivot: "center" (origin di tengah) | "base" (origin di dasar, cocok
 * untuk curb/kotak panel/mobil yang menapak tanah).
 * repeat = [ulang U, ulang V] untuk tiling texture (mis. stripe curb).
 * Catatan UV: pada sisi depan/belakang/atas/bawah, U mengikuti sumbu X.
 */
export function createBox(w = 1, h = 1, d = 1, { repeat = [1, 1], pivot = "center" } = {}) {
  const positions = [], normals = [], uvs = [], indices = [];
  const faces = [
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  ];
  const half = (v) => (Math.abs(v[0]) * w + Math.abs(v[1]) * h + Math.abs(v[2]) * d) / 2;
  const yShift = pivot === "base" ? h / 2 : 0;

  for (const f of faces) {
    const base = positions.length / 3;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      for (let i = 0; i < 3; i++) {
        positions.push(
          f.n[i] * half(f.n) + f.u[i] * su * half(f.u) + f.v[i] * sv * half(f.v) +
            (i === 1 ? yShift : 0)
        );
      }
      normals.push(...f.n);
      uvs.push(((su + 1) / 2) * repeat[0], ((sv + 1) / 2) * repeat[1]);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, uvs, indices };
}

/** Bidang datar XZ, normal +Y (jalan, rumput). repeat = tiling texture. */
export function createPlane(w = 1, d = 1, { segX = 1, segZ = 1, repeat = [1, 1] } = {}) {
  const positions = [], normals = [], uvs = [], indices = [];
  for (let j = 0; j <= segZ; j++)
    for (let i = 0; i <= segX; i++) {
      positions.push((i / segX - 0.5) * w, 0, (j / segZ - 0.5) * d);
      normals.push(0, 1, 0);
      uvs.push((i / segX) * repeat[0], (j / segZ) * repeat[1]);
    }
  const row = segX + 1;
  for (let j = 0; j < segZ; j++)
    for (let i = 0; i < segX; i++) {
      const a = j * row + i, b = a + row;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  return { positions, normals, uvs, indices };
}

/**
 * Cylinder / cone / frustum, sumbu Y, DASAR di y=0 sampai y=height.
 * rTop = 0 -> cone. Cocok untuk batang pohon, tiang lampu, tiang rambu, roda
 * (roda: putar Z 90°), dan rambu bulat (cylinder pendek, texture ada di cap).
 */
export function createCylinder(rTop = 0.5, rBottom = 0.5, height = 1, segments = 24, { caps = true, repeat = [1, 1] } = {}) {
  const positions = [], normals = [], uvs = [], indices = [];
  const slope = (rBottom - rTop) / (height || 1);

  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const n = Vec3.normalize([c, slope, s]);
    positions.push(c * rBottom, 0, s * rBottom); normals.push(...n); uvs.push((i / segments) * repeat[0], 0);
    positions.push(c * rTop, height, s * rTop);  normals.push(...n); uvs.push((i / segments) * repeat[0], repeat[1]);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, b, c, c, b, d);
  }

  const addCap = (y, r, ny) => {
    if (r <= 0) return;
    const center = positions.length / 3;
    positions.push(0, y, 0); normals.push(0, ny, 0); uvs.push(0.5, 0.5);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      positions.push(c * r, y, s * r); normals.push(0, ny, 0);
      uvs.push(0.5 + 0.5 * c, 0.5 + 0.5 * s);
    }
    for (let i = 0; i < segments; i++) {
      if (ny > 0) indices.push(center, center + i + 2, center + i + 1);
      else indices.push(center, center + i + 1, center + i + 2);
    }
  };
  if (caps) { addCap(height, rTop, 1); addCap(0, rBottom, -1); }
  return { positions, normals, uvs, indices };
}

/**
 * Sphere. jitter > 0 membuat permukaan bergelombang (kanopi pohon / semak)
 * tanpa retak di seam karena noise-nya fungsi dari arah, bukan dari index.
 * Dipakai juga untuk sky dome (radius 1, lalu di-scale).
 */
export function createSphere(radius = 1, latBands = 16, lonBands = 24, { jitter = 0, repeat = [1, 1] } = {}) {
  const positions = [], normals = [], uvs = [], indices = [];
  for (let lat = 0; lat <= latBands; lat++) {
    const th = (lat / latBands) * Math.PI;
    for (let lon = 0; lon <= lonBands; lon++) {
      const ph = (lon / lonBands) * Math.PI * 2;
      const dir = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      const bump = jitter
        ? 1 + jitter * Math.sin(dir[0] * 5 + 1.3) * Math.sin(dir[1] * 4 + 0.7) * Math.sin(dir[2] * 6 + 2.1)
        : 1;
      positions.push(dir[0] * radius * bump, dir[1] * radius * bump, dir[2] * radius * bump);
      normals.push(...dir);
      uvs.push((lon / lonBands) * repeat[0], (1 - lat / latBands) * repeat[1]);
    }
  }
  const row = lonBands + 1;
  for (let lat = 0; lat < latBands; lat++)
    for (let lon = 0; lon < lonBands; lon++) {
      const a = lat * row + lon, b = a + row;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  return { positions, normals, uvs, indices };
}

/* =====================================================================
 * 4. TEXTURE PROSEDURAL (digambar di canvas 2D -> texture WebGL)
 *    Tidak butuh file gambar; hasil seamless (bisa di-tiling).
 *    Kalau mau pakai foto asli: loadTexture(gl, "assets/paving.jpg")
 * ===================================================================== */

const rgb = (c, k = 1) =>
  `rgb(${Math.max(0, Math.min(255, c[0] * k)) | 0},${Math.max(0, Math.min(255, c[1] * k)) | 0},${Math.max(0, Math.min(255, c[2] * k)) | 0})`;

function makeCanvas(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

/** Gambar fn di 9 posisi offset supaya objek yang melewati tepi tetap seamless. */
function drawWrapped(w, h, x, y, fn) {
  for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) fn(x + ox, y + oy);
}

/** Canvas -> texture WebGL (flipY, mipmap, anisotropic jika tersedia). */
export function canvasToTexture(gl, source, { repeat = true, mipmap = true } = {}) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (mipmap) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    // Penting untuk jalan yang dilihat miring (grazing angle) agar tidak blur
    const ext = gl.getExtension("EXT_texture_filter_anisotropic");
    if (ext) {
      const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
    }
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  return tex;
}

/** Load gambar dari URL. Langsung mengembalikan texture (placeholder abu-abu), terisi saat gambar selesai dimuat. */
export function loadTexture(gl, url, opts = {}) {
  const tex = canvasToTexture(gl, solidCanvas([128, 128, 128]), { repeat: opts.repeat ?? true, mipmap: false });
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  };
  img.src = url;
  return tex;
}

function solidCanvas(color, size = 4) {
  const c = makeCanvas(size), ctx = c.getContext("2d");
  ctx.fillStyle = rgb(color);
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** Texture warna polos (untuk objek tanpa motif: body mobil, tiang, dll). */
export function createSolidTexture(gl, color = [255, 255, 255]) {
  return canvasToTexture(gl, solidCanvas(color), { mipmap: false });
}

/** Noise bintik umum: aspal, beton, kulit kayu, cat mobil kusam, dll. */
export function createNoiseTexture(gl, { size = 256, base = [128, 128, 128], variance = 0.15, speckles = 3000, seed = 7 } = {}) {
  const c = makeCanvas(size), ctx = c.getContext("2d"), rnd = createRng(seed);
  ctx.fillStyle = rgb(base);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < speckles; i++) {
    const x = rnd() * size, y = rnd() * size, r = 0.6 + rnd() * 1.8;
    const k = 1 + (rnd() - 0.5) * 2 * variance;
    ctx.fillStyle = rgb(base, k);
    drawWrapped(size, size, x, y, (px, py) => ctx.fillRect(px, py, r, r));
  }
  return canvasToTexture(gl, c);
}

/**
 * Paving block pola herringbone (tulang ikan) seperti di foto jalan.
 * Tile 16x16 satuan, periodik 4 -> seamless. Warna tiap blok sedikit beda
 * (hash dari posisi) sehingga terlihat natural, + celah gelap antar blok.
 * Pakai uvRepeat besar di plane (mis. [30, 120]) agar blok kecil.
 */
export function createPavingTexture(gl, { size = 512, base = [118, 116, 120], variance = 0.22, gap = [48, 47, 50], seed = 3 } = {}) {
  const U = 16, u = size / U;
  const c = makeCanvas(size), ctx = c.getContext("2d");
  ctx.fillStyle = rgb(gap);
  ctx.fillRect(0, 0, size, size);

  const hash = (x, y, o) => {
    const wx = ((x % U) + U) % U, wy = ((y % U) + U) % U;
    return createRng(seed * 1000 + wx * 131 + wy * 17 + o * 7)();
  };
  const brick = (x, y, bw, bh, o) => {
    const k = 1 + (hash(x, y, o) - 0.5) * 2 * variance;
    ctx.fillStyle = rgb(base, k);
    ctx.fillRect(x * u + 1, y * u + 1, bw * u - 2, bh * u - 2);
  };
  // Pola: tiap "tangga" t berisi 1 blok horizontal (2x1) + 1 blok vertikal (1x2)
  for (let t = -4; t <= U + 4; t++)
    for (let s = -U - 8; s <= U + 8; s += 4) {
      brick(t + s, t, 2, 1, 0);
      brick(t + s + 2, t - 1, 1, 2, 1);
    }
  return canvasToTexture(gl, c);
}

/** Curb belang kuning-hitam (seperti pembatas jalan di foto). */
export function createStripeTexture(gl, { size = 256, count = 2, colorA = [235, 190, 30], colorB = [28, 28, 30] } = {}) {
  const c = makeCanvas(size, size / 2), ctx = c.getContext("2d");
  const w = size / (count * 2);
  for (let i = 0; i < count * 2; i++) {
    ctx.fillStyle = rgb(i % 2 === 0 ? colorA : colorB);
    ctx.fillRect(i * w, 0, w + 1, size / 2);
  }
  return canvasToTexture(gl, c);
}

/** Rumput (di foto: hijau bercampur kuning kering). */
export function createGrassTexture(gl, { size = 512, base = [110, 140, 50], dry = [170, 160, 70], dryAmount = 0.35, blades = 9000, seed = 11 } = {}) {
  const c = makeCanvas(size), ctx = c.getContext("2d"), rnd = createRng(seed);
  ctx.fillStyle = rgb(base, 0.85);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < blades; i++) {
    const x = rnd() * size, y = rnd() * size, len = 4 + rnd() * 9;
    const col = rnd() < dryAmount ? dry : base;
    ctx.strokeStyle = rgb(col, 0.7 + rnd() * 0.6);
    ctx.lineWidth = 1 + rnd();
    const lean = (rnd() - 0.5) * 4;
    drawWrapped(size, size, x, y, (px, py) => {
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + lean, py - len); ctx.stroke();
    });
  }
  return canvasToTexture(gl, c);
}

/** Daun pohon: bintik hijau gelap-terang. Opsional bunga putih/pink (pohon tabebuya di foto). */
export function createLeafTexture(gl, { size = 256, base = [60, 110, 40], flowers = 0, flowerColor = [250, 240, 245], seed = 5 } = {}) {
  const c = makeCanvas(size), ctx = c.getContext("2d"), rnd = createRng(seed);
  ctx.fillStyle = rgb(base, 0.8);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2500; i++) {
    const x = rnd() * size, y = rnd() * size, r = 2 + rnd() * 5;
    ctx.fillStyle = rgb(base, 0.55 + rnd() * 0.9);
    drawWrapped(size, size, x, y, (px, py) => { ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); });
  }
  for (let i = 0; i < flowers; i++) {
    const x = rnd() * size, y = rnd() * size, r = 3 + rnd() * 4;
    ctx.fillStyle = rgb(flowerColor, 0.9 + rnd() * 0.1);
    drawWrapped(size, size, x, y, (px, py) => { ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); });
  }
  return canvasToTexture(gl, c);
}

/** Langit gradasi biru + awan tipis (untuk sky dome). Atas = zenith, tengah = horizon. */
export function createSkyTexture(gl, { width = 1024, height = 512, top = [62, 130, 215], horizon = [205, 228, 247], clouds = 14, seed = 21 } = {}) {
  const c = makeCanvas(width, height), ctx = c.getContext("2d"), rnd = createRng(seed);
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, rgb(top));
  g.addColorStop(0.5, rgb(horizon));
  g.addColorStop(1, rgb(horizon));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < clouds; i++) {
    const x = rnd() * width, y = height * (0.12 + rnd() * 0.3);
    const rw = 80 + rnd() * 160, rh = 8 + rnd() * 14;
    drawWrapped(width, height, x, y, (px, py) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(rw / rh, 1);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rh);
      rg.addColorStop(0, "rgba(255,255,255,0.55)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(0, 0, rh, 0, 7); ctx.fill();
      ctx.restore();
    });
  }
  return canvasToTexture(gl, c);
}

/** Rambu batas kecepatan bulat (cincin merah, angka hitam). Pasang pada cap cylinder pendek. */
export function createSpeedSignTexture(gl, text = "30", { size = 256 } = {}) {
  const c = makeCanvas(size), ctx = c.getContext("2d"), m = size / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.beginPath(); ctx.arc(m, m, m * 0.96, 0, 7); ctx.fillStyle = "#d3202a"; ctx.fill();
  ctx.beginPath(); ctx.arc(m, m, m * 0.72, 0, 7); ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.fillStyle = "#111";
  ctx.font = `bold ${size * 0.42}px Arial, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, m, m + size * 0.02);
  return canvasToTexture(gl, c, { repeat: false });
}

/* =====================================================================
 * 5. SHADER STANDAR  (Blinn-Phong + texture + fog + sun + lampu)
 * ===================================================================== */

export const STANDARD_VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_texCoord;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat3 u_normalMatrix;
uniform vec2 u_uvScale;

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_uv;

void main() {
  vec4 world = u_model * vec4(a_position, 1.0);
  v_worldPos = world.xyz;
  v_normal = u_normalMatrix * a_normal;
  v_uv = a_texCoord * u_uvScale;
  gl_Position = u_projection * u_view * world;
}`;

export const STANDARD_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_uv;

uniform sampler2D u_texture;
uniform vec3  u_tint;        // pengali warna texture
uniform float u_shininess;
uniform float u_specular;    // 0..1 kekuatan specular
uniform float u_unlit;       // 1 = tanpa lighting (langit)

uniform vec3 u_cameraPos;
uniform vec3 u_sunDir;       // arah DARI objek MENUJU matahari
uniform vec3 u_sunColor;
uniform vec3 u_ambient;

uniform vec3  u_pointPos;    // lampu jalan
uniform vec3  u_pointColor;
uniform float u_pointRange;  // 0 = lampu mati

uniform vec3  u_fogColor;
uniform float u_fogDensity;

out vec4 outColor;

void main() {
  vec4 tex = texture(u_texture, v_uv);
  if (tex.a < 0.1) discard;
  vec3 albedo = tex.rgb * u_tint;

  if (u_unlit > 0.5) { outColor = vec4(albedo, 1.0); return; }

  vec3 N = normalize(v_normal);
  if (!gl_FrontFacing) N = -N;                 // aman untuk bidang tipis/2 sisi
  vec3 V = normalize(u_cameraPos - v_worldPos);

  // Matahari (directional)
  vec3 L = normalize(u_sunDir);
  float diff = max(dot(N, L), 0.0);
  vec3 H = normalize(L + V);
  float spec = diff > 0.0 ? pow(max(dot(N, H), 0.0), u_shininess) * u_specular : 0.0;
  vec3 light = u_ambient + u_sunColor * diff;
  vec3 specCol = u_sunColor * spec;

  // Lampu titik (point light + attenuation)
  if (u_pointRange > 0.0) {
    vec3 toL = u_pointPos - v_worldPos;
    float dist = length(toL);
    float att = clamp(1.0 - dist / u_pointRange, 0.0, 1.0);
    att *= att;
    vec3 Lp = toL / max(dist, 0.0001);
    light += u_pointColor * max(dot(N, Lp), 0.0) * att;
    vec3 Hp = normalize(Lp + V);
    specCol += u_pointColor * pow(max(dot(N, Hp), 0.0), u_shininess) * u_specular * att;
  }

  vec3 color = albedo * light + specCol;

  // Fog eksponensial: jarak jauh jadi pucat/berkabut seperti di foto
  float d = length(u_cameraPos - v_worldPos);
  float fog = 1.0 - exp(-pow(d * u_fogDensity, 2.0));
  outColor = vec4(mix(color, u_fogColor, clamp(fog, 0.0, 1.0)), 1.0);
}`;

/** Buat program standar + semua uniform location -> { program, uniforms }. */
export function createStandardProgram(gl) {
  const program = createProgramFromSource(gl, STANDARD_VERTEX_SHADER, STANDARD_FRAGMENT_SHADER);
  return { program, uniforms: getUniformLocations(gl, program) };
}

/** Material: texture + parameter Phong. */
export function createMaterial({ texture, tint = [1, 1, 1], shininess = 16, specular = 0.15, unlit = false, uvScale = [1, 1] } = {}) {
  return { texture, tint, shininess, specular, unlit, uvScale };
}

/** Setting cahaya default: siang hari cerah. Ubah propertinya untuk eksperimen lighting. */
export function createLighting(overrides = {}) {
  return {
    sunDir: Vec3.normalize([0.35, 0.85, 0.4]),
    sunColor: [1.0, 0.95, 0.85],
    ambient: [0.42, 0.46, 0.55],
    pointPos: [0, 5, 0],
    pointColor: [1.0, 0.85, 0.6],
    pointRange: 0,                       // 0 = lampu jalan mati
    fogColor: [0.81, 0.9, 0.97],
    fogDensity: 0.012,
    ...overrides,
  };
}

function applyMaterial(gl, pi, m) {
  const u = pi.uniforms;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, m.texture);
  gl.uniform1i(u.u_texture, 0);
  gl.uniform3fv(u.u_tint, m.tint);
  gl.uniform1f(u.u_shininess, m.shininess);
  gl.uniform1f(u.u_specular, m.specular);
  gl.uniform1f(u.u_unlit, m.unlit ? 1 : 0);
  gl.uniform2fv(u.u_uvScale, m.uvScale);
}

/* =====================================================================
 * 6. HIERARCHICAL MODELLING — SceneNode (parent-child)
 *    local = S -> Rz -> Rx -> Ry -> T,  world = local lalu parentWorld
 *    (urutan "dulu, lalu" sesuai Mat4.multiply di math3d.js)
 *    Tips: buat origin objek = titik sendi (pangkal pohon, dasar tiang,
 *    pusat roda) agar rotasi/animasi terlihat natural.
 * ===================================================================== */

export class SceneNode {
  constructor(name, { mesh = null, material = null, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], visible = true } = {}) {
    this.name = name;
    this.mesh = mesh;
    this.material = material;
    this.position = [...position];
    this.rotation = [...rotation];   // derajat [x, y, z]
    this.scale = [...scale];
    this.visible = visible;
    this.parent = null;
    this.children = [];
    this.localMatrix = Mat4.identity();
    this.worldMatrix = Mat4.identity();
  }

  add(...nodes) {
    for (const n of nodes) { n.parent = this; this.children.push(n); }
    return this;                      // bisa di-chain: root.add(a).add(b)
  }

  computeLocal() {
    // scale -> rotateZ -> rotateX -> rotateY -> translate (lihat Mat4.trs di math3d.js)
    this.localMatrix = Mat4.trs(this.position, this.rotation, this.scale);
    return this.localMatrix;
  }

  /** Hitung world matrix seluruh subtree (panggil sekali per frame dari root). */
  updateWorld(parentWorld = null) {
    const local = this.computeLocal();
    // konvensi modul: local dulu, baru transform parent
    this.worldMatrix = parentWorld ? Mat4.multiply(local, parentWorld) : local;
    for (const c of this.children) c.updateWorld(this.worldMatrix);
  }

  draw(gl, pi) {
    if (!this.visible) return;
    if (this.mesh && this.material) {
      gl.uniformMatrix4fv(pi.uniforms.u_model, false, this.worldMatrix);
      gl.uniformMatrix3fv(pi.uniforms.u_normalMatrix, false, normalMatrixFromMat4(this.worldMatrix));
      applyMaterial(gl, pi, this.material);
      drawMesh(gl, this.mesh);
    }
    for (const c of this.children) c.draw(gl, pi);
  }

  find(name) {
    if (this.name === name) return this;
    for (const c of this.children) { const r = c.find(name); if (r) return r; }
    return null;
  }

  traverse(fn, depth = 0) {
    fn(this, depth);
    for (const c of this.children) c.traverse(fn, depth + 1);
  }

  /** Posisi world node (kolom translasi world matrix). */
  getWorldPosition() {
    return [this.worldMatrix[12], this.worldMatrix[13], this.worldMatrix[14]];
  }

  /** Teks pohon hierarki -> untuk "Desain tree hubungan antar objek" & HUD. */
  toTreeString() {
    const lines = [];
    const walk = (node, prefix, isLast, isRoot) => {
      lines.push(isRoot ? node.name : prefix + (isLast ? "└── " : "├── ") + node.name);
      const next = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
      node.children.forEach((c, i) => walk(c, next, i === node.children.length - 1, false));
    };
    walk(this, "", true, true);
    return lines.join("\n");
  }
}

/** Jumlah node dalam subtree (untuk laporan kompleksitas). */
export function countNodes(root) {
  let n = 0;
  root.traverse(() => n++);
  return n;
}

/** Sky dome yang selalu mengikuti kamera. Pakai createSkyTexture. */
export function createSkyNode(gl, texture, radius = 200) {
  return new SceneNode("Sky", {
    mesh: createMesh(gl, createSphere(1, 24, 48)),
    material: createMaterial({ texture, unlit: true }),
    scale: [radius, radius, radius],
  });
}

/* =====================================================================
 * 7. CAMERA (first-person; default meniru sudut foto jalan)
 *    yaw = 0 melihat ke -Z. Drag mouse = lihat sekeliling.
 * ===================================================================== */

export function createCamera({ position = [0, 1.6, 8], yaw = 0, pitch = 0, fov = 60, near = 0.1, far = 400 } = {}) {
  return { position: [...position], yaw, pitch, fov, near, far, home: { position: [...position], yaw, pitch, fov } };
}

export function getCameraForward(cam) {
  const y = degToRad(cam.yaw), p = degToRad(cam.pitch);
  return [Math.cos(p) * Math.sin(y), Math.sin(p), -Math.cos(p) * Math.cos(y)];
}

export function getCameraRight(cam) {
  const y = degToRad(cam.yaw);
  return [Math.cos(y), 0, Math.sin(y)];
}

export function getViewMatrix(cam) {
  const target = Vec3.add(cam.position, getCameraForward(cam));
  return Mat4.lookAt(cam.position, target, [0, 1, 0]);
}

export function getProjectionMatrix(cam, aspect) {
  return Mat4.perspective(degToRad(cam.fov), aspect, cam.near, cam.far);
}

export function resetCamera(cam) {
  Object.assign(cam, { position: [...cam.home.position], yaw: cam.home.yaw, pitch: cam.home.pitch, fov: cam.home.fov });
}

/**
 * Kontrol kamera.
 *   W/S maju-mundur, A/D geser kiri-kanan, Q/E turun-naik,
 *   Arrow = menoleh, drag mouse = menoleh, scroll = FOV, R = reset.
 * Pakai: const ctl = attachCameraControls(canvas, cam);  lalu ctl.update(dt) tiap frame.
 */
export function attachCameraControls(canvas, cam, { moveSpeed = 6, turnSpeed = 70, mouseSens = 0.15 } = {}) {
  const keys = new Set();
  let dragging = false, lx = 0, ly = 0;

  const onKeyDown = (e) => {
    keys.add(e.code);
    if (e.code === "KeyR") resetCamera(cam);
    if (e.code.startsWith("Arrow")) e.preventDefault();
  };
  const onKeyUp = (e) => keys.delete(e.code);
  const onDown = (e) => { dragging = true; lx = e.clientX; ly = e.clientY; };
  const onUp = () => { dragging = false; };
  const onMove = (e) => {
    if (!dragging) return;
    cam.yaw += (e.clientX - lx) * mouseSens;
    cam.pitch = Math.max(-85, Math.min(85, cam.pitch - (e.clientY - ly) * mouseSens));
    lx = e.clientX; ly = e.clientY;
  };
  const onWheel = (e) => {
    e.preventDefault();
    cam.fov = Math.max(20, Math.min(100, cam.fov + Math.sign(e.deltaY) * 3));
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousedown", onDown);
  window.addEventListener("mouseup", onUp);
  window.addEventListener("mousemove", onMove);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  return {
    update(dt) {
      const f = getCameraForward(cam), r = getCameraRight(cam);
      let move = [0, 0, 0];
      if (keys.has("KeyW")) move = Vec3.add(move, f);
      if (keys.has("KeyS")) move = Vec3.subtract(move, f);
      if (keys.has("KeyD")) move = Vec3.add(move, r);
      if (keys.has("KeyA")) move = Vec3.subtract(move, r);
      if (keys.has("KeyE")) move = Vec3.add(move, [0, 1, 0]);
      if (keys.has("KeyQ")) move = Vec3.subtract(move, [0, 1, 0]);
      cam.position = Vec3.add(cam.position, Vec3.scale(move, moveSpeed * dt));
      if (keys.has("ArrowLeft")) cam.yaw -= turnSpeed * dt;
      if (keys.has("ArrowRight")) cam.yaw += turnSpeed * dt;
      if (keys.has("ArrowUp")) cam.pitch = Math.min(85, cam.pitch + turnSpeed * dt);
      if (keys.has("ArrowDown")) cam.pitch = Math.max(-85, cam.pitch - turnSpeed * dt);
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("wheel", onWheel);
    },
  };
}

/* =====================================================================
 * 8. ANIMASI
 * ===================================================================== */

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);

/** Bolak-balik 0..1..0 (mis. ayunan pohon, lampu berkedip). period dalam detik. */
export const pingPong = (time, period = 2) => 0.5 - 0.5 * Math.cos((time / period) * Math.PI * 2);

/** Bungkus nilai ke [min, max) — mobil yang keluar jalan muncul lagi dari ujung lain. */
export function wrap(v, min, max) {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
}

/** Loop animasi dengan delta time (detik) dan total time. */
export function createLoop(callback) {
  let last = performance.now(), time = 0, running = true;
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);   // batasi saat tab di-background
    last = now;
    time += dt;
    callback(dt, time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { stop: () => { running = false; } };
}

/* =====================================================================
 * 9. RENDER SCENE
 * ===================================================================== */

/**
 * Satu frame render lengkap:
 *   clear -> kirim camera + lighting -> gambar sky (tanpa depth write) -> gambar tree.
 * root.updateWorld() dipanggil di sini, jadi cukup ubah position/rotation node
 * di update() lalu panggil renderScene.
 */
export function renderScene(gl, pi, { root, sky = null, camera, lighting }) {
  resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const u = pi.uniforms;
  gl.useProgram(pi.program);
  gl.uniformMatrix4fv(u.u_view, false, getViewMatrix(camera));
  gl.uniformMatrix4fv(u.u_projection, false, getProjectionMatrix(camera, gl.canvas.width / gl.canvas.height));
  gl.uniform3fv(u.u_cameraPos, camera.position);
  gl.uniform3fv(u.u_sunDir, lighting.sunDir);
  gl.uniform3fv(u.u_sunColor, lighting.sunColor);
  gl.uniform3fv(u.u_ambient, lighting.ambient);
  gl.uniform3fv(u.u_pointPos, lighting.pointPos);
  gl.uniform3fv(u.u_pointColor, lighting.pointColor);
  gl.uniform1f(u.u_pointRange, lighting.pointRange);
  gl.uniform3fv(u.u_fogColor, lighting.fogColor);
  gl.uniform1f(u.u_fogDensity, lighting.fogDensity);

  if (sky) {
    sky.position = [...camera.position];
    sky.updateWorld();
    gl.depthMask(false);
    sky.draw(gl, pi);
    gl.depthMask(true);
  }

  root.updateWorld();
  root.draw(gl, pi);
}
