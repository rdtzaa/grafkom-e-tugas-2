'use strict';

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

  // Trees — left side (denser, wilder like the reference park area)
  const trees = [];
  let seed = 7;
  const rng = () => { seed=(seed*1664525+1013904223)&0xffffffff; return (seed>>>0)/0xffffffff; };

  for (let i=0;i<18;i++) {
    const z = -i * 5.5 - 3;
    // Left trees (further from road, bigger/denser)
    trees.push(new Tree(gl, {
      x: -10 + (rng()-0.5)*3,
      y: 0,
      z: z + (rng()-0.5)*2,
      rotY:  rng()*Math.PI*2,
      scale: 1.1 + rng()*0.7,
      type:  rng()>0.4 ? 'round' : 'tall',
      trunkH: 2 + rng()*1.5,
      trunkR: 0.15 + rng()*0.1
    }));
    // Right trees (more formal, lining the sidewalk)
    if (i < 15) {
      trees.push(new Tree(gl, {
        x: 9.5 + (rng()-0.5)*1.5,
        y: 0,
        z: z + (rng()-0.5)*1,
        rotY:  rng()*Math.PI*2,
        scale: 0.9 + rng()*0.5,
        type:  rng()>0.3 ? 'round' : 'tall',
        trunkH: 2.5 + rng()*1,
        trunkR: 0.12 + rng()*0.08
      }));
    }
  }

  // Bushes scattered on left park side
  const bushes = [];
  for (let i=0;i<30;i++) {
    bushes.push(new Bush(gl, {
      x: -9 - rng()*20,
      y: 0,
      z: -rng()*110 + 10,
      scale: 0.5 + rng()*0.8,
      rotY: rng()*Math.PI*2
    }));
  }

  // Grass fields
  const grassLeft  = new GrassField(gl, { x0:-35,z0:-110,x1:-8, z1:15,  count:300, side:'left'  });
  const grassRight = new GrassField(gl, { x0:8,  z0:-110,x1:35, z1:15,  count:150, side:'right' });

  // Render loop
  function render() {
    gl.clearColor(0.52, 0.80, 0.92, 1.0);  // sky blue
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const view = camera.getViewMatrix();
    const proj = camera.getProjectionMatrix();
    gl.uniformMatrix4fv(loc.u_view,       false, view);
    gl.uniformMatrix4fv(loc.u_projection, false, proj);

    // Draw order: ground → road → sidewalk → trees → bushes → grass (transparent last)
    ground.render(gl, loc);
    road.render(gl, loc);
    sidewalk.render(gl, loc);
    for (const t of trees)  t.render(gl, loc);
    for (const b of bushes) b.render(gl, loc);
    grassLeft.render(gl, loc);
    grassRight.render(gl, loc);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});
