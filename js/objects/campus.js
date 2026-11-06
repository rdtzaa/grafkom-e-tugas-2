// Bagian Raditya: perumahan dosen, perlengkapan jalan, lampu, dan mobil.
// Reuse geometry, texture, dan SceneNode dari helper bersama. Adapter UV
// memungkinkan helper WebGL2 dipakai renderer WebGL1 tanpa mengganti scene teman.
import { SceneNode, createBox, createCylinder, createNoiseTexture,
  createPavingTexture, createSpeedSignTexture, canvasToTexture, wrap } from '../helper/helper_function.js';
import { uploadMesh, drawMesh } from '../renderer.js';
import { makePlane } from '../utils/geometry.js';
import { layout } from '../layout.js';

function roofGeometry() {
  const positions = [], normals = [], texCoords = [], indices = [];
  // Gable roof: ridge parallel to local Z; front triangular gable faces the road.
  const a = [-4.7, 0, -4.1], b = [4.7, 0, -4.1], c = [0, 2.2, -4.1];
  const d = [-4.7, 0, 4.1], e = [4.7, 0, 4.1], f = [0, 2.2, 4.1];
  for (const points of [[a,d,f,c], [b,c,f,e], [d,e,f], [b,a,c]]) {
    const u = points[1].map((v,i) => v-points[0][i]);
    const v = points[2].map((v,i) => v-points[0][i]);
    const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const length = Math.hypot(...n), start = positions.length/3;
    points.forEach((p,i) => { positions.push(...p); normals.push(...n.map(v => v/length)); texCoords.push(...[[0,0],[4,0],[4,4],[0,4]][i]); });
    indices.push(start,start+1,start+2);
    if (points.length === 4) indices.push(start,start+2,start+3);
  }
  return { positions, normals, texCoords, indices };
}

function labelTexture(gl, title, subtitle = '') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#183f3d'; ctx.fillRect(0,0,512,256);
  ctx.strokeStyle = '#c9bb83'; ctx.lineWidth = 8; ctx.strokeRect(12,12,488,232);
  ctx.textAlign = 'center'; ctx.fillStyle = '#f8f3df';
  ctx.font = 'bold 38px sans-serif'; ctx.fillText(title,256,115);
  ctx.font = '24px sans-serif'; ctx.fillText(subtitle,256,167);
  return canvasToTexture(gl,canvas);
}

export class Campus {
  constructor(gl) {
    this.root = new SceneNode('Area jalan & perumahan dosen — Raditya');
    this._meshCache = new Map(); this._gl = gl;
    this._windows = []; this._bulbs = []; this._gates = []; this._wheels = [];
    this.lampPositions = [];
    this._wall = createNoiseTexture(gl, { base: [231,222,197], variance: 0.08 });
    this._roof = createPavingTexture(gl, { base: [153,72,44], gap: [90,44,31], variance: 0.12 });
    this._paving = createPavingTexture(gl, { base: [147,139,121], variance: 0.12 });
    for (let i=0; i<7; i++) this._house(i, -3-i*15);
    this._residentialAccess();
    for (let i=0; i<5; i++) for (const side of [-1,1]) this._lamp(side,-4-i*23);
    this._signs(); this._car();
    this.root.updateWorld();
    this._renderNodes = [];
    this.root.traverse(node => { if (node.mesh) this._renderNodes.push(node); });
  }

  _mesh(key, build) {
    if (!this._meshCache.has(key)) {
      const geo = build();
      this._meshCache.set(key, uploadMesh(this._gl, { ...geo, texCoords: geo.texCoords || geo.uvs }));
    }
    return this._meshCache.get(key);
  }

  _part(parent, name, position, scale, color, texture = null, rotation = [0,0,0], shape = 'box') {
    const mesh = shape === 'roof' ? this._mesh('roof',roofGeometry)
      : shape === 'pole' ? this._mesh('pole',() => createCylinder(1,1,1,12))
      : this._mesh('box',() => createBox());
    const node = new SceneNode(name, { position, scale, rotation, mesh,
      material: { color: [...color,1], texture, emissive: 0 } });
    parent.add(node); return node;
  }

