// Keyboard input: full desktop controls, no mouse required.
export function createInput() {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered this frame
  const map = {
    ArrowUp: 'pitchDown', KeyW: 'pitchDown',
    ArrowDown: 'pitchUp', KeyS: 'pitchUp',
    ArrowLeft: 'rollLeft', KeyA: 'rollLeft',
    ArrowRight: 'rollRight', KeyD: 'rollRight',
    KeyQ: 'yawLeft', KeyE: 'yawRight',
    ShiftLeft: 'thrUp', ShiftRight: 'thrUp',
    ControlLeft: 'thrDown', ControlRight: 'thrDown',
    KeyR: 'thrUp', KeyF: 'thrDown',
    KeyB: 'brake',
  };
  const edge = { KeyF: 'flap', KeyG: 'gear', KeyI: 'deice', KeyC: 'camera', KeyP: 'pause', KeyM: 'mute', Enter: 'confirm', Space: 'confirm', KeyX: 'refly' };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (edge[e.code]) pressed.add(edge[e.code]);
    if (map[e.code]) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  return {
    read() {
      const has = (a) => keys.has(a);
      const out = {
        pitch: (has('ArrowUp') || has('KeyW') ? -1 : 0) + (has('ArrowDown') || has('KeyS') ? 1 : 0),
        roll: (has('ArrowLeft') || has('KeyA') ? -1 : 0) + (has('ArrowRight') || has('KeyD') ? 1 : 0),
        yaw: (has('KeyQ') ? -1 : 0) + (has('KeyE') ? 1 : 0),
        throttle: 0, brake: has('KeyB'),
      };
      if (has('ShiftLeft') || has('ShiftRight') || has('KeyR')) out.throttle = 1;
      if (has('ControlLeft') || has('ControlRight') || has('KeyF')) out.throttle = -1;
      return out;
    },
    takeEdge(name) { const v = pressed.has(name); if (v) pressed.delete(name); return v; },
    consumeEdges() { pressed.clear(); },
  };
}
export const CONTROLS_TEXT = 'ARROWS/WASD pitch+roll · Q/E rudder · SHIFT/CTRL throttle · F flaps · G gear · I de-ice · B brake/reverse · C camera · P pause · X refly · M mute';
