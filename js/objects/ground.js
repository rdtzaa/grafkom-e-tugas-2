import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createGrassTexture } from '../utils/texture.js';
import { makeHillPlane, makePlane, mergeMeshData } from '../utils/geometry.js';
import { layout } from '../layout.js';

// Large ground planes on each side of the road (grass/dirt), mount-shaped
export class Ground {
  constructor(gl) {
    this._gl = gl;
    this._grassTex = createGrassTexture(gl);

    // Leave the drainage channel open: no grass plane underneath its water.
    const leftGeo = mergeMeshData([
      makeHillPlane(layout.fenceX, layout.far, layout.canalLeft, layout.entranceZ - layout.entranceHalfWidth, 0.35, 4, 39, 12, 40),
      makeHillPlane(layout.fenceX, layout.entranceZ + layout.entranceHalfWidth, layout.canalLeft, 15, 0.35, 4, 10, 12, 12),
    ]);
    for (let i = 1; i < leftGeo.positions.length; i += 3) leftGeo.positions[i] += 0.08;
    this._leftMesh = uploadMesh(gl, leftGeo);
    this._rightMesh = uploadMesh(gl, makeHillPlane(10.5, -110, 20, 15, 2.0, 20, 50, 20, 50));
    this._housingMesh = uploadMesh(gl, makePlane(-41, -115, layout.fenceX, 15, 0.08, 1, 12, 50));
    this._backgroundMesh = uploadMesh(gl, makePlane(20, -115, 45, 15, 0, 1, 12, 50));
  }

  render(gl, loc) {
    const id = mat4.create();
    drawMesh(gl, loc, this._leftMesh,  id, this._grassTex);
    drawMesh(gl, loc, this._rightMesh, id, this._grassTex);
    drawMesh(gl, loc, this._housingMesh, id, this._grassTex);
    drawMesh(gl, loc, this._backgroundMesh, id, this._grassTex);
  }
}
