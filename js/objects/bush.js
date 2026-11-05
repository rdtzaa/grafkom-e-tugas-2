import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createLeavesTexture } from '../utils/texture.js';

export class Bush {
  constructor(gl, params = {}) {
    this._gl = gl;
    const { x=0, y=0, z=0, scale=1, rotY=0 } = params;

    this._model = mat4.multiply(
      mat4.fromTranslation(x, y, z),
      mat4.multiply(mat4.fromRotationY(rotY), mat4.fromScaling(scale, scale*0.75, scale))
    );

    this._tex = createLeavesTexture(gl);
    this._mesh = this._buildMesh();
  }

  _buildMesh() {
    // Sphere bush — center placed at cy=r so the bottom just touches y=0
    const positions=[], texCoords=[], normals=[], indices=[];
    const hSegs=12, vSegs=8;
    const r=0.9, cy=r+0.05;  // ensure bottom stays above ground after y-scaling

    for (let v=0;v<=vSegs;v++) {
      const phi=(v/vSegs)*Math.PI - Math.PI/2;
      const y=cy+r*Math.sin(phi), cr=r*Math.cos(phi);
      for (let h=0;h<=hSegs;h++) {
        const theta=(h/hSegs)*Math.PI*2;
        const nx=Math.cos(theta), nz=Math.sin(theta);
        positions.push(nx*cr, y, nz*cr);
        texCoords.push(h/hSegs, v/vSegs);
        normals.push(nx*Math.cos(phi), Math.sin(phi), nz*Math.cos(phi));
      }
    }
    for (let v=0;v<vSegs;v++) {
      for (let h=0;h<hSegs;h++) {
        const a=v*(hSegs+1)+h;
        indices.push(a, a+1, a+hSegs+2, a, a+hSegs+2, a+hSegs+1);
      }
    }
    return uploadMesh(this._gl, {positions,texCoords,normals,indices});
  }

  render(gl, loc) {
    drawMesh(gl, loc, this._mesh, this._model, this._tex);
  }
}
