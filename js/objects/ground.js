import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createGrassTexture, createDryGrassTexture } from '../utils/texture.js';
import { makeHillPlane } from '../utils/geometry.js';

// Large ground planes on each side of the road (grass/dirt), mount-shaped
export class Ground {
  constructor(gl) {
    this._gl = gl;
    this._grassTex = createGrassTexture(gl);
    this._dryTex   = createDryGrassTexture(gl);

    // Left side: lush green hill — x -35 to -10.5, peak 4.0 at center
    this._leftMesh  = uploadMesh(gl, makeHillPlane(-35, -110, -10.5, 15, 4.0, 20, 50, 20, 50));
    // Right side: drier maintained hill — x 10.5 to 35, peak 4.0 at center
    this._rightMesh = uploadMesh(gl, makeHillPlane(10.5, -110, 35, 15, 4.0, 20, 50, 20, 50));
  }

  render(gl, loc) {
    const id = mat4.create();
    drawMesh(gl, loc, this._leftMesh,  id, this._grassTex);
    drawMesh(gl, loc, this._rightMesh, id, this._dryTex);
  }
}
