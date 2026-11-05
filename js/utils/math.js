'use strict';
// Column-major 4x4 matrix library (matches WebGL / GLSL convention)
const mat4 = {
  create() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  },

  perspective(fovY, aspect, near, far) {
    const f = 1.0 / Math.tan(fovY * 0.5);
    const d = near - far;
    return new Float32Array([
      f/aspect, 0,  0,               0,
      0,        f,  0,               0,
      0,        0,  (near+far)/d,   -1,
      0,        0,  2*near*far/d,    0
    ]);
  },

  lookAt(eye, center, up) {
    let fx = center[0]-eye[0], fy = center[1]-eye[1], fz = center[2]-eye[2];
    let fl = Math.sqrt(fx*fx+fy*fy+fz*fz);
    fx/=fl; fy/=fl; fz/=fl;

    let rx = fy*up[2]-fz*up[1], ry = fz*up[0]-fx*up[2], rz = fx*up[1]-fy*up[0];
    let rl = Math.sqrt(rx*rx+ry*ry+rz*rz);
    rx/=rl; ry/=rl; rz/=rl;

    const ux = ry*fz-rz*fy, uy = rz*fx-rx*fz, uz = rx*fy-ry*fx;

    return new Float32Array([
      rx, ux, -fx, 0,
      ry, uy, -fy, 0,
      rz, uz, -fz, 0,
      -(rx*eye[0]+ry*eye[1]+rz*eye[2]),
      -(ux*eye[0]+uy*eye[1]+uz*eye[2]),
       (fx*eye[0]+fy*eye[1]+fz*eye[2]),
      1
    ]);
  },

  multiply(a, b) {
    const r = new Float32Array(16);
    for (let c=0;c<4;c++)
      for (let i=0;i<4;i++) {
        let s=0;
        for (let k=0;k<4;k++) s += a[k*4+i] * b[c*4+k];
        r[c*4+i] = s;
      }
    return r;
  },

  fromTranslation(x, y, z) {
    const m = mat4.create();
    m[12]=x; m[13]=y; m[14]=z;
    return m;
  },

  fromScaling(x, y, z) {
    return new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]);
  },

  fromRotationY(a) {
    const c=Math.cos(a), s=Math.sin(a);
    return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
  },

  fromRotationX(a) {
    const c=Math.cos(a), s=Math.sin(a);
    return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
  },

  translate(m, x, y, z) {
    return mat4.multiply(m, mat4.fromTranslation(x,y,z));
  },

  scale(m, x, y, z) {
    return mat4.multiply(m, mat4.fromScaling(x,y,z));
  },

  rotateY(m, a) {
    return mat4.multiply(m, mat4.fromRotationY(a));
  },

  // Upper-left 3x3 for normal transform (assumes uniform scale or pure rotation)
  normalMatrix(m) {
    return new Float32Array([m[0],m[1],m[2], m[4],m[5],m[6], m[8],m[9],m[10]]);
  }
};
