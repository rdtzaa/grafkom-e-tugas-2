// Returns { positions:[], texCoords:[], normals:[], indices:[] }
// Flat horizontal plane at height y, from (x0,z0) to (x1,z1)
// uScale/vScale: how many times texture repeats
export function makePlane(x0, z0, x1, z1, y, normalDir, uScale, vScale) {
  const ny = normalDir || 1;
  return {
    positions: [
      x0, y, z0,
      x1, y, z0,
      x1, y, z1,
      x0, y, z1
    ],
    texCoords: [
      0,      0,
      uScale, 0,
      uScale, vScale,
      0,      vScale
    ],
    normals: [0,ny,0, 0,ny,0, 0,ny,0, 0,ny,0],
    indices: [0,2,1, 0,3,2]
  };
}

// Vertical quad facing +X (right)
export function makeVertQuadX(x, y0, z0, y1, z1, uScale, vScale) {
  return {
    positions: [x,y0,z0, x,y0,z1, x,y1,z1, x,y1,z0],
    texCoords: [0,0, uScale,0, uScale,vScale, 0,vScale],
    normals: [1,0,0, 1,0,0, 1,0,0, 1,0,0],
    indices: [0,1,2, 0,2,3]
  };
}

// Vertical quad facing -X (left)
export function makeVertQuadNegX(x, y0, z0, y1, z1, uScale, vScale) {
  return {
    positions: [x,y0,z1, x,y0,z0, x,y1,z0, x,y1,z1],
    texCoords: [0,0, uScale,0, uScale,vScale, 0,vScale],
    normals: [-1,0,0, -1,0,0, -1,0,0, -1,0,0],
    indices: [0,1,2, 0,2,3]
  };
}

// Simple box — returns combined geometry for top + two long sides
export function makeBox(x0, y0, z0, x1, y1, z1) {
  const len = Math.abs(z1 - z0);
  const w   = Math.abs(x1 - x0);
  const h   = Math.abs(y1 - y0);

  const top  = makePlane(x0, z0, x1, z1, y1, 1, w*2, len*2);
  const sideR = makeVertQuadX(x1, y0, z0, y1, z1, len*4, h*4);
  const sideL = makeVertQuadNegX(x0, y0, z0, y1, z1, len*4, h*4);

  return mergeMeshData([top, sideR, sideL]);
}

// Tessellated plane with a parabolic hill profile along the x axis.
// y(x) = peakY * (1 - ((x-cx)/halfW)^2), peakY at center, 0 at both x edges.
export function makeHillPlane(x0, z0, x1, z1, peakY, uScale, vScale, xSegs, zSegs) {
  const positions=[], texCoords=[], normals=[], indices=[];
  const cx = (x0 + x1) / 2;
  const halfW = (x1 - x0) / 2;

  for (let zi=0; zi<=zSegs; zi++) {
    const z = z0 + (z1 - z0) * (zi / zSegs);
    for (let xi=0; xi<=xSegs; xi++) {
      const x = x0 + (x1 - x0) * (xi / xSegs);
      const t = halfW !== 0 ? (x - cx) / halfW : 0;
      const y = peakY * (1 - t * t);
      const dydx = halfW !== 0 ? peakY * (-2 * t / halfW) : 0;
      const len = Math.sqrt(dydx * dydx + 1);
      positions.push(x, y, z);
      texCoords.push((xi / xSegs) * uScale, (zi / zSegs) * vScale);
      normals.push(-dydx / len, 1 / len, 0);
    }
  }

  for (let zi=0; zi<zSegs; zi++) {
    for (let xi=0; xi<xSegs; xi++) {
      const a = zi * (xSegs + 1) + xi;
      indices.push(a, a + xSegs + 1, a + 1, a + 1, a + xSegs + 1, a + xSegs + 2);
    }
  }
  return { positions, texCoords, normals, indices };
}

export function mergeMeshData(meshes) {
  const positions=[], texCoords=[], normals=[], indices=[];
  let offset=0;
  for (const m of meshes) {
    positions.push(...m.positions);
    texCoords.push(...m.texCoords);
    normals.push(...m.normals);
    indices.push(...m.indices.map(i=>i+offset));
    offset += m.positions.length / 3;
  }
  return { positions, texCoords, normals, indices };
}
