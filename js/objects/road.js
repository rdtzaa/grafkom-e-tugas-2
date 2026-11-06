import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createGrassTexture } from '../utils/texture.js';
import { createPavingTexture, createStripeTexture } from '../helper/helper_function.js';
import { makePlane, makeBox, makeHillPlane, mergeMeshData } from '../utils/geometry.js';
import { layout } from '../layout.js';

export class Road {
  constructor(gl) {
    this._gl = gl;

    this._brickTex = createPavingTexture(gl, { base: [104, 104, 101], variance: 0.16 });
    this._curbTex  = createStripeTexture(gl, { count: 1 });
    this._grassTex = createGrassTexture(gl);

    const ZNEAR =  12;
    const ZFAR  = -110;

    // --- Left road lane: x -8 to -2 ---
    this._leftLaneMesh  = uploadMesh(gl, makePlane(-8, ZFAR, -2.3, ZNEAR, 0.012, 1, 2.4, 51));

    // --- Right road lane: x 2 to 8 ---
    this._rightLaneMesh = uploadMesh(gl, makePlane( 2.3, ZFAR,  8, ZNEAR, 0.012, 1, 2.4, 51));

    // --- Center median (mount-shaped green park strip): x -2 to 2, peaks at 0.5 ---
    this._medianMesh = uploadMesh(gl, makeHillPlane(-2, ZFAR, 2, ZNEAR, 0.5, 4, 50, 8, 50));

    // One yellow/black pair per 1.6 metres, with U running along the road.
    const curb = (x0, x1, spans = [[ZFAR, ZNEAR]]) => {
      const geo = mergeMeshData(spans.map(([z0,z1]) => makeBox(x0, 0, z0, x1, 0.2, z1)));
      for (let i = 0; i < geo.texCoords.length; i += 2) {
        geo.texCoords[i] = (geo.positions[i / 2 * 3 + 2] - ZFAR) / 1.6;
        geo.texCoords[i + 1] = geo.positions[i / 2 * 3 + 1] / 0.2;
      }
      return uploadMesh(gl, geo);
    };
    this._curbLeftOuter = curb(-8.3, -8, [
      [ZFAR, layout.entranceZ - layout.entranceHalfWidth],
      [layout.entranceZ + layout.entranceHalfWidth, ZNEAR],
    ]);
    this._curbRightOuter = curb(8, 8.3);
    this._curbLeftInner = curb(-2.3, -2);
    this._curbRightInner = curb(2, 2.3);
    this._edges = [-2.55, 2.55, 7.85].map(x =>
      uploadMesh(gl, makePlane(x, ZFAR, x + 0.07, ZNEAR, 0.018, 1, 1, 1)));
    this._edges.push(uploadMesh(gl, mergeMeshData([
      makePlane(-7.85, ZFAR, -7.78, layout.entranceZ - layout.entranceHalfWidth, 0.018, 1, 1, 1),
      makePlane(-7.85, layout.entranceZ + layout.entranceHalfWidth, -7.78, ZNEAR, 0.018, 1, 1, 1),
    ])));
  }

  render(gl, loc) {
    const id = mat4.create();

    // Road lanes
    drawMesh(gl, loc, this._leftLaneMesh,  id, this._brickTex);
    drawMesh(gl, loc, this._rightLaneMesh, id, this._brickTex);

    // Center median grass
    drawMesh(gl, loc, this._medianMesh, id, this._grassTex);

    // Outer curbs
    drawMesh(gl, loc, this._curbLeftOuter,  id, this._curbTex);
    drawMesh(gl, loc, this._curbRightOuter, id, this._curbTex);

    // Inner curbs (median edges)
    drawMesh(gl, loc, this._curbLeftInner,  id, this._curbTex);
    drawMesh(gl, loc, this._curbRightInner, id, this._curbTex);
    for (const edge of this._edges) drawMesh(gl, loc, edge, id, null, [0.64, 0.58, 0.45, 1]);
  }
}
