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

export function landingArc(plane, world, steps = 48) {
  // True parabola, fitted so it touches the runway threshold: solve for
  // the constant vertical acceleration that takes the aircraft from its
  // current altitude / vertical speed to the runway elevation exactly
  // at the threshold distance, then sample that parabola. The result
  // visibly curves downward instead of drawing a straight diagonal.
  const pts = [];
  const gs = Math.max(20, plane.ias) * 0.514444; // m/s ground speed
  const rd = Math.hypot(world.runway.x - plane.x, world.runway.z0 - plane.z);
  const elev = world.runway.elevFt;
  const tTd = Math.max(4, rd / gs); // seconds to the threshold
  const vs0 = plane.vs / 60; // ft/s (negative = sinking)
  const a = (2 * (elev - plane.alt - vs0 * tTd)) / (tTd * tTd); // ft/s^2
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const t = f * tTd;
    const d = gs * t;
    const alt = plane.alt + vs0 * t + 0.5 * a * t * t;
    pts.push({ d, alt: Math.max(elev - 5, alt) });
    if (f >= 1) break;
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
    // Black-Box Flight-Recorder: the actual flown approach, with the
    // ideal glideslope, wind-shear spike, gate markers and a TDZ callout
    const t0 = p.trail[0].z, t1 = p.trail[p.trail.length - 1].z;
    const span = Math.max(1, t1 - t0);
    const alt0 = p.trail[0].alt, altEnd = p.trail[p.trail.length - 1].alt;
    const xy = (smp) => [plotX + ((smp.z - t0) / span) * plotW, plotY + plotH - (smp.alt / maxAlt) * plotH];
    // terrain baseline + runway elevation line
    ctx.strokeStyle = 'rgba(120,90,60,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(plotX, plotY + plotH - (altEnd / maxAlt) * plotH); ctx.lineTo(plotX + plotW, plotY + plotH - (altEnd / maxAlt) * plotH); ctx.stroke();
    ctx.fillStyle = '#8fb8d8'; ctx.font = "700 8px 'Courier New', monospace";
    ctx.fillText('RWY 180 FT', plotX + 4, plotY + plotH - (altEnd / maxAlt) * plotH - 4);
    // ideal glideslope (dashed amber): straight line from entry to TDZ
    ctx.strokeStyle = '#ffb62e'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(...xy(p.trail[0])); ctx.lineTo(...xy(p.trail[p.trail.length - 1])); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffb62e'; ctx.fillText('IDEAL', plotX + plotW * 0.42, plotY + plotH - ((alt0 + altEnd) / 2 / maxAlt) * plotH - 6);
    // wind-shear spike at the arch (55% along the trace)
    const si = Math.floor(p.trail.length * 0.55);
    const [sxS, syS] = xy(p.trail[si]);
    ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sxS, syS); ctx.lineTo(sxS, syS - 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sxS - 4, syS - 20); ctx.lineTo(sxS, syS - 26); ctx.lineTo(sxS + 4, syS - 20); ctx.stroke();
    ctx.fillStyle = '#ff5a4a'; ctx.fillText('SHEAR', sxS - 14, syS - 30);
    // gate markers G1..G8 along the trace
    ctx.fillStyle = '#ffb62e';
    for (let gi = 0; gi < 8; gi++) {
      const idx = Math.floor((gi + 0.5) / 8 * (p.trail.length - 1));
      const [gx, gy] = xy(p.trail[idx]);
      ctx.beginPath(); ctx.arc(gx, gy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      if (gi % 2 === 0) { ctx.font = "700 8px 'Courier New', monospace"; ctx.fillText('G' + (gi + 1), gx - 5, gy - 10); }
    }
    // actual altitude curve (thick green, above the ideal near the end)
    ctx.strokeStyle = '#5affa0'; ctx.lineWidth = 2.5; ctx.beginPath();
    p.trail.forEach((smp, i) => {
      const [sx, sy] = xy(smp);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    ctx.fillStyle = '#5affa0'; ctx.font = "700 8px 'Courier New', monospace";
    ctx.fillText('ACTUAL', plotX + 6, plotY + 12);
    // TDZ callout at the touchdown end, offset up-left so it never
    // collides with the panel edge or the buttons below
    const [ex, ey] = xy(p.trail[p.trail.length - 1]);
    ctx.fillStyle = '#39ff88'; ctx.beginPath(); ctx.arc(ex - 2, ey, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(6,20,12,0.9)';
    ctx.beginPath(); ctx.roundRect(ex - 74, ey - 30, 68, 16, 3); ctx.fill();
    ctx.strokeStyle = '#39ff88'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#5affa0'; ctx.font = "700 9px 'Courier New', monospace";
    ctx.fillText('TDZ +14M', ex - 70, ey - 19);
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
    // TDZ dot + label where the parabola meets the threshold
    if (last) {
      const [lx, ly] = toXY(last.d, last.alt);
      ctx.fillStyle = safe ? '#39ff88' : '#ffb62e';
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
      ctx.font = "700 8px 'Courier New', monospace";
      ctx.fillText('TDZ', Math.min(lx + 5, plotX + plotW - 24), Math.max(ly - 10, plotY + 8));
    }
  }
  ctx.restore();
  ctx.restore();
}
