/* =====================================================================
 * math3d.js — Vector & matrix 4x4 (mengikuti modul praktikum 4 dan 5)
 *
 * KONVENSI (sama dengan modul, jangan dicampur dengan konvensi lain):
 *   - Mat4 = Float32Array(16); translasi ada di indeks 12, 13, 14
 *     (siap dikirim ke GPU: gl.uniformMatrix4fv(loc, false, matrix)).
 *   - Mat4.multiply(a, b) artinya "a DULU, lalu b".
 *       model = multiply(model, rx);   // rotasi X dulu
 *       model = multiply(model, ry);   // lalu rotasi Y
 *   - Di shader tetap:  P * V * M * vec4(position, 1.0)
 *
 * Isi: degToRad, Vec3, Mat4, normalMatrixFromMat4
 * Tambahan dari modul: rotationZ, Vec3.add/scale/length, Mat4.trs.
 * Tidak bergantung pada file lain.
 * ===================================================================== */

export function degToRad(degree) {
  return (degree * Math.PI) / 180;
}

export const Vec3 = {
  add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  },

  subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },

  scale(a, s) {
    return [a[0] * s, a[1] * s, a[2] * s];
  },

  cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  },

  dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },

  length(v) {
    return Math.hypot(v[0], v[1], v[2]);
  },

  normalize(v) {
    const length = Math.hypot(v[0], v[1], v[2]);
    if (length < 0.000001) {
      return [0, 0, 0];
    }
    return [v[0] / length, v[1] / length, v[2] / length];
  },
};

export const Mat4 = {
  identity() {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
  },

  translation(tx, ty, tz) {
    return new Float32Array([
      1,  0,  0,  0,
      0,  1,  0,  0,
      0,  0,  1,  0,
      tx, ty, tz, 1,
    ]);
  },

  rotationX(rad) {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return new Float32Array([
      1,  0, 0, 0,
      0,  c, s, 0,
      0, -s, c, 0,
      0,  0, 0, 1,
    ]);
  },

  rotationY(rad) {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return new Float32Array([
      c, 0, -s, 0,
      0, 1,  0, 0,
      s, 0,  c, 0,
      0, 0,  0, 1,
    ]);
  },

  // Tambahan (tidak ada di modul): dibutuhkan untuk memiringkan lampu, roda, dll.
  rotationZ(rad) {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return new Float32Array([
       c, s, 0, 0,
      -s, c, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ]);
  },

  scaling(sx, sy, sz) {
    return new Float32Array([
      sx, 0,  0,  0,
      0,  sy, 0,  0,
      0,  0,  sz, 0,
      0,  0,  0,  1,
    ]);
  },

  /** "a dulu, lalu b" (sama dengan modul). */
  multiply(a, b) {
    const out = new Float32Array(16);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        let sum = 0;

        for (let i = 0; i < 4; i++) {
          sum += b[i * 4 + col] * a[row * 4 + i];
        }

        out[row * 4 + col] = sum;
      }
    }

    return out;
  },

  /**
   * Local matrix dari posisi, rotasi (derajat), dan skala dengan urutan:
   *   scale -> rotateZ -> rotateX -> rotateY -> translate
   * Dipakai SceneNode untuk hierarchical modelling.
   */
  trs(position, rotationDeg, scale) {
    let m = Mat4.scaling(scale[0], scale[1], scale[2]);
    m = Mat4.multiply(m, Mat4.rotationZ(degToRad(rotationDeg[2])));
    m = Mat4.multiply(m, Mat4.rotationX(degToRad(rotationDeg[0])));
    m = Mat4.multiply(m, Mat4.rotationY(degToRad(rotationDeg[1])));
    m = Mat4.multiply(m, Mat4.translation(position[0], position[1], position[2]));
    return m;
  },

  lookAt(position, target, up) {
    const forward = Vec3.normalize(Vec3.subtract(target, position));
    const right = Vec3.normalize(Vec3.cross(forward, up));
    const correctedUp = Vec3.cross(right, forward);

    return new Float32Array([
      right[0], correctedUp[0], -forward[0], 0,
      right[1], correctedUp[1], -forward[1], 0,
      right[2], correctedUp[2], -forward[2], 0,

      -Vec3.dot(right, position),
      -Vec3.dot(correctedUp, position),
       Vec3.dot(forward, position),
      1,
    ]);
  },

  perspective(fovRad, aspect, near, far) {
    const f = 1.0 / Math.tan(fovRad / 2);
    const rangeInv = 1.0 / (near - far);

    return new Float32Array([
      f / aspect, 0, 0,                         0,
      0,          f, 0,                         0,
      0,          0, (near + far) * rangeInv,  -1,
      0,          0, 2 * near * far * rangeInv, 0,
    ]);
  },

  orthographic(left, right, bottom, top, near, far) {
    return new Float32Array([
      2 / (right - left), 0, 0, 0,
      0, 2 / (top - bottom), 0, 0,
      0, 0, -2 / (far - near), 0,

      -(right + left) / (right - left),
      -(top + bottom) / (top - bottom),
      -(far + near) / (far - near),
      1,
    ]);
  },
};

/**
 * Normal Matrix 3x3 = inverse-transpose dari bagian linear Model Matrix
 * (dari modul pertemuan 5). Wajib dipakai agar normal tetap benar saat
 * ada non-uniform scale. Dikirim dengan gl.uniformMatrix3fv(loc, false, nm).
 */
export function normalMatrixFromMat4(m) {
  const a00 = m[0];
  const a01 = m[1];
  const a02 = m[2];

  const a10 = m[4];
  const a11 = m[5];
  const a12 = m[6];

  const a20 = m[8];
  const a21 = m[9];
  const a22 = m[10];

  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;

  let det = a00 * b01 + a01 * b11 + a02 * b21;

  if (Math.abs(det) < 0.000001) {
    return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }

  det = 1.0 / det;

  const inv00 = b01 * det;
  const inv01 = (-a22 * a01 + a02 * a21) * det;
  const inv02 = (a12 * a01 - a02 * a11) * det;

  const inv10 = b11 * det;
  const inv11 = (a22 * a00 - a02 * a20) * det;
  const inv12 = (-a12 * a00 + a02 * a10) * det;

  const inv20 = b21 * det;
  const inv21 = (-a21 * a00 + a01 * a20) * det;
  const inv22 = (a11 * a00 - a01 * a10) * det;

  // transpose(inverse)
  return new Float32Array([
    inv00, inv10, inv20,
    inv01, inv11, inv21,
    inv02, inv12, inv22,
  ]);
}
