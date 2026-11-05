import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createGrassTexture, createDryGrassTexture } from '../utils/texture.js';

// Wild grass patches — simple vertical quads scattered in an area
export class GrassField {
  constructor(gl, params = {}) {
    this._gl = gl;
    const { x0=-35, z0=-110, x1=-8, z1=15, count=200, side='left', heightFn=null } = params;

    this._tex = side==='left' ? createGrassTexture(gl) : createDryGrassTexture(gl);
    this._meshes = [];
    this._models  = [];

    // Seed for deterministic randomness
    let seed = 42 + (side==='left' ? 0 : 1);
    const rng = () => { seed=(seed*1664525+1013904223)&0xffffffff; return (seed>>>0)/0xffffffff; };

    for (let i=0;i<count;i++) {
      const gx = x0 + rng()*(x1-x0);
      const gz = z0 + rng()*(z1-z0);
      const gs = 0.3 + rng()*0.5;
      const gy = rng()*0.2;

      // Cross-shaped blade (two perpendicular quads) — looks full from any angle
      const h = gs * 2.5;
      const geo = {
        positions: [
          // Quad 1: in XY plane
          -gs, gy, 0,   gs, gy, 0,   gs, gy+h, 0,   -gs, gy+h, 0,
          // Quad 2: in ZY plane
           0, gy,-gs,    0, gy, gs,    0, gy+h, gs,    0, gy+h,-gs
        ],
        texCoords: [0,0, 1,0, 1,1, 0,1,  0,0, 1,0, 1,1, 0,1],
        normals:   [0,0,1, 0,0,1, 0,0,1, 0,0,1,  1,0,0, 1,0,0, 1,0,0, 1,0,0],
        indices:   [0,1,2, 0,2,3,  4,5,6, 4,6,7]
      };

      const hillY = heightFn ? heightFn(gx) : 0;
      this._meshes.push(uploadMesh(gl, geo));
      this._models.push(mat4.multiply(
        mat4.fromTranslation(gx, hillY, gz),
        mat4.fromRotationY(rng()*Math.PI)
      ));
    }
  }

  render(gl, loc) {
    gl.disable(gl.CULL_FACE);
    for (let i=0;i<this._meshes.length;i++) {
      drawMesh(gl, loc, this._meshes[i], this._models[i], this._tex);
    }
    gl.enable(gl.CULL_FACE);
  }
}
