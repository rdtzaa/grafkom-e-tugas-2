import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createGrassTexture, createDryGrassTexture } from '../utils/texture.js';
import { makePlane } from '../utils/geometry.js';

// Large ground planes on each side of the road (grass/dirt)
export class Ground {
  constructor(gl) {
    this._gl = gl;
    this._grassTex = createGrassTexture(gl);
    this._dryTex   = createDryGrassTexture(gl);

    // Left side: lush green park area
    this._leftMesh  = uploadMesh(gl, makePlane(-35, -110, -8, 15, 0, 1, 20, 50));
    // Right side: drier maintained grass
    this._rightMesh = uploadMesh(gl, makePlane(8, -110, 35, 15, 0, 1, 20, 50));
  }

  render(gl, loc) {
    const id = mat4.create();
    drawMesh(gl, loc, this._leftMesh,  id, this._grassTex);
    drawMesh(gl, loc, this._rightMesh, id, this._dryTex);
  }
}
