import { createRng } from '../helper/helper_function.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { mat4 } from '../utils/math.js';

export const blossomColors = [
  [0.96,0.46,0.65,1], [1,0.67,0.8,1], [1,0.82,0.88,1], [1,0.89,0.65,1],
];

const meshData = () => ({ positions:[], texCoords:[], normals:[], indices:[] });
const normalize = v => { const length=Math.hypot(...v); return v.map(x=>x/length); };

// Small curved petal, oriented along a surface tangent. Both sides are visible.
function petal(geo,center,u,v,normal,width,length) {
  const offset=geo.positions.length/3, segments=7;
  geo.positions.push(...center); geo.normals.push(...normal); geo.texCoords.push(0.5,0.5);
  for(let i=0;i<segments;i++) {
    const angle=i/segments*Math.PI*2, a=Math.cos(angle), b=Math.sin(angle);
    geo.positions.push(...center.map((p,k)=>p+u[k]*a*width+v[k]*b*length+normal[k]*width*0.15));
    geo.normals.push(...normal); geo.texCoords.push(a*0.5+0.5,b*0.5+0.5);
  }
  for(let i=0;i<segments;i++) {
    const a=offset+1+i, b=offset+1+(i+1)%segments;
    geo.indices.push(offset,a,b, offset,b,a);
  }
}

export function makeBlossoms(clusters,seed,fullBloom) {
  const rng=createRng(seed), batches=blossomColors.map(meshData);
  for(const cluster of clusters) {
    const {x,y,z,rx,ry}=cluster;
    for(let i=0;i<(fullBloom?27:12);i++) {
      const theta=rng()*Math.PI*2, ny=-0.35+rng()*1.35, ring=Math.sqrt(1-ny*ny);
      const nx=Math.cos(theta)*ring, nz=Math.sin(theta)*ring;
      const normal=normalize([nx/rx,ny/ry,nz/rx]);
      const u=Math.abs(normal[1])>0.98 ? [1,0,0] : normalize([normal[2],0,-normal[0]]);
      const v=[normal[1]*u[2]-normal[2]*u[1],normal[2]*u[0]-normal[0]*u[2],normal[0]*u[1]-normal[1]*u[0]];
      const center=[x+nx*rx,y+ny*ry,z+nz*rx].map((p,k)=>p+normal[k]*0.055);
      const radius=0.13+rng()*0.12, rotation=rng()*Math.PI*2;
      const geo=batches[Math.floor(rng()*3)];
      for(let p=0;p<5;p++) {
        const angle=rotation+p*Math.PI*2/5;
        const along=u.map((value,k)=>value*Math.cos(angle)+v[k]*Math.sin(angle));
        const across=u.map((value,k)=>-value*Math.sin(angle)+v[k]*Math.cos(angle));
        petal(geo,center.map((value,k)=>value+along[k]*radius*0.52),across,along,normal,radius*0.43,radius*0.57);
      }
      petal(batches[3],center.map((value,k)=>value+normal[k]*0.02),u,v,normal,radius*0.19,radius*0.19);
    }
  }
  return batches;
}

export class FallenPetals {
  constructor(gl,trees,surfaceHeight) {
    const rng=createRng(87), batches=blossomColors.slice(0,3).map(meshData);
    for(const tree of trees) {
      if(!['pink','green-pink'].includes(tree.foliageType)) continue;
      const [tx,,tz]=tree.position;
      for(let i=0;i<65;i++) {
        const angle=rng()*Math.PI*2, distance=(0.6+Math.sqrt(rng())*3.1)*tree.scale;
        const x=tx+Math.cos(angle)*distance, z=tz+Math.sin(angle)*distance;
        const height=surfaceHeight(x,z);
        if(height===null) continue;
        const yaw=rng()*Math.PI*2, size=0.045+rng()*0.065;
        petal(batches[i%3],[x,height+0.025,z],[Math.cos(yaw),0,Math.sin(yaw)],
          [Math.sin(yaw),0,-Math.cos(yaw)],[0,1,0],size,size*1.5);
      }
    }
    this._meshes=batches.map(geo=>uploadMesh(gl,geo));
    this._model=mat4.create();
  }

  render(gl,loc) {
    this._meshes.forEach((mesh,i)=>drawMesh(gl,loc,mesh,this._model,null,blossomColors[i]));
  }
}
