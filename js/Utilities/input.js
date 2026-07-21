'use strict';
// ─── Teclado ─────────────────────────────────────────────────────────
const Input = {
  keys: {}, just: {},
  pointer: { x: 0, y: 0, just: false },
  map: {
    left:    ['ArrowLeft', 'KeyA'],
    right:   ['ArrowRight', 'KeyD'],
    up:      ['ArrowUp', 'KeyW'],
    downKey: ['ArrowDown', 'KeyS'],
    jump:    ['Space', 'KeyZ'],
    attack:  ['KeyX', 'KeyJ'],
    dash:    ['ShiftLeft', 'ShiftRight', 'KeyC', 'KeyL'],
    confirm: ['Enter', 'KeyZ', 'Space'],
    back:    ['Escape', 'KeyX'],
    swap:    ['KeyQ'],
    equip:   ['KeyE'],
    healSkill: ['KeyR'],
    developer: ['F9']
  },

  init() {
    addEventListener('pointerdown', e => {
      Sfx.init();
      if (e.button !== 0) return;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.just = true;
    });
    addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F9'].includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.keys[e.code] = true; this.just[e.code] = true; }
      Sfx.init();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => {
      this.keys = {};
      this.pointer.just = false;
    });
  },

  is(name) { return this.map[name].some(c => this.keys[c]); },
  pressed(name) { return this.map[name].some(c => this.just[c]); },
  endFrame() {
    this.just = {};
    this.pointer.just = false;
  }
};
