'use strict';
// ─── Teclado ─────────────────────────────────────────────────────────
const Input = {
  keys: {}, just: {},
  pointer: { x: 0, y: 0, just: false },
  map: {
    left:    ['ArrowLeft', 'KeyA', 'a', 'A'],
    right:   ['ArrowRight', 'KeyD', 'd', 'D'],
    up:      ['ArrowUp', 'KeyW', 'w', 'W'],
    downKey: ['ArrowDown', 'KeyS', 's', 'S'],
    jump:    ['Space', 'KeyZ', 'z', 'Z'],
    attack:  ['KeyX', 'KeyJ', 'x', 'X', 'j', 'J'],
    dash:    ['ShiftLeft', 'ShiftRight', 'KeyC', 'KeyL', 'c', 'C', 'l', 'L'],
    confirm: ['Enter', 'KeyZ', 'Space', 'z', 'Z'],
    back:    ['Escape', 'KeyX', 'x', 'X'],
    swap:    ['KeyQ', 'q', 'Q'],
    equip:   ['KeyE', 'e', 'E'],
    healSkill: ['KeyR', 'r', 'R'],
    developer: ['F9']
  },

  reset() {
    this.keys = {};
    this.just = {};
    this.pointer.just = false;
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
      const code = e.code;
      const key = e.key;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'F9'].includes(code) ||
          ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(key)) {
        e.preventDefault();
      }

      const wasDown = !!this.keys[code] || (key && !!this.keys[key]);
      this.keys[code] = true;
      if (key) this.keys[key] = true;

      if (!e.repeat && !wasDown) {
        this.just[code] = true;
        if (key) this.just[key] = true;
      }
      Sfx.init();
    });
    addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.key) this.keys[e.key] = false;
    });
    addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });
  },

  is(name) { return (this.map[name] || []).some(c => this.keys[c]); },
  pressed(name) { return (this.map[name] || []).some(c => this.just[c]); },
  endFrame() {
    this.just = {};
    this.pointer.just = false;
  }
};

