// Arcade-sim flight model: fixed timestep, lift/drag/stall, coordinated turns,
// twin-engine throttle lag, 3 flap notches, retractable gear, rime icing,
// de-ice bleed air, fuel burn, ground contact and reverse-pitch braking.
import { clamp, wrapAngle, deg2rad } from './rng.js';

export const DT = 1 / 60;
export const KT_TO_MS = 0.514444;
export const FT_TO_M = 0.3048;

export function newPlane(sortie) {
  return {
    // position: x east (m), z north (m, forward along track), alt ft
    x: 0, z: 0, alt: 520, hdg: 90, pitch: 0, bank: 0,
    ias: 112, vs: 0, throttle: 0.78, engL: 78, engR: 78,
    flap: 0, gearDown: false, deice: false, rime: 0,
    fuel: sortie.fuelGal, onGround: false, crashed: false, crashReason: '',
    score: 0, mult: 1.0, gatesHit: 0, timeS: 0, timerS: sortie.timerS,
    stallWarn: false, buffet: 0, touchdownSink: 0, thresholdErrM: 0,
    reverse: false, brake: false, propAngle: 0, trail: [],
  };
}

export function stallSpeedKt(p) {
  // 68 kt clean, 62 kt flap 15, 56 kt flap 30; rime ice raises it.
  const base = p.flap === 0 ? 68 : p.flap === 15 ? 62 : 56;
  return base + p.rime * 0.14;
}

export function stepPhysics(p, input, sortie, wind, dt) {
  if (p.crashed || p.onGround && p.ias < 2 && input.throttle < 0.05) { /* parked */ }
  p.timeS += dt;
  p.timerS = Math.max(0, p.timerS - dt);
  // --- throttle lag (twin engines, slight differential) ---
  const targetThr = clamp(input.throttle, 0, 1);
  p.throttle += (targetThr - p.throttle) * Math.min(1, dt * 1.6);
  const lagL = 0.99 + 0.02 * Math.sin(p.timeS * 0.7);
  p.engL = clamp(p.engL + ((p.throttle * 100 * lagL) - p.engL) * Math.min(1, dt * 2.2), 0, 100);
  p.engR = clamp(p.engR + ((p.throttle * 100 * (2 - lagL)) - p.engR) * Math.min(1, dt * 2.2), 0, 100);
  // --- icing: cold moist air builds rime; bleed-air de-ice clears it ---
  const icingRate = sortie.oat < -5 ? (sortie.oat < -12 ? 0.55 : 0.3) : 0.08;
  if (p.deice) p.rime = Math.max(0, p.rime - dt * 6);
  else p.rime = Math.min(45, p.rime + dt * icingRate * (p.ias > 60 ? 1 : 0.4));
  // --- controls: pitch/roll with auto-trim damping ---
  const rollRate = 55 * dt * (p.ias > 50 ? 1 : 0.4);
  p.bank = clamp(p.bank + input.roll * rollRate, -60, 60);
  p.bank *= Math.pow(0.35, dt); // gentle auto-trim toward level
  if (Math.abs(input.roll) < 0.05) p.bank *= Math.pow(0.12, dt);
  p.pitch = clamp(p.pitch + input.pitch * 22 * dt, -18, 20);
  p.pitch *= Math.pow(0.5, dt);
  // coordinated turn: bank drives heading, yaw input trims it
  const turnRate = -p.bank * 0.42 * (p.ias / 100) + input.yaw * 14;
  p.hdg = (p.hdg + turnRate * dt + 360) % 360;
  // --- lift / drag / speed ---
  const stall = stallSpeedKt(p);
  const thrust = p.throttle * 118 - (p.reverse ? 60 : 0);
  const drag = 0.00042 * p.ias * p.ias * (1 + p.flap / 60 + (p.gearDown ? 0.35 : 0) + p.rime * 0.012);
  const accel = (thrust - drag * 2.2 - Math.sin(deg2rad(p.pitch)) * 42) * 0.055;
  p.ias = Math.max(0, p.ias + accel * dt * 60 * 0.14);
  p.stallWarn = p.ias < stall + 6 && !p.onGround;
  p.buffet = p.stallWarn ? Math.min(1, p.buffet + dt * 3) : Math.max(0, p.buffet - dt * 2);
  // stall: nose drops, sink grows
  if (p.ias < stall && !p.onGround) { p.pitch -= 14 * dt; p.vs -= 320 * dt; }
  // --- vertical speed from pitch, lift, thermal/shear ---
  const liftVs = Math.sin(deg2rad(p.pitch)) * p.ias * 1.9 * 60 * 0.016;
  const targetVs = liftVs + wind.updraft - wind.shear;
  p.vs += (targetVs - p.vs) * Math.min(1, dt * 1.4);
  p.alt += (p.vs / 60) * dt; // vs in fpm -> ft per second = vs/60
  p.alt = Math.max(0, p.alt);
  // --- horizontal motion ---
  const gs = Math.max(0, p.ias + wind.along);
  const hdgR = deg2rad(p.hdg);
  p.x += Math.sin(hdgR) * gs * KT_TO_MS * dt;
  p.z += Math.cos(hdgR) * gs * KT_TO_MS * dt;
  // --- fuel burn proportional to throttle ---
  p.fuel = Math.max(0, p.fuel - p.throttle * 0.011 * dt);
  if (p.fuel <= 0 && !p.onGround) { p.crashed = true; p.crashReason = 'FUEL EXHAUSTED'; }
  // --- prop spin ---
  p.propAngle = (p.propAngle + dt * (4 + p.throttle * 26)) % (Math.PI * 2);
  // --- recorder trail (1 sample per second) ---
  if (p.trail.length === 0 || p.timeS - p.trail[p.trail.length - 1].t >= 1) {
    p.trail.push({ t: p.timeS, alt: p.alt, ias: p.ias, z: p.z });
    if (p.trail.length > 600) p.trail.shift();
  }
  return p;
}

export function groundHeightAt(world, x, z) { return world.terrainHeight(x, z); }

// Landing evaluation when wheels touch inside the runway box.
export function evaluateTouchdown(p, runway, toTrack) {
  const tr = toTrack ? toTrack(p.x, p.z) : { along: p.z - runway.z0, lat: p.x - runway.x };
  const distAlong = tr.along;
  const lateral = Math.abs(tr.lat);
  const inStrip = distAlong >= 0 && distAlong <= runway.lengthM && lateral < 14;
  if (!inStrip) return { ok: false, reason: lateral >= 14 ? 'OFF-RUNWAY' : (distAlong > runway.lengthM ? 'OVERRUN' : 'SHORT') };
  if (!p.gearDown) return { ok: false, reason: 'BELLY SCRAPE — GEAR UP' };
  if (p.vs < -900) return { ok: false, reason: 'HARD IMPACT' };
  return { ok: true, sinkFpm: p.vs, thresholdM: distAlong };
}

export function gradeFrom(score, sinkFpm, gates, totalGates) {
  let pts = 0;
  if (sinkFpm > -200) pts += 2000; else if (sinkFpm > -450) pts += 1200; else pts += 500;
  pts += gates * 300;
  const g = pts >= 3400 ? 'A+' : pts >= 2600 ? 'A' : pts >= 1800 ? 'B' : 'C';
  return { grade: g, title: g === 'A+' ? 'MASTER BUSH AVIATOR' : g === 'A' ? 'SENIOR BUSH PILOT' : g === 'B' ? 'BUSH PILOT' : 'ROOKIE BUSH PILOT' };
}
