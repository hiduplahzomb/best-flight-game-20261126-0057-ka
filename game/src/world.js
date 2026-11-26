// Deterministic terrain: heightfield + landmarks (sea arch, lighthouse,
// volcano, runways, beacon rings, thermal columns, flare lines).
// The whole track is laid along the runway heading: s = metres along the
// track from the start, lat = metres to the right of the track.
import { fbm2, noise2, clamp } from './rng.js';

export function makeWorld(sortie, seed) {
  const s = seed * 7 + sortie.id * 131;
  const runwayHdg = sortie.id === 1 ? 90 : sortie.id === 2 ? 220 : sortie.id === 3 ? 140 : sortie.id === 4 ? 280 : 310;
  const rwyLen = sortie.stripM;
  const hdgR = runwayHdg * Math.PI / 180;
  const dirX = Math.sin(hdgR), dirZ = Math.cos(hdgR);
  const at = (along, lat) => ({ x: dirX * along + dirZ * lat, z: dirZ * along - dirX * lat });
  const rwyZ = 5200;
  const rwy = at(rwyZ, 0);
  const archP = at(4612, 15);
  const lhP = at(4800, -320);
  const volcP = at(6800, 1500);
  const ridgeP = at(3200, 60);
  const gates = [];
  for (let i = 0; i < sortie.gates; i++) {
    const f = (i + 1) / sortie.gates;
    const gp = at(900 + f * (rwyZ - 1100), Math.sin(f * 1.1 + sortie.id) * 260 * (1 - f * 0.4));
    const gy = 260 + f * 420 + Math.sin(f * 9 + sortie.id * 2) * 90;
    gates.push({ x: gp.x, z: gp.z, alt: gy, r: 42, hit: false });
  }
  const elevFt = sortie.id === 4 ? 180 : sortie.id === 3 ? 340 : sortie.id === 5 ? 620 : sortie.id === 2 ? 410 : 12;
  return {
    seed: s, sortie, runwayHdg, rwyLen, at,
    runway: { x: rwy.x, z0: rwy.z, s0: rwyZ, lengthM: rwyLen, hdg: runwayHdg, elevFt },
    toTrack(x, z) { const dx = x - rwy.x, dz = z - rwy.z; return { along: dx * dirX + dz * dirZ, lat: dx * dirZ - dz * dirX }; },
    gates,
    arch: { x: archP.x, z: archP.z, spanM: 300, heightFt: 600 },
    lighthouse: { x: lhP.x, z: lhP.z, beamAngle: 0 },
    volcano: { x: volcP.x, z: volcP.z, heightFt: 2400 },
    terrainHeight(x, z) {
      const tr = { along: (x - rwy.x) * dirX + (z - rwy.z) * dirZ, lat: (x - rwy.x) * dirZ - (z - rwy.z) * dirX };
      const ridge = Math.abs(tr.lat) / 900;
      let h = fbm2(x * 0.0016 + 3.7, z * 0.0016, s, 4) * 260 + ridge * ridge * 320;
      const dVolc = Math.hypot(x - volcP.x, z - volcP.z);
      h += Math.max(0, 2200 - dVolc * 0.55);
      const dArch = Math.hypot(x - archP.x, z - archP.z);
      if (dArch < 420) h += Math.max(0, (420 - dArch) * 0.5);
      const dRwy = Math.hypot(x - rwy.x, z - (rwy.z + rwyLen / 2));
      if (dRwy < 420) h = h * (dRwy / 420) + elevFt * (1 - dRwy / 420);
      if (Math.abs(tr.lat) < 260 && tr.along < -700) h = Math.min(h, 8);
      h = Math.min(h, 1100);
      return Math.max(0, h);
    },
    windAt(x, z, t) {
      const base = noise2(x * 0.002, z * 0.002 + t * 0.05, s + 55);
      const gust = Math.sin(t * 0.9 + x * 0.004) * sortie.gustKt * 0.5;
      let updraft = 0, shear = 0;
      const dRidge = Math.hypot(x - ridgeP.x, z - ridgeP.z);
      if (dRidge < 500) updraft = 450 * (1 - dRidge / 500);
      const along = (x - ridgeP.x) * dirX + (z - ridgeP.z) * dirZ;
      if (along > 200 && along < 1000 && Math.abs((x - ridgeP.x) * (-dirZ) + (z - ridgeP.z) * dirX) < 300) shear = 260 * Math.sin((along - 200) / 800 * Math.PI);
      const dArch = Math.hypot(x - archP.x, z - archP.z);
      if (dArch < 500) shear += 180 * (1 - dArch / 500);
      return { along: base * 6 + gust * 0.3, cross: base * 8, updraft, shear, gustKt: sortie.windKt + gust };
    },
  };
}
