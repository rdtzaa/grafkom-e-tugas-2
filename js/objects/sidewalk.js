import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createConcreteTexture } from '../utils/texture.js';
import { makePlane } from '../utils/geometry.js';

export class Sidewalk {
  constructor(gl) {
    this._gl = gl;
    this._tex = createConcreteTexture(gl);

    // Left sidewalk: x from -8 to -5.3, slightly elevated at y=0.05
    this._leftMesh  = uploadMesh(gl, makePlane(-8, -110, -5.3, 12, 0.05, 1, 10, 50));
    // Right sidewalk: x from 5.3 to 8
    this._rightMesh = uploadMesh(gl, makePlane(5.3, -110, 8, 12, 0.05, 1, 10, 50));
  }

  render(gl, loc) {
    const id = mat4.create();
    drawMesh(gl, loc, this._leftMesh,  id, this._tex);
    drawMesh(gl, loc, this._rightMesh, id, this._tex);
  }
}
