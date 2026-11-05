'use strict';

class Camera {
  constructor(canvas) {
    // Start at "walking down the road" viewpoint
    this._center = [0, 1.0, -40];
    this._theta  = Math.PI;   // azimuth: looking in -Z direction
    this._phi    = -0.05;     // very slight downward tilt
    this._radius = 50;        // distance from center

    this.up   = [0, 1, 0];
    this.fov  = 55 * Math.PI / 180;
    this.near = 0.1;
    this.far  = 600;
    this.aspect = canvas.width / canvas.height;

    this.eye = [0, 0, 0];
    this._updateEye();
    this._bindEvents(canvas);
  }

  _updateEye() {
    const { _center:c, _theta:t, _phi:p, _radius:r } = this;
    this.eye = [
      c[0] + r * Math.sin(t) * Math.cos(p),
      c[1] + r * Math.sin(p),
      c[2] + r * Math.cos(t) * Math.cos(p)
    ];
  }

  _bindEvents(canvas) {
    let dragging=false, lx=0, ly=0;

    canvas.addEventListener('mousedown', e => { dragging=true; lx=e.clientX; ly=e.clientY; });
    window.addEventListener('mouseup',   ()=> { dragging=false; });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      this._theta -= (e.clientX-lx)*0.004;
      this._phi    = Math.max(-1.4, Math.min(1.4, this._phi-(e.clientY-ly)*0.004));
      lx=e.clientX; ly=e.clientY;
      this._updateEye();
    });

    canvas.addEventListener('wheel', e => {
      this._radius = Math.max(3, Math.min(200, this._radius + e.deltaY*0.08));
      this._updateEye();
      e.preventDefault();
    }, { passive:false });

    // Touch support
    let touches=[], lastDist=0;
    canvas.addEventListener('touchstart', e => { touches=[...e.touches]; e.preventDefault(); }, {passive:false});
    canvas.addEventListener('touchmove', e => {
      if (e.touches.length===1) {
        const dx=e.touches[0].clientX-touches[0].clientX;
        const dy=e.touches[0].clientY-touches[0].clientY;
        this._theta -= dx*0.004;
        this._phi    = Math.max(-1.4, Math.min(1.4, this._phi-dy*0.004));
        this._updateEye();
      } else if (e.touches.length===2) {
        const dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
        if (lastDist) this._radius=Math.max(3,Math.min(200,this._radius-(dist-lastDist)*0.1));
        lastDist=dist;
        this._updateEye();
      }
      touches=[...e.touches];
      e.preventDefault();
    }, {passive:false});
    canvas.addEventListener('touchend', e => { lastDist=0; touches=[...e.touches]; }, {passive:false});
  }

  getViewMatrix()       { return mat4.lookAt(this.eye, this._center, this.up); }
  getProjectionMatrix() { return mat4.perspective(this.fov, this.aspect, this.near, this.far); }
}