  _house(index,z) {
    const house = new SceneNode('Rumah dosen '+(index+1), { position: [layout.houseX,0.1,z], rotation: [0,90,0] });
    this.root.add(house);
    const cream = [1,1,1], concrete = [0.58,0.57,0.51], wood = [0.25,0.14,0.08];
    this._part(house,'Pondasi',[0,0.22,0],[8.6,0.44,7.5],concrete);
    this._part(house,'Dinding',[0,1.95,0],[8,3.1,7],cream,this._wall);
    this._part(house,'Atap genteng',[0,3.5,0],[1,1,1],cream,this._roof,[0,0,0],'roof');
    this._part(house,'Lisplang',[0,3.48,3.95],[9.4,0.18,0.16],[0.87,0.79,0.64]);
    this._part(house,'Teras',[0,0.26,4.1],[8.4,0.25,1.5],concrete);
    this._part(house,'Anak tangga',[0,0.1,5],[2.8,0.2,0.7],concrete);
    for (const x of [-3.55,3.55]) this._part(house,'Tiang teras',[x,1.85,4.5],[0.2,3.1,0.2],[0.85,0.8,0.67]);
    this._part(house,'Kanopi teras',[0,3.3,4.15],[8.6,0.15,1.7],[0.34,0.22,0.14]);
    this._part(house,'Pintu kayu',[0,1.47,3.53],[1.15,2.25,0.1],wood);
    this._part(house,'Gagang pintu',[0.4,1.45,3.61],[0.06,0.22,0.06],[0.8,0.65,0.28]);
    for (const x of [-2.55,2.55]) {
      this._part(house,'Kusen jendela',[x,1.95,3.55],[1.8,1.65,0.14],wood);
      const window = this._part(house,'Kaca jendela',[x,1.95,3.64],[1.55,1.4,0.04],[0.23,0.43,0.46]);
      this._windows.push(window);
      this._part(house,'Pembagi jendela',[x,1.95,3.68],[0.065,1.5,0.06],wood);
      this._part(house,'Pembagi jendela horizontal',[x,1.95,3.68],[1.6,0.065,0.06],wood);
    }
    // Side windows remain visible from the overview camera.
    for (const x of [-4.04,4.04]) for (const wz of [-1.5,1.3]) {
      this._part(house,'Kusen samping',[x,2,wz],[0.12,1.5,1.5],wood);
      this._part(house,'Kaca samping',[x+(x>0?0.07:-0.07),2,wz],[0.025,1.25,1.25],[0.24,0.4,0.42]);
    }
    // Each home opens onto the internal street, with no separate campus crossing.
    this._part(house,'Nomor rumah',[0,2.9,3.62],[0.65,0.35,0.04],[1,1,1],labelTexture(this._gl,'A-'+String(index+1).padStart(2,'0')));
    this._part(house,'Jalur ke jalan lingkungan',[0,0.025,5.5],[2.8,0.04,3],[0.67,0.64,0.54]);
  }

  _surface(parent,name,geo,texture,color=[1,1,1]) {
    const node = new SceneNode(name, {mesh:this._mesh(name,()=>geo),
      material:{texture,color:[...color,1],emissive:0}});
    parent.add(node); return node;
  }

