import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createBarkTexture, createLeavesTexture } from '../utils/texture.js';

// Hierarchical tree: trunk (cylinder-approx) + foliage (sphere-approx using stacked rings)
export class Tree {
  constructor(gl, params = {}) {
    this._gl = gl;
    const {
      x = 0, y = 0, z = 0,
      rotY   = 0,
      scale  = 1,
      type   = 'round',   // 'round' | 'tall'
      trunkH = 2.5,
      trunkR = 0.18
    } = params;

    this._model = mat4.multiply(
      mat4.fromTranslation(x, y, z),
      mat4.multiply(mat4.fromRotationY(rotY), mat4.fromScaling(scale, scale, scale))
    );

    this._barkTex   = createBarkTexture(gl);
    this._leavesTex = createLeavesTexture(gl);

    this._trunkMesh   = this._buildTrunk(trunkR, trunkH);
    this._foliageMesh = this._buildFoliage(type, trunkH);
  }

  _buildTrunk(r, h) {
    const segs = 8;
    const positions=[], texCoords=[], normals=[], indices=[];
    for (let i=0; i<=segs; i++) {
      const a = (i/segs)*Math.PI*2;
      const nx=Math.cos(a), nz=Math.sin(a);
      // bottom
      positions.push(nx*r, 0, nz*r);
      texCoords.push(i/segs, 0);
      normals.push(nx, 0, nz);
      // top
      positions.push(nx*r, h, nz*r);
      texCoords.push(i/segs, h*2);
      normals.push(nx, 0, nz);
    }
    for (let i=0; i<segs; i++) {
      const b=i*2;
      indices.push(b,b+1,b+3, b,b+3,b+2);
    }
    return uploadMesh(this._gl, {positions,texCoords,normals,indices});
  }

  _buildFoliage(type, trunkH) {
    // Approximate sphere/ellipsoid with stacked circles
    const positions=[], texCoords=[], normals=[], indices=[];
    const hSegs=8, vSegs=6;
    const rx = type==='tall' ? 1.6 : 2.2;
    const ry = type==='tall' ? 3.0 : 1.8;
    const cy = trunkH + ry * 0.6; // center of foliage

    for (let v=0; v<=vSegs; v++) {
      const phi = (v/vSegs)*Math.PI - Math.PI/2;
      const y   = cy + ry*Math.sin(phi);
      const cr  = rx*Math.cos(phi);
      for (let h=0; h<=hSegs; h++) {
        const theta = (h/hSegs)*Math.PI*2;
        const nx=Math.cos(theta), nz=Math.sin(theta);
        positions.push(nx*cr, y, nz*cr);
        texCoords.push(h/hSegs, v/vSegs);
        normals.push(nx*Math.cos(phi), Math.sin(phi), nz*Math.cos(phi));
      }
    }
    for (let v=0; v<vSegs; v++) {
      for (let h=0; h<hSegs; h++) {
        const a=v*(hSegs+1)+h;
        indices.push(a, a+1, a+hSegs+2, a, a+hSegs+2, a+hSegs+1);
      }
    }
    return uploadMesh(this._gl, {positions,texCoords,normals,indices});
  }

  render(gl, loc) {
    drawMesh(gl, loc, this._trunkMesh,   this._model, this._barkTex);
    drawMesh(gl, loc, this._foliageMesh, this._model, this._leavesTex);
  }
}
