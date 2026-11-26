// V-SCOPE: vertical situation display. Each frame it samples real terrain,
// arch clearance, wind-shear columns, next beacon rings and runway geometry
// ahead along the ground track, and integrates a parabolic landing arc.
import { clamp } from './rng.js';

export function sampleProfile(world, plane, n = 48) {
  const pts = [];
  const hdg = plane.hdg * Math.PI / 180;
  const dx = Math.sin(hdg), dz = Math.cos(hdg);
  for (let i = 0; i < n; i++) {
    const d = (i / (n - 1)) * 2600; // metres ahead
    const x = plane.x + dx * d, z = plane.z + dz * d;
    const terr = world.terrainHeight(x, z);
    const wind = world.windAt(x, z, plane.timeS);
    pts.push({ d, terr, shear: wind.shear, updraft: wind.updraft });
  }
  return pts;
}

export function landingArc(plane, world, steps = 40) {
  // integrate vertical speed forward: parabola from current state
  const pts = [];
  let alt = plane.alt, vs = plane.vs, d = 0;
  const gs = Math.max(20, plane.ias) * 0.514444;
  for (let i = 0; i < steps; i++) {
    const dt = 0.5;
    d += gs * dt;
    vs += (-9.8 * 0.12 + (plane.flap > 0 ? -2.2 : 0)) * dt * 3.28; // sink grows gently
    alt += (vs / 60) * dt;
    pts.push({ d, alt: Math.max(0, alt) });
    if (alt <= 0) break;
  }
  return pts;
}

export function drawVScope(ctx, x, y, w, h, g) {
  const p = g.plane, world = g.world;
  ctx.save();
  ctx.fillStyle = 'rgba(6,14,10,0.78)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(90,255,160,0.4)'; ctx.stroke();
  ctx.font = "700 11px 'Courier New', monospace"; ctx.fillStyle = '#5affa0'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(g.debrief ? 'BLACK-BOX FLIGHT-RECORDER' : 'V-SCOPE · VERTICAL SITUATION', x + 8, y + 6);
  const plotX = x + 8, plotY = y + 22, plotW = w - 16, plotH = h - 30;
  const maxAlt = 1200;
  const toXY = (d, alt) => [plotX + (d / 2600) * plotW, plotY + plotH - (Math.min(alt, maxAlt) / maxAlt) * plotH];
  ctx.save();
  ctx.beginPath(); ctx.rect(plotX, plotY, plotW, plotH); ctx.clip();
  if (g.debrief && p.trail.length > 2) {
    // black-box trace: actual flown path
    const t0 = p.trail[0].z, t1 = p.trail[p.trail.length - 1].z;
    const span = Math.max(1, t1 - t0);
    ctx.strokeStyle = '#5affa0'; ctx.lineWidth = 2; ctx.beginPath();
    p.trail.forEach((smp, i) => {
      const [sx, sy] = [plotX + ((smp.z - t0) / span) * plotW, plotY + plotH - (smp.alt / maxAlt) * plotH];
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    ctx.stroke();
  } else {
    const prof = sampleProfile(world, p);
    // terrain profile
    ctx.fillStyle = 'rgba(120,90,60,0.85)';
    ctx.beginPath(); ctx.moveTo(plotX, plotY + plotH);
    prof.forEach(pt => { const [sx, sy] = toXY(pt.d, pt.terr); ctx.lineTo(sx, sy); });
    ctx.lineTo(plotX + plotW, plotY + plotH); ctx.closePath(); ctx.fill();
    // arch clearance line
    const archD = Math.hypot(world.arch.x - p.x, world.arch.z - p.z);
    if (archD < 2600) {
      const [ax] = toXY(archD, 0);
      ctx.strokeStyle = '#ffb62e'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(ax, plotY + plotH - (world.arch.heightFt / maxAlt) * plotH); ctx.lineTo(ax, plotY); ctx.stroke();
      ctx.setLineDash([]);
    }
    // shear arrows
    prof.forEach(pt => {
      if (Math.abs(pt.shear) > 60) {
        const [sx, sy] = toXY(pt.d, pt.terr + 120);
        ctx.strokeStyle = '#ffb62e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, sy - 8); ctx.lineTo(sx, sy + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx - 4, sy + 4); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx + 4, sy + 4); ctx.stroke();
      }
      if (pt.updraft > 150) {
        const [sx, sy] = toXY(pt.d, pt.terr + 200);
        ctx.fillStyle = '#ff8c1e'; ctx.font = "700 12px monospace"; ctx.fillText('▲', sx - 4, sy - 6);
      }
    });
    // gate pins
    world.gates.forEach(gg => {
      if (gg.hit) return;
      const d = Math.hypot(gg.x - p.x, gg.z - p.z);
      if (d > 2600) return;
      const [sx, sy] = toXY(d, gg.alt);
      ctx.fillStyle = '#ffb62e'; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
    });
    // runway threshold marker
    const rd = Math.hypot(world.runway.x - p.x, world.runway.z0 - p.z);
    if (rd < 2600) {
      const [sx, sy] = toXY(rd, world.runway.elevFt);
      ctx.fillStyle = '#39ff88'; ctx.fillRect(sx - 8, sy - 2, 16, 4);
    }
    // landing arc parabola
    const arc = landingArc(p, world);
    const last = arc[arc.length - 1];
    const safe = last && last.alt <= world.runway.elevFt + 30;
    ctx.strokeStyle = safe ? '#39ff88' : '#ffb62e'; ctx.lineWidth = 2.5; ctx.beginPath();
    arc.forEach((pt, i) => { const [sx, sy] = toXY(pt.d, pt.alt); i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy); });
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}