  _residentialAccess() {
    const {near,far,entranceZ:z,entranceHalfWidth:half,fenceX,canalLeft,canalRight,
      internalRoadLeft,internalRoadRight} = layout;
    const concrete=[0.57,0.59,0.54], metal=[0.19,0.28,0.25];
    const infrastructure = new SceneNode('Akses tunggal perumahan'); this.root.add(infrastructure);

    // An actual recessed drain runs continuously beneath the one bridge.
    const drain = new SceneNode('Saluran air sisi kiri'); infrastructure.add(drain);
    const canalCenter=(canalLeft+canalRight)/2, canalWidth=canalRight-canalLeft;
    this._part(drain,'Dasar saluran',[canalCenter,-1.22,(far+near)/2],[canalWidth,0.2,near-far],[0.3,0.34,0.29]);
    for (const x of [canalLeft+0.15,canalRight-0.15]) {
      this._part(drain,'Dinding beton saluran',[x,-0.5,(far+near)/2],[0.3,1.5,near-far],concrete);
      this._part(drain,'Bibir saluran',[x,0.25,(far+near)/2],[0.4,0.12,near-far],[0.66,0.67,0.6]);
    }
    const water = createNoiseTexture(this._gl,{base:[46,95,89],variance:0.12,speckles:1400});
    this._surface(drain,'Permukaan air',makePlane(canalLeft+0.3,far,canalRight-0.3,near,-0.82,1,2,45),water);

    this._surface(infrastructure,'Jalan lingkungan perumahan',
      makePlane(internalRoadLeft,-108,internalRoadRight,9,0.105,1,2.2,49),this._paving);
    for (const x of [internalRoadLeft,internalRoadRight])
      this._part(infrastructure,'Tepi jalan lingkungan',[x,0.12,-49.5],[0.13,0.1,117],[0.65,0.64,0.55]);

    const bridge = new SceneNode('Jembatan akses tunggal'); infrastructure.add(bridge);
    // Solid deck crosses water, green verge, and the matching sidewalk/curb opening.
    const bridgeLeft=internalRoadRight-0.3, bridgeRight=-8.35;
    this._part(bridge,'Struktur jembatan',[(bridgeLeft+bridgeRight)/2,-0.04,z],
      [bridgeRight-bridgeLeft,0.3,half*2],concrete);
    this._surface(bridge,'Paving jembatan',makePlane(bridgeLeft,z-half,bridgeRight,z+half,0.115,1,5.4,2.7),this._paving);
    // Ramp makes the connection flush with the campus lane at y=0.012.
    const ramp=makePlane(bridgeRight,z-half,-7.92,z+half,0.012,1,0.2,2.7);
    ramp.positions[1]=ramp.positions[10]=0.115;
    const slope=(0.115-0.012)/(-7.92-bridgeRight), length=Math.hypot(slope,1);
    ramp.normals=Array(4).fill([slope/length,1/length,0]).flat();
    this._surface(bridge,'Ramp ke jalan kampus',ramp,this._paving);
    for (const edge of [-1,1]) {
      const railZ=z+edge*(half-0.15);
      this._part(bridge,'Parapet jembatan',[canalCenter,0.38,railZ],[canalWidth+1.2,0.5,0.23],[0.75,0.74,0.64]);
      this._part(bridge,'Pegangan jembatan',[canalCenter,1.05,railZ],[canalWidth+1.4,0.09,0.09],metal);
      for (const x of [canalLeft-0.5,canalCenter,canalRight+0.5])
        this._part(bridge,'Tiang railing',[x,0.77,railZ],[0.08,0.55,0.08],metal);
    }

    const fence = new SceneNode('Pagar keliling perumahan'); infrastructure.add(fence);
    // Only one break in the perimeter, at the shared gate.
    for (const [z0,z1] of [[-109,z-half],[z+half,10]]) {
      this._part(fence,'Dinding pagar depan',[fenceX,0.42,(z0+z1)/2],[0.23,0.68,z1-z0],[0.7,0.7,0.61]);
      this._part(fence,'Palang pagar depan',[fenceX,1.3,(z0+z1)/2],[0.09,0.08,z1-z0],metal);
      for (let p=z0+0.5;p<z1;p+=1.1)
        this._part(fence,'Jeruji pagar kawasan',[fenceX,1.03,p],[0.07,0.6,0.055],metal);
    }
    this._part(fence,'Pagar belakang',[-39.5,0.8,-49.5],[0.25,1.45,119],[0.66,0.68,0.59]);
    for (const end of [-109,10])
      this._part(fence,'Pagar penutup kawasan',[(-39.5+fenceX)/2,0.8,end],[fenceX+39.5,1.45,0.25],[0.66,0.68,0.59]);

    const entrance = new SceneNode('Gerbang utama perumahan', {position:[fenceX,0.12,z],rotation:[0,90,0]});
    infrastructure.add(entrance);
    for (const x of [-half,half]) {
      this._part(entrance,'Pilar gerbang',[x,1.65,0],[0.5,3.3,0.65],[0.8,0.79,0.68]);
      this._part(entrance,'Kepala pilar',[x,3.37,0],[0.7,0.16,0.8],metal);
    }
    this._part(entrance,'Papan gerbang',[0,3.7,0],[7,0.8,0.22],[1,1,1],
      labelTexture(this._gl,'PERUMAHAN DOSEN','ITS  /  SATU PINTU'));
    const gate = new SceneNode('Engsel gerbang utama',{position:[-half+0.28,0,0]}); entrance.add(gate);
    const width=half*2-0.56;
    for (const y of [0.45,1.8]) this._part(gate,'Bingkai gerbang',[width/2,y,0],[width,0.12,0.13],metal);
    for (let x=0.05;x<width;x+=0.3)
      this._part(gate,'Jeruji gerbang utama',[x,1.12,0],[0.07,1.45,0.08],metal);
    this._gates.push(gate);

    const booth = new SceneNode('Pos satpam',{position:[-19.8,0.1,z-6]}); infrastructure.add(booth);
    this._part(booth,'Dinding pos',[0,1.15,0],[1.8,2.3,2.4],[1,1,1],this._wall);
    this._part(booth,'Atap pos',[0,2.4,0],[2.3,0.23,2.9],[0.38,0.23,0.14]);
    this._part(booth,'Jendela pos',[0.92,1.55,0],[0.035,0.8,1.5],[0.25,0.44,0.43]);
    this._part(booth,'Pintu pos',[0,1.02,1.22],[0.8,1.9,0.05],[0.25,0.2,0.12]);
    this._part(booth,'Papan pos',[0.95,2.13,0],[1.45,0.32,0.04],[1,1,1],labelTexture(this._gl,'SATPAM'),[0,90,0]);
  }

