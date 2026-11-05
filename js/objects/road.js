import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createBrickTexture, createConcreteTexture, createCurbTexture } from '../utils/texture.js';
import { makePlane, makeBox } from '../utils/geometry.js';

export class Road {
  constructor(gl) {
    this._gl = gl;

    this._brickTex    = createBrickTexture(gl);
    this._concreteTex = createConcreteTexture(gl);
    this._curbTex     = createCurbTexture(gl);

    const ZNEAR =  12;   // near end of road
    const ZFAR  = -110;  // far end into distance
    const LEN   = Math.abs(ZFAR - ZNEAR);
    const RWIDE = 10;    // road half-width = 5 (total 10)

    // --- Road surface (brick) ---
    // UV: 10 repeats across width, 60 repeats along length (fine brick pattern)
    this._roadMesh = uploadMesh(gl,
      makePlane(-RWIDE/2, ZFAR, RWIDE/2, ZNEAR, 0, 1, 10, 60)
    );

    // --- Center divider stripe ---
    this._stripeMesh = uploadMesh(gl,
      makePlane(-0.18, ZFAR, 0.18, ZNEAR, 0.01, 1, 1, LEN/2)
    );

    // --- Left curb box: x from -5.3 to -5, y 0 to 0.2 ---
    const curbGeo = makeBox(-5.3, 0, ZFAR, -5.0, 0.2, ZNEAR);
    this._curbLeftMesh = uploadMesh(gl, curbGeo);

    // --- Right curb box: x from 5 to 5.3 ---
    const curbGeoR = makeBox(5.0, 0, ZFAR, 5.3, 0.2, ZNEAR);
    this._curbRightMesh = uploadMesh(gl, curbGeoR);

    // Stripe color: dark reddish (center divider)
    this._stripeColor = [0.45, 0.28, 0.22, 1.0];
  }

  render(gl, loc) {
    const id = mat4.create();

    // Road surface
    drawMesh(gl, loc, this._roadMesh, id, this._brickTex);

    // Center stripe (dark reddish color, no texture)
    drawMesh(gl, loc, this._stripeMesh, id, null, this._stripeColor);

    // Curbs (yellow-black stripes texture)
    drawMesh(gl, loc, this._curbLeftMesh,  id, this._curbTex);
    drawMesh(gl, loc, this._curbRightMesh, id, this._curbTex);
  }
}
