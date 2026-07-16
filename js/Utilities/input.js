'use strict';
// ─── Teclado ─────────────────────────────────────────────────────────
const Input = {
  keys: {}, just: {},
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
    equip:   ['KeyE']
  },

  init() {
    addEventListener('pointerdown', () => Sfx.init(), { once: true });
    addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.keys[e.code] = true; this.just[e.code] = true; }
      Sfx.init();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
  },

  is(name) { return this.map[name].some(c => this.keys[c]); },
  pressed(name) { return this.map[name].some(c => this.just[c]); },
  endFrame() { this.just = {}; }
};
