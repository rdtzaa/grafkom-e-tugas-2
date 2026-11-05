'use strict';

function _uploadCanvasTexture(gl, canvas) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

function _makeCanvas(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  return c;
}

function createBrickTexture(gl) {
  const c = _makeCanvas(512, 512, (ctx, w, h) => {
    const BW=64, BH=32;
    const mortar='#9a8878';
    const bricks=['#8B6355','#9A7060','#7A5245','#8C6450','#956655','#7F5040','#B07060'];

    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, w, h);

    for (let row=0; row<=h/BH; row++) {
      const offset = (row%2)*(BW/2);
      for (let col=-1; col<=w/BW+1; col++) {
        const x = col*BW + offset;
        const y = row*BH;
        ctx.fillStyle = bricks[Math.floor(Math.random()*bricks.length)];
        ctx.fillRect(x+2, y+2, BW-4, BH-4);
        // subtle surface variation
        ctx.globalAlpha = 0.08 + Math.random()*0.08;
        ctx.fillStyle = Math.random()>0.5 ? '#fff' : '#000';
        ctx.fillRect(x+2, y+2, BW-4, BH-4);
        ctx.globalAlpha = 1;
      }
    }
  });
  return _uploadCanvasTexture(gl, c);
}

function createConcreteTexture(gl) {
  const c = _makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c4bdb0';
    ctx.fillRect(0, 0, w, h);
    // noise
    for (let i=0;i<3000;i++) {
      const v = 150 + Math.floor(Math.random()*50-25);
      ctx.fillStyle = `rgb(${v+8},${v},${v-8})`;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(Math.random()*w, Math.random()*h, Math.random()*3+1, Math.random()*3+1);
    }
    ctx.globalAlpha = 1;
    // tile seams
    ctx.strokeStyle = '#a0988a';
    ctx.lineWidth = 1.5;
    for (let x=0;x<w;x+=64) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y=0;y<h;y+=64) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  });
  return _uploadCanvasTexture(gl, c);
}

function createGrassTexture(gl) {
  const c = _makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6b8c3a';
    ctx.fillRect(0, 0, w, h);
    for (let i=0;i<800;i++) {
      const x=Math.random()*w, y=Math.random()*h;
      const len=Math.random()*18+5;
      const hue=80+Math.random()*30;
      const lit=25+Math.random()*25;
      ctx.strokeStyle = `hsl(${hue},45%,${lit}%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.lineTo(x+(Math.random()-0.5)*6, y-len);
      ctx.stroke();
    }
  });
  return _uploadCanvasTexture(gl, c);
}

function createDryGrassTexture(gl) {
  const c = _makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a09050';
    ctx.fillRect(0, 0, w, h);
    for (let i=0;i<600;i++) {
      const x=Math.random()*w, y=Math.random()*h;
      const len=Math.random()*15+5;
      ctx.strokeStyle = `hsl(${50+Math.random()*30},${35+Math.random()*20}%,${35+Math.random()*20}%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.lineTo(x+(Math.random()-0.5)*5, y-len);
      ctx.stroke();
    }
  });
  return _uploadCanvasTexture(gl, c);
}

function createCurbTexture(gl) {
  const c = _makeCanvas(256, 64, (ctx, w, h) => {
    // yellow base
    ctx.fillStyle = '#E8C800';
    ctx.fillRect(0, 0, w, h);
    // black diagonal stripes
    const sw = 28;
    ctx.fillStyle = '#1a1a1a';
    for (let x=-h; x<w+h; x+=sw*2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x+sw, 0);
      ctx.lineTo(x+sw+h, h);
      ctx.lineTo(x+h, h);
      ctx.fill();
    }
  });
  return _uploadCanvasTexture(gl, c);
}

function createBarkTexture(gl) {
  const c = _makeCanvas(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6b4e30';
    ctx.fillRect(0,0,w,h);
    for (let i=0;i<200;i++) {
      const y=Math.random()*h, len=Math.random()*30+10;
      ctx.strokeStyle=`hsl(25,${25+Math.random()*20}%,${20+Math.random()*20}%)`;
      ctx.lineWidth=Math.random()*2+1;
      ctx.beginPath();
      ctx.moveTo(Math.random()*w, y);
      ctx.lineTo(Math.random()*w, y+len);
      ctx.stroke();
    }
  });
  return _uploadCanvasTexture(gl, c);
}

function createLeavesTexture(gl) {
  const c = _makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2d6e2d';
    ctx.fillRect(0,0,w,h);
    for (let i=0;i<300;i++) {
      const x=Math.random()*w, y=Math.random()*h;
      const r=Math.random()*12+4;
      ctx.fillStyle=`hsl(${100+Math.random()*40},${45+Math.random()*25}%,${22+Math.random()*22}%)`;
      ctx.beginPath();
      ctx.ellipse(x,y,r,r*0.6,Math.random()*Math.PI,0,Math.PI*2);
      ctx.fill();
    }
  });
  return _uploadCanvasTexture(gl, c);
}

function createSolidColorTexture(gl, r, g, b, a=255) {
  const c = _makeCanvas(2, 2, (ctx) => {
    ctx.fillStyle = `rgba(${r},${g},${b},${a/255})`;
    ctx.fillRect(0,0,2,2);
  });
  return _uploadCanvasTexture(gl, c);
}
