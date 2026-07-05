// controls/SpinSelector.js
// 2D UI: a circle representing the cue ball face-on. Click position -> tipOffset.
export class SpinSelector {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.radius = canvasEl.width / 2;
    this.tipOffset = { x: 0, y: 0 }; // normalized -1..1
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.render();
  }

  onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.radius) / this.radius;
    const y = (e.clientY - rect.top - this.radius) / this.radius;
    const dist = Math.sqrt(x*x + y*y);
    if (dist > 1) return; // outside cue ball disc — ignore
    this.tipOffset = { x, y: -y }; // flip Y: UI up = topspin
    this.render();
  }

  render() {
    const ctx = this.ctx, r = this.radius;
    ctx.clearRect(0, 0, r*2, r*2);
    ctx.beginPath(); ctx.arc(r, r, r-2, 0, Math.PI*2);
    ctx.fillStyle = '#f5f5f5'; ctx.fill(); ctx.strokeStyle = '#333'; ctx.stroke();
    // crosshair grid for center reference
    ctx.strokeStyle = '#ccc';
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(r, r*2); ctx.moveTo(0, r); ctx.lineTo(r*2, r); ctx.stroke();
    // strike point marker
    const px = r + this.tipOffset.x * r;
    const py = r - this.tipOffset.y * r;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI*2);
    ctx.fillStyle = '#d32f2f'; ctx.fill();
  }

  reset() { this.tipOffset = { x: 0, y: 0 }; this.render(); }
}