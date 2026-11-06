import { mat4 } from './utils/math.js';

export class Camera {
  constructor(canvas) {
    // Elevated overview shows the canal and the single residential crossing.
    this._center = [-14, 1.0, -36];
    this._theta  = 0.38;
    this._phi    = 0.42;
    this._radius = 68;

    this.up   = [0, 1, 0];
    this.fov  = 55 * Math.PI / 180;
    this.near = 0.1;
    this.far  = 600;
    this.aspect = canvas.width / canvas.height;

    this.eye = [0, 0, 0];
    this._updateEye();
    this._bindEvents(canvas);
  }

  setPreset(name) {
    const presets = {
      overview: { center: [-14,1,-36], theta: 0.38, phi: 0.42, radius: 68 },
      road: { center: [-5.1,1.7,-36], theta: 0, phi: 0.025, radius: 46 },
      housing: { center: [-27,1.5,-24], theta: 1.05, phi: 0.5, radius: 43 },
      entrance: { center: [-18,1,-12], theta: 0.85, phi: 0.55, radius: 30 },
    };
    const p = presets[name] || presets.overview;
    this._center = [...p.center]; this._theta = p.theta; this._phi = p.phi; this._radius = p.radius;
    this._updateEye();
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
      this._phi    = Math.max(0.025, Math.min(1.4, this._phi-(e.clientY-ly)*0.004));
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
        this._phi    = Math.max(0.025, Math.min(1.4, this._phi-dy*0.004));
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