  _lamp(side,z) {
    const lamp = new SceneNode('Lampu jalan', { position:[side*9.3,0.05,z] }); this.root.add(lamp);
    const metal=[0.23,0.29,0.29];
    this._part(lamp,'Pondasi lampu',[0,0.18,0],[0.5,0.36,0.5],[0.62,0.63,0.57]);
    this._part(lamp,'Tiang',[0,0,0],[0.095,6.7,0.095],metal,null,[0,0,0],'pole');
    this._part(lamp,'Lengan',[-side*1.1,6.65,0],[2.2,0.1,0.1],metal);
    this._part(lamp,'Rumah lampu',[-side*2.15,6.6,0],[0.8,0.18,0.35],metal);
    const bulb=this._part(lamp,'LED',[-side*2.15,6.49,0],[0.68,0.035,0.29],[1,0.87,0.58]);
    this._bulbs.push(bulb);
    this.lampPositions.push(side*9.3-side*2.15,6.45,z);
  }

  _signs() {
    const speed=new SceneNode('Rambu batas kecepatan', {position:[-10,0,-21]}); this.root.add(speed);
    this._part(speed,'Tiang rambu',[0,0,0],[0.055,2.6,0.055],[0.54,0.57,0.55],null,[0,0,0],'pole');
    this._part(speed,'Rambu 30 km/jam',[0,2.65,0],[0.78,0.78,0.08],[1,1,1],createSpeedSignTexture(this._gl,'30'));
  }

  _car() {
    this.car = new SceneNode('Mobil kampus', {position:[-5.1,0.15,-25]}); this.root.add(this.car);
    const blue=[0.12,0.3,0.42], dark=[0.075,0.095,0.1];
    this._part(this.car,'Bodi',[0,0.65,0],[1.65,0.65,3.2],blue);
    this._part(this.car,'Kabin',[0,1.15,0.1],[1.45,0.65,1.7],blue);
    for (const z of [-0.77,0.97]) this._part(this.car,'Kaca depan belakang',[0,1.2,z],[1.24,0.42,0.025],[0.48,0.67,0.69]);
    for (const x of [-0.74,0.74]) this._part(this.car,'Kaca samping',[x,1.2,0.1],[0.025,0.4,1.4],[0.34,0.51,0.55]);
    for (const x of [-0.58,0.58]) {
      this._part(this.car,'Lampu depan',[x,0.72,-1.62],[0.36,0.16,0.04],[1,0.94,0.7]);
      this._part(this.car,'Lampu belakang',[x,0.72,1.62],[0.35,0.15,0.04],[0.8,0.12,0.07]);
    }
    for (const x of [-0.85,0.85]) for (const z of [-1.05,1.05]) {
      const wheel=new SceneNode('Poros roda',{position:[x,0.32,z]}); this.car.add(wheel);
      this._part(wheel,'Ban',[0,0,0],[0.32,0.18,0.32],dark,null,[0,0,90],'pole');
      this._part(wheel,'Velg',[x>0?0.02:-0.2,0,0],[0.17,0.19,0.17],[0.65,0.67,0.64],null,[0,0,90],'pole');
      this._wheels.push(wheel);
    }
  }

  update(time, dusk, gatesOpen, lampsOn = true) {
    this.car.position[2] = wrap(-22-time*3.2,-106,10);
    for (const wheel of this._wheels) wheel.rotation[0] = -time*573;
    for (const gate of this._gates) {
      gate.rotation[1] = gatesOpen * 90;
      gate.updateWorld(gate.parent.worldMatrix);
    }
    for (const window of this._windows) {
      window.material.color = [0.23+0.77*dusk,0.43+0.33*dusk,0.46-0.13*dusk,1];
      window.material.emissive = dusk*0.85;
    }
    for (const bulb of this._bulbs) bulb.material.emissive = lampsOn ? dusk : 0;
    // Buildings and fixtures are static; only animated subtrees need new matrices.
    this.car.updateWorld(this.root.worldMatrix);
  }

  render(gl,loc) {
    for (const node of this._renderNodes) {
      if (node.visible) drawMesh(gl,loc,node.mesh,node.worldMatrix,
        node.material.texture,node.material.color,node.material.emissive || 0);
    }
  }
}
