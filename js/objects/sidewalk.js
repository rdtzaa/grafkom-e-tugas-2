import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createConcreteTexture } from '../utils/texture.js';
import { makePlane, mergeMeshData } from '../utils/geometry.js';
import { layout } from '../layout.js';

export class Sidewalk {
  constructor(gl) {
    this._gl = gl;
    this._tex = createConcreteTexture(gl);

    // Left sidewalk: x from -10.5 to -8.3, slightly elevated at y=0.05
    // The only vehicle crossing through the sidewalk lines up with the bridge.
    this._leftMesh = uploadMesh(gl, mergeMeshData([
      makePlane(-10.5, layout.far, -8.3, layout.entranceZ - layout.entranceHalfWidth, 0.05, 1, 10, 39),
      makePlane(-10.5, layout.entranceZ + layout.entranceHalfWidth, -8.3, layout.near, 0.05, 1, 10, 9),
    ]));
    // Right sidewalk: x from 8.3 to 10.5
    this._rightMesh = uploadMesh(gl, makePlane(8.3, -110, 10.5, 12, 0.05, 1, 10, 50));
  }

  render(gl, loc) {
    const id = mat4.create();
    drawMesh(gl, loc, this._leftMesh,  id, this._tex);
    drawMesh(gl, loc, this._rightMesh, id, this._tex);
  }
}
