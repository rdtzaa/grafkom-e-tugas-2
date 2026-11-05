import { mat4 } from '../utils/math.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { createBarkTexture, createLeavesTexture } from '../utils/texture.js';
import { mergeMeshData } from '../utils/geometry.js';

export class Tree {
  constructor(gl, params = {}) {
    this._gl = gl;
    const {
      x = 0, y = 0, z = 0,
      rotY        = 0,
      scale       = 1,
      type        = 'round',
      trunkH      = 2.5,
      trunkR      = 0.18,
      foliageType = 'green'
    } = params;

    this._model = mat4.multiply(
      mat4.fromTranslation(x, y, z),
      mat4.multiply(mat4.fromRotationY(rotY), mat4.fromScaling(scale, scale, scale))
    );

    this._barkTex   = createBarkTexture(gl);
    this._leavesTex = createLeavesTexture(gl, foliageType);

    this._trunkMesh   = this._buildTrunk(trunkR, trunkH);
    this._branchMesh  = this._buildBranches(trunkR, trunkH, type);
    this._foliageMesh = this._buildFoliage(type, trunkH);
  }

  // Sphere geometry centered at (cx,cy,cz) with XZ radius rx, Y radius ry
  _sphereGeo(cx, cy, cz, rx, ry) {
    const hS=8, vS=6;
    const pos=[], uv=[], norm=[], idx=[];
    for (let v=0; v<=vS; v++) {
      const phi=(v/vS)*Math.PI - Math.PI/2;
      const sy=cy+ry*Math.sin(phi), cr=rx*Math.cos(phi);
      for (let h=0; h<=hS; h++) {
        const theta=(h/hS)*Math.PI*2;
        const nx=Math.cos(theta), nz=Math.sin(theta);
        pos.push(cx+nx*cr, sy, cz+nz*cr);
        uv.push(h/hS, v/vS);
        norm.push(nx*Math.cos(phi), Math.sin(phi), nz*Math.cos(phi));
      }
    }
    for (let v=0; v<vS; v++) {
      for (let h=0; h<hS; h++) {
        const a=v*(hS+1)+h;
        idx.push(a, a+1, a+hS+2, a, a+hS+2, a+hS+1);
      }
    }
    return {positions:pos, texCoords:uv, normals:norm, indices:idx};
  }

  // Cylinder from (x0,y0,z0) to (x1,y1,z1) with radius r, tapered at tip
  _cylGeo(x0, y0, z0, x1, y1, z1, r) {
    const dx=x1-x0, dy=y1-y0, dz=z1-z0;
    const len=Math.sqrt(dx*dx+dy*dy+dz*dz);
    if (len < 0.001) return null;
    const ax=dx/len, ay=dy/len, az=dz/len;

    let rx, ry, rz;
    if (Math.abs(ay) < 0.9) {
      const s=Math.sqrt(az*az+ax*ax)||1;
      rx=-az/s; ry=0; rz=ax/s;
    } else {
      const s=Math.sqrt(az*az+ay*ay)||1;
      rx=0; ry=az/s; rz=-ay/s;
    }
    const fx=ay*rz-az*ry, fy=az*rx-ax*rz, fz=ax*ry-ay*rx;

    const segs=6;
    const pos=[], uv=[], norm=[], idx=[];
    for (let ring=0; ring<=1; ring++) {
      const px=x0+ring*dx, py=y0+ring*dy, pz=z0+ring*dz;
      const cr = r * (ring===0 ? 1.0 : 0.6);
      for (let s=0; s<=segs; s++) {
        const a=(s/segs)*Math.PI*2;
        const c=Math.cos(a), sn=Math.sin(a);
        const nx=c*rx+sn*fx, ny=c*ry+sn*fy, nz=c*rz+sn*fz;
        pos.push(px+nx*cr, py+ny*cr, pz+nz*cr);
        uv.push(s/segs, ring);
        norm.push(nx, ny, nz);
      }
    }
    for (let s=0; s<segs; s++) {
      const r0a=s, r0b=s+1, r1a=s+segs+1, r1b=s+segs+2;
      idx.push(r0a, r0b, r1a,  r0b, r1b, r1a);
    }
    return {positions:pos, texCoords:uv, normals:norm, indices:idx};
  }

  _buildTrunk(r, h) {
    const segs=8;
    const positions=[], texCoords=[], normals=[], indices=[];
    for (let i=0; i<=segs; i++) {
      const a=(i/segs)*Math.PI*2;
      const nx=Math.cos(a), nz=Math.sin(a);
      positions.push(nx*r*1.4, 0,  nz*r*1.4); texCoords.push(i/segs,0);   normals.push(nx,0,nz);
      positions.push(nx*r*0.7, h,  nz*r*0.7); texCoords.push(i/segs,h*2); normals.push(nx,0,nz);
    }
    for (let i=0; i<segs; i++) {
      const b=i*2;
      indices.push(b, b+1, b+3,  b, b+3, b+2);
    }
    return uploadMesh(this._gl, {positions, texCoords, normals, indices});
  }

  _buildBranches(trunkR, trunkH, type) {
    const isRound = type==='round';
    const num     = isRound ? 5 : 4;
    const startY  = trunkH * 0.72;
    const spread  = isRound ? 2.5 : 1.6;
    const endY    = trunkH + (isRound ? 1.3 : 2.1);
    const geos    = [];
    for (let i=0; i<num; i++) {
      const angle = (i/num)*Math.PI*2 + 0.4;
      const g = this._cylGeo(0, startY, 0, Math.cos(angle)*spread, endY, Math.sin(angle)*spread, trunkR*0.55);
      if (g) geos.push(g);
    }
    return geos.length > 0 ? uploadMesh(this._gl, mergeMeshData(geos)) : null;
  }

  _buildFoliage(type, trunkH) {
    const isRound = type==='round';
    const rx     = isRound ? 1.4 : 0.9;
    const ry     = isRound ? 1.2 : 1.9;
    const spread = isRound ? 2.5 : 1.6;
    const baseY  = trunkH + (isRound ? 1.5 : 2.2);
    const num    = isRound ? 5 : 4;
    const geos   = [];
    // Centre-top cluster
    geos.push(this._sphereGeo(0, baseY + ry*0.3, 0, rx, ry*0.9));
    // Outer clusters at branch tips
    for (let i=0; i<num; i++) {
      const angle = (i/num)*Math.PI*2 + 0.4;
      geos.push(this._sphereGeo(
        Math.cos(angle)*spread, baseY - ry*0.2, Math.sin(angle)*spread,
        rx*0.75, ry*0.7
      ));
    }
    return uploadMesh(this._gl, mergeMeshData(geos));
  }

  render(gl, loc) {
    drawMesh(gl, loc, this._trunkMesh,   this._model, this._barkTex);
    if (this._branchMesh) drawMesh(gl, loc, this._branchMesh, this._model, this._barkTex);
    drawMesh(gl, loc, this._foliageMesh, this._model, this._leavesTex);
  }
}
