import { initGL, createProgram, getLocations } from './renderer.js';
import { VERT_SRC, FRAG_SRC } from './shaders.js';
import { Camera } from './camera.js';
import { Ground } from './objects/ground.js';
import { Road } from './objects/road.js';
import { Sidewalk } from './objects/sidewalk.js';
import { Tree } from './objects/tree.js';
import { Bush } from './objects/bush.js';
import { Campus } from './objects/campus.js';
import { layout, isEntrance, leftParkHeight } from './layout.js';
import { FallenPetals } from './objects/blossoms.js';

window.addEventListener('load', () => {
  const canvas = document.getElementById('webgl-canvas');

  // Size canvas to its CSS size
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    if (camera) {
      camera.aspect = canvas.width / canvas.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }

  const gl = initGL(canvas);
  if (!gl) {
    document.getElementById('scene-status').textContent = 'WebGL tidak tersedia di browser ini.';
    return;
  }

  // Compile shaders
  const program = createProgram(gl, VERT_SRC, FRAG_SRC);
  if (!program) {
    document.getElementById('scene-status').textContent = 'Shader gagal dimuat. Lihat console browser.';
    return;
  }
  gl.useProgram(program);

  const loc = getLocations(gl, program);

  // Set scene-wide uniforms (sun from upper-right, slightly forward)
  gl.uniform3f(loc.u_lightDir,   -0.4, -0.8, -0.3);
  gl.uniform3f(loc.u_lightColor,  1.0,  0.95,  0.85);
  gl.uniform1f(loc.u_ambient,     0.42);
  gl.uniform1i(loc.u_texture,     0);

  // Camera
  const camera = new Camera(canvas);
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Build scene objects
  const ground   = new Ground(gl);
  const road     = new Road(gl);
  const sidewalk = new Sidewalk(gl);
  const campus = new Campus(gl);
  gl.uniform3fv(loc.u_lampPositions, new Float32Array(campus.lampPositions));

  const timeSlider = document.getElementById('time-of-day');
  const timeLabel = document.getElementById('time-label');
  const animate = document.getElementById('animate');
  const lights = document.getElementById('street-lights');
  const gateButton = document.getElementById('toggle-gates');
  let gateTarget = 0, gateAmount = 0, sceneTime = 0, previousTime = 0;
  let dusk = Number(timeSlider.value) / 100;
  document.getElementById('camera-view').addEventListener('change', e => camera.setPreset(e.target.value));
  document.getElementById('reset-view').addEventListener('click', () => camera.setPreset(document.getElementById('camera-view').value));
  gateButton.addEventListener('click', () => {
    gateTarget = gateTarget ? 0 : 1;
    gateButton.textContent = gateTarget ? 'Tutup gerbang utama' : 'Buka gerbang utama';
    gateButton.setAttribute('aria-pressed', String(Boolean(gateTarget)));
  });
  document.getElementById('scene-status').textContent = 'WebGL aktif · geser untuk mengorbit';

  // Hill height helpers — must match geometry in Ground and Road
  const _hill = (x, cx, hw, peak) => Math.max(0, peak * (1 - ((x - cx) / hw) ** 2));
  const medianH    = x => _hill(x, 0, 2, 0.5);
  const leftParkH = leftParkHeight;
  const rightParkH = x => _hill(x, (10.5 + 20) / 2, (20 - 10.5) / 2, 2.0);

  const trees = [];
  let seed = 7;
  const rng = () => { seed=(seed*1664525+1013904223)&0xffffffff; return (seed>>>0)/0xffffffff; };

  for (let i=0;i<18;i++) {
    const z = -i * 5.5 - 3;
    // Left outer trees — y follows the hill surface
    const lx = (layout.fenceX + layout.canalLeft) / 2 + (rng()-0.5)*1.5;
    const lftv = rng();
    const leftTreeParams = {
      x: lx,
      y: leftParkH(lx),
      z: z + (rng()-0.5)*2,
      rotY:  rng()*Math.PI*2,
      scale: 1.1 + rng()*0.7,
      type:  rng()>0.4 ? 'round' : 'tall',
      trunkH: 2 + rng()*1.5,
      trunkR: 0.15 + rng()*0.1,
      foliageType: i%3===0 ? 'pink' : lftv < 0.5 ? 'green' : 'green-pink'
    };
    // Clear the shared bridge and gate, including the canopy overhang.
    if (!isEntrance(leftTreeParams.z, 3)) trees.push(new Tree(gl, leftTreeParams));
    // Right outer trees — y follows the hill surface
    if (i < 15) {
      const rx = 15 + (rng()-0.5)*1.5;
      const rftv = rng();
      trees.push(new Tree(gl, {
        x: rx,
        y: rightParkH(rx),
        z: z + (rng()-0.5)*1,
        rotY:  rng()*Math.PI*2,
        scale: 0.9 + rng()*0.5,
        type:  rng()>0.3 ? 'round' : 'tall',
        trunkH: 2.5 + rng()*1,
        trunkR: 0.12 + rng()*0.08,
        foliageType: i%3===0 ? 'pink' : rftv < 0.45 ? 'green' : 'green-pink'
      }));
    }
  }

  // Median trees — y follows the median hill
  for (let i=0;i<10;i++) {
    const z = -i * 10 - 5;
    const mx = (rng()-0.5)*2.5;
    const mftv = rng();
    trees.push(new Tree(gl, {
      x: mx,
      y: medianH(mx),
      z: z + (rng()-0.5)*3,
      rotY:  rng()*Math.PI*2,
      scale: 0.7 + rng()*0.5,
      type:  rng()>0.3 ? 'round' : 'tall',
      trunkH: 1.5 + rng()*1,
      trunkR: 0.1 + rng()*0.06,
      foliageType: i%3!==2 ? 'pink' : mftv < 0.6 ? 'green' : 'green-white'
    }));
  }

  // Bushes — outer left side
  const bushes = [];
  for (let i=0;i<25;i++) {
    const bx = layout.fenceX + 0.7 + rng()*(layout.canalLeft-layout.fenceX-1.4);
    const bushParams = {
      x: bx,
      y: leftParkH(bx),
      z: -rng()*110 + 10,
      scale: 0.5 + rng()*0.8,
      rotY: rng()*Math.PI*2
    };
    if (!isEntrance(bushParams.z, 1.3)) bushes.push(new Bush(gl, bushParams));
  }
  // Bushes — center median strip
  for (let i=0;i<15;i++) {
    const mbx = (rng()-0.5)*2.8;
    bushes.push(new Bush(gl, {
      x: mbx,
      y: medianH(mbx),
      z: -rng()*110 + 10,
      scale: 0.3 + rng()*0.4,
      rotY: rng()*Math.PI*2
    }));
  }
  for (let i=0;i<25;i++) {
    const bx = 10 + rng()*10;
    bushes.push(new Bush(gl, {
      x: bx,
      y: rightParkH(bx),
      z: -rng()*110 + 10,
      scale: 0.5 + rng()*0.8,
      rotY: rng()*Math.PI*2
    }));
  }

  const petals = new FallenPetals(gl,trees,(x,z)=> {
    if(z<layout.far || z>layout.near) return null;
    if(x>=-2 && x<=2) return medianH(x);
    if(x>=layout.fenceX && x<=layout.canalLeft && !isEntrance(z,0.5)) return leftParkH(x);
    if(x>=10.5 && x<=20) return rightParkH(x);
    if((x>=8.3 && x<=10.5) || (x>=-10.5 && x<=-8.3 && !isEntrance(z,0.5))) return 0.05;
    if((x>=2.3 && x<=8) || (x>=-8 && x<=-2.3)) return 0.012;
    return null;
  });

  // Render loop
  function render(timestamp) {
    const dt = previousTime ? Math.min((timestamp - previousTime) / 1000, 0.1) : 0;
    previousTime = timestamp;
    if (animate.checked) sceneTime += dt;
    const targetDusk = Number(timeSlider.value) / 100;
    dusk += (targetDusk - dusk) * Math.min(1, dt * 5);
    if (animate.checked) gateAmount += (gateTarget - gateAmount) * Math.min(1, dt * 3);
    timeLabel.textContent = targetDusk < 0.35 ? 'Siang' : targetDusk < 0.75 ? 'Sore' : 'Senja';
    const sky = [0.55-0.46*dusk, 0.76-0.65*dusk, 0.86-0.65*dusk];
    gl.clearColor(...sky, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform3fv(loc.u_fogColor, sky);
    gl.uniform3fv(loc.u_eye, camera.eye);
    gl.uniform3f(loc.u_lightDir, -0.45, -0.85 + 0.64*dusk, -0.3);
    gl.uniform3f(loc.u_lightColor, 0.68-0.45*dusk, 0.65-0.47*dusk, 0.56-0.36*dusk);
    gl.uniform1f(loc.u_ambient, 0.4-0.25*dusk);
    gl.uniform1f(loc.u_lampStrength, lights.checked ? 3.8*dusk : 0);
    campus.update(sceneTime, dusk, gateAmount, lights.checked);

    const view = camera.getViewMatrix();
    const proj = camera.getProjectionMatrix();
    gl.uniformMatrix4fv(loc.u_view,       false, view);
    gl.uniformMatrix4fv(loc.u_projection, false, proj);

    ground.render(gl, loc);
    road.render(gl, loc);
    sidewalk.render(gl, loc);
    for (const t of trees)  t.render(gl, loc);
    for (const b of bushes) b.render(gl, loc);
    campus.render(gl,loc);
    petals.render(gl,loc);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});
