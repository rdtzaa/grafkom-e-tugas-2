import { initGL, createProgram, getLocations } from './renderer.js';
import { VERT_SRC, FRAG_SRC } from './shaders.js';
import { Camera } from './camera.js';
import { Ground } from './objects/ground.js';
import { Road } from './objects/road.js';
import { Sidewalk } from './objects/sidewalk.js';
import { Tree } from './objects/tree.js';
import { Bush } from './objects/bush.js';

window.addEventListener('load', () => {
  const canvas = document.getElementById('webgl-canvas');

  // Size canvas to its CSS size
  function resize() {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    if (camera) {
      camera.aspect = canvas.width / canvas.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }

  const gl = initGL(canvas);
  if (!gl) return;

  // Compile shaders
  const program = createProgram(gl, VERT_SRC, FRAG_SRC);
  if (!program) return;
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
  resize();

  // Build scene objects
  const ground   = new Ground(gl);
  const road     = new Road(gl);
  const sidewalk = new Sidewalk(gl);

  // Hill height helpers — must match geometry in Ground and Road
  const _hill = (x, cx, hw, peak) => Math.max(0, peak * (1 - ((x - cx) / hw) ** 2));
  const medianH    = x => _hill(x, 0, 2, 0.5);
  const leftParkH  = x => _hill(x, (-35 + -10.5) / 2, (-10.5 - (-35)) / 2, 4.0);
  const rightParkH = x => _hill(x, (10.5 + 35) / 2,   (35 - 10.5) / 2,     4.0);

  const trees = [];
  let seed = 7;
  const rng = () => { seed=(seed*1664525+1013904223)&0xffffffff; return (seed>>>0)/0xffffffff; };

  for (let i=0;i<18;i++) {
    const z = -i * 5.5 - 3;
    // Left outer trees — y follows the hill surface
    const lx = -13 + (rng()-0.5)*3;
    const lftv = rng();
    trees.push(new Tree(gl, {
      x: lx,
      y: leftParkH(lx),
      z: z + (rng()-0.5)*2,
      rotY:  rng()*Math.PI*2,
      scale: 1.1 + rng()*0.7,
      type:  rng()>0.4 ? 'round' : 'tall',
      trunkH: 2 + rng()*1.5,
      trunkR: 0.15 + rng()*0.1,
      foliageType: lftv < 0.4 ? 'green' : lftv < 0.7 ? 'green-white' : 'green-pink'
    }));
    // Right outer trees — y follows the hill surface
    if (i < 15) {
      const rx = 13 + (rng()-0.5)*1.5;
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
        foliageType: rftv < 0.4 ? 'green' : rftv < 0.7 ? 'green-white' : 'green-pink'
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
      foliageType: mftv < 0.6 ? 'green' : 'green-white'
    }));
  }

  // Bushes — outer left side
  const bushes = [];
  for (let i=0;i<25;i++) {
    const bx = -11 - rng()*20;
    bushes.push(new Bush(gl, {
      x: bx,
      y: leftParkH(bx),
      z: -rng()*110 + 10,
      scale: 0.5 + rng()*0.8,
      rotY: rng()*Math.PI*2
    }));
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

  // Render loop
  function render() {
    gl.clearColor(0.52, 0.80, 0.92, 1.0);  // sky blue
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const view = camera.getViewMatrix();
    const proj = camera.getProjectionMatrix();
    gl.uniformMatrix4fv(loc.u_view,       false, view);
    gl.uniformMatrix4fv(loc.u_projection, false, proj);

    ground.render(gl, loc);
    road.render(gl, loc);
    sidewalk.render(gl, loc);
    for (const t of trees)  t.render(gl, loc);
    for (const b of bushes) b.render(gl, loc);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});
