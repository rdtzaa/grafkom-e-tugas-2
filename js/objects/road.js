import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createBrickTexture, createConcreteTexture, createCurbTexture, createGrassTexture } from '../utils/texture.js';
import { makePlane, makeBox, makeHillPlane } from '../utils/geometry.js';

export class Road {
  constructor(gl) {
    this._gl = gl;

    this._brickTex = createBrickTexture(gl);
    this._curbTex  = createCurbTexture(gl);
    this._grassTex = createGrassTexture(gl);

    const ZNEAR =  12;
    const ZFAR  = -110;

    // --- Left road lane: x -8 to -2 ---
    this._leftLaneMesh  = uploadMesh(gl, makePlane(-8, ZFAR, -2, ZNEAR, 0, 1, 6, 60));

    // --- Right road lane: x 2 to 8 ---
    this._rightLaneMesh = uploadMesh(gl, makePlane( 2, ZFAR,  8, ZNEAR, 0, 1, 6, 60));

    // --- Center median (mount-shaped green park strip): x -2 to 2, peaks at 0.5 ---
    this._medianMesh = uploadMesh(gl, makeHillPlane(-2, ZFAR, 2, ZNEAR, 0.5, 4, 50, 8, 50));

    // --- Outer curbs ---
    this._curbLeftOuter  = uploadMesh(gl, makeBox(-8.3, 0, ZFAR, -8.0, 0.2, ZNEAR));
    this._curbRightOuter = uploadMesh(gl, makeBox( 8.0, 0, ZFAR,  8.3, 0.2, ZNEAR));

    // --- Inner curbs (median edges) ---
    this._curbLeftInner  = uploadMesh(gl, makeBox(-2.3, 0, ZFAR, -2.0, 0.2, ZNEAR));
    this._curbRightInner = uploadMesh(gl, makeBox( 2.0, 0, ZFAR,  2.3, 0.2, ZNEAR));
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
  }
}
