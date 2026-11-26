// Shot harness: boots a real sortie, runs the internal flight-director
// autopilot through the real fixed-timestep physics / wind-shear / gate
// scoring / V-SCOPE recording, then freezes at the staged point and sets
// window.__shotReady once the frame is painted.
import { stepPhysics, DT } from './physics.js';
import { clamp, wrapAngle } from './rng.js';

// Autopilot: steer toward the next gate, hold target speed/altitude.
export function autopilotInput(plane, world) {
  const next = world.gates.find(g => !g.hit) || { x: world.runway.x, z: world.runway.z0, alt: world.runway.elevFt + 40 };
  const dx = next.x - plane.x, dz = next.z - plane.z;
  const targetHdg = (Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360;
  const err = wrapAngle(targetHdg - plane.hdg);
  const roll = clamp(err / 30, -1, 1);
  const altErr = next.alt - plane.alt;
  const pitch = clamp(altErr / 200, -1, 1) * 0.7;
  const targetIas = plane.gearDown ? 84 : 120;
  const thr = plane.ias < targetIas ? 1 : plane.ias > targetIas + 8 ? -1 : 0;
  return { pitch: -pitch, roll, yaw: clamp(err / 60, -0.5, 0.5), throttle: thr, brake: false };
}

export function runAutopilot(game, steps) {
  for (let i = 0; i < steps; i++) {
    const input = autopilotInput(game.plane, game.world);
    // throttle is a delta in the live loop; here set it directly
    game.plane.throttle = clamp(game.plane.throttle + input.throttle * 0.02, 0.2, 1);
    const wind = game.world.windAt(game.plane.x, game.plane.z, game.plane.timeS);
    stepPhysics(game.plane, { pitch: input.pitch, roll: input.roll, yaw: input.yaw, throttle: game.plane.throttle, brake: false }, game.sortie, wind, DT);
    game.checkGates();
    game.plane.timeS += 0; // stepPhysics already advances time
  }
}

// Staged initial states per brief (exact HUD numbers preserved).
export const SHOT_STAGES = {
  climax: { sortie: 4, seed: 404, view: 'chase', steps: 150, setup(g) {
    const p = g.plane;
    { const q = g.world.at(4240, -40); p.x = q.x; p.z = q.z; } p.alt = 465; p.hdg = 286; p.pitch = -4; p.bank = 24;
    p.ias = 84; p.vs = -540; p.throttle = 0.74; p.engL = 74; p.engR = 72;
    p.flap = 30; p.gearDown = true; p.deice = true; p.rime = 26; p.fuel = 16.4; p.score = 14820; p.mult = 2.5;
    p.timerS = 38; g.world.gates.forEach((gg, i) => { gg.hit = i < 6; });
    // stage gates 07/08 on the approach line: 07 hangs inside the arch
    // opening, 08 sits just past it over the runway threshold
    { const q7 = g.world.at(4520, -20); g.world.gates[6].x = q7.x; g.world.gates[6].z = q7.z; g.world.gates[6].alt = 373; }
    { const q8 = g.world.at(5050, 0); g.world.gates[7].x = q8.x; g.world.gates[7].z = q8.z; g.world.gates[7].alt = 240; }
    // cinematic chase framing: bigger Fulmar, lower-left, arch owns the frame
    p.chaseScale = 1.3; p.chaseX = 0.40; p.chaseY = 0.72;
    g.banner = { text: 'PYROCLASTIC FRONT CLOSES FJORD IN 00:38 — LAND RWY 28R · 0.52 NM', color: '#a01818', progress: 0.25 };
    g.radioMsg = 'Torben Vik (Skarv Tower): "Gannet flares lit — gusts 39 knots off the arch, hold 84 knots over the lip!"';
  } },
  play: { sortie: 2, seed: 207, view: 'cockpit', steps: 150, setup(g) {
    const p = g.plane;
    { const q = g.world.at(2900, 30); p.x = q.x; p.z = q.z; } p.alt = 910; p.hdg = 218; p.pitch = 5; p.bank = -14;
    p.ias = 124; p.vs = 320; p.throttle = 0.91; p.engL = 91; p.engR = 91;
    p.flap = 0; p.gearDown = false; p.deice = false; p.rime = 8; p.fuel = 31.8; p.score = 7340; p.mult = 1.8;
    p.timerS = 74; g.world.gates.forEach((gg, i) => { gg.hit = i < 3; });
    // stage gate 04 dead ahead at the plane's height so the ring reads
    // through the windshield, over the rising thermal column
    { const q4 = g.world.at(3243, 30); g.world.gates[3].x = q4.x; g.world.gates[3].z = q4.z; g.world.gates[3].alt = 880; }
    g.banner = { text: 'THERMAL WINDOW COLLAPSING 01:14 — CLEAR KALDVIK RIDGE (GATE 04/07)', color: '#b07a10', progress: 0.55 };
    g.radioMsg = 'Oskar Nygard (Caldera Obs): "Vent surge on Ridge B — ride the updraft through Gate 4, brace for lee rotor past the saddle."';
  } },
  start: { sortie: 1, seed: 101, view: 'chase', steps: 120, setup(g) {
    const p = g.plane;
    { const q = g.world.at(1800, 200); p.x = q.x; p.z = q.z; } p.alt = 520; p.hdg = 92; p.pitch = -2; p.bank = -12;
    p.ias = 112; p.vs = -120; p.throttle = 0.78; p.engL = 78; p.engR = 78;
    p.flap = 0; p.gearDown = false; p.deice = false; p.rime = 0; p.fuel = 48.0; p.score = 0; p.mult = 1.0;
    p.timerS = 240;
    g.banner = { text: 'SKARV SOUND FLIGHT WATCH — STORM FRONT ETA 04:00 · STANDBY FOR LAUNCH', color: '#2a3a5e', progress: 1 };
    g.radioMsg = 'Torben Vik (Skarv Tower): "Fulmar-4, harbor flares lit — wind 074 at 11, runway 09 clear for evac lift."';
    g.screen = 'title';
  } },
  end: { sortie: 4, seed: 404, view: 'chase', steps: 150, setup(g) {
    const p = g.plane;
    { const q = g.world.at(5320, 0); p.x = q.x; p.z = q.z; } p.alt = 180; p.hdg = 280; p.pitch = 0; p.bank = 0;
    p.ias = 24; p.vs = 0; p.throttle = 0.45; p.engL = 45; p.engR = 45;
    p.flap = 30; p.gearDown = true; p.deice = true; p.rime = 21; p.fuel = 14.9; p.score = 18450; p.mult = 2.5;
    p.timerS = 19; p.onGround = true; p.reverse = true;
    g.world.gates.forEach(gg => { gg.hit = true; });
    g.banner = { text: 'TOUCHDOWN CONFIRMED — RWY 28R GANNET LEDGE · 6 EVACUEES SAFE · 00:19 TO SPARE', color: '#0a7a3a', progress: 1 };
    g.radioMsg = 'Dr. Signe Halvorsen (Gannet Pad): "Six souls safe on the pad, Maren. That was a masterclass approach."';
    g.screen = 'debrief';
    // black-box trace: the recorded descent through the arch to the strip
    p.trail = [];
    for (let i = 0; i <= 40; i++) {
      const f = i / 40;
      p.trail.push({ t: i * 2.4, alt: Math.round(820 - f * f * 640), ias: Math.round(118 - f * 94), z: 600 + f * 4720 });
    }
    g.debrief = { grade: 'A+', title: 'MASTER BUSH AVIATOR', sinkFpm: -118, thresholdM: 14, gates: '08/08', stormMargin: '00:19', hull: 94, evac: '6 EVAC / 420 KG', sortieScore: 18450, campaign: 49210 };
  } },
};
