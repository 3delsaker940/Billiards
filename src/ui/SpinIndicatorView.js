/** Small overlay that mirrors the current spin selection (top/back/side) as text/icon feedback. */
export class SpinIndicatorView {
  constructor(panelSelector = '#spin-selector-panel') {
    this.panel = document.querySelector(panelSelector);
    this.label = document.createElement('div');
    this.label.id = 'spin-label';
    this.panel.appendChild(this.label);
  }

  update(tipOffset) {
    const parts = [];
    if (tipOffset.y > 0.15) parts.push('توب سبن');
    else if (tipOffset.y < -0.15) parts.push('باك سبن (دْرو)');
    if (tipOffset.x > 0.15) parts.push('إنجليش يمين');
    else if (tipOffset.x < -0.15) parts.push('إنجليش يسار');
    this.label.textContent = parts.length ? parts.join(' + ') : 'ضربة مركزية';
  }
}