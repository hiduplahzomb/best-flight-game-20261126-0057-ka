// Pseudo-3D renderer: gradient dusk sky, aurora band, layered ridge silhouettes,
// projected terrain strips, sea arch, lighthouse beam, runway flare line,
// beacon rings, and the KV-14 Fulmar drawn as a vector twin-prop.
import { clamp, lerp, deg2rad } from './rng.js';

function sky(ctx, W, H, pal, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  g.addColorStop(0, pal.skyTop); g.addColorStop(0.55, pal.skyMid); g.addColorStop(1, pal.horizon);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.62);
  // stars fading in at the top of the dusk sky
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 331 + 97) % W), sy = ((i * 173 + 41) % Math.floor(H * 0.14)) + 4;
    ctx.globalAlpha = 0.25 + ((i * 7) % 10) / 22;
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;
  // aurora: three feathered, overlapping bands (green core, teal skirt,
  // violet veil) — each band is several offset sine strokes so the edge
  // reads as soft curtains, never a single thin line
  const bands = [
    { col: 'rgba(89,232,154,', y: 0.085, amp: 16, w: 26, a: 0.20 },
    { col: 'rgba(64,220,190,', y: 0.115, amp: 20, w: 18, a: 0.28 },
    { col: 'rgba(150,120,255,', y: 0.06, amp: 12, w: 14, a: 0.14 },
  ];
  for (const b of bands) {
    for (let k = -2; k <= 2; k++) {
      ctx.save(); ctx.globalAlpha = b.a * (1 - Math.abs(k) * 0.28);
      ctx.strokeStyle = b.col + '1)'; ctx.lineWidth = b.w; ctx.lineCap = 'round';
      ctx.shadowColor = b.col + '0.9)'; ctx.shadowBlur = 22;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 14) {
        const y = H * b.y + Math.sin(x * 0.006 + t * 0.3 + k * 0.4) * b.amp
          + Math.sin(x * 0.017 + k) * 7 + k * 7;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.restore();
    }
    // vertical curtain rays hanging off the band
    ctx.save(); ctx.globalAlpha = b.a * 0.7;
    for (let x = 30; x < W; x += 67) {
      const y0 = H * b.y + Math.sin(x * 0.006 + t * 0.3) * b.amp;
      const lg = ctx.createLinearGradient(0, y0, 0, y0 + 52);
      lg.addColorStop(0, b.col + '0.55)'); lg.addColorStop(1, b.col + '0)');
      ctx.fillStyle = lg; ctx.fillRect(x, y0, 5, 52);
    }
    ctx.restore();
  }
  // sun glow at horizon
  const sg = ctx.createRadialGradient(W * 0.62, H * 0.58, 4, W * 0.62, H * 0.58, 260);
  sg.addColorStop(0, 'rgba(255,190,90,0.85)'); sg.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H * 0.7);
  // ash wall on the horizon (storm front): layered, ragged, not a flat band
  ctx.fillStyle = 'rgba(52,10,14,0.6)';
  ctx.beginPath(); ctx.moveTo(0, H * 0.52);
  for (let x = 0; x <= W; x += 32) ctx.lineTo(x, H * 0.52 - Math.sin(x * 0.013 + t * 0.2) * 12 - 22 - Math.sin(x * 0.031) * 8);
  ctx.lineTo(W, H * 0.62); ctx.lineTo(0, H * 0.62); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(90,26,20,0.45)';
  ctx.beginPath(); ctx.moveTo(0, H * 0.56);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H * 0.56 - Math.sin(x * 0.009 + 2 + t * 0.15) * 9 - 10);
  ctx.lineTo(W, H * 0.62); ctx.lineTo(0, H * 0.62); ctx.closePath(); ctx.fill();
  // volcano: a real faceted cone with a glowing crater, a billowing
  // pyroclastic ash plume and falling embers — not a red blur
  const vx = W * 0.80, vy = H * 0.52, vw = 150, vh = 118;
  ctx.save();
  ctx.fillStyle = '#241a20';
  ctx.beginPath(); ctx.moveTo(vx - vw, vy); ctx.lineTo(vx - 26, vy - vh); ctx.lineTo(vx + 22, vy - vh); ctx.lineTo(vx + vw, vy); ctx.closePath(); ctx.fill();
  // sunlit / shadow facets of the cone
  ctx.fillStyle = '#3a2a30';
  ctx.beginPath(); ctx.moveTo(vx - vw, vy); ctx.lineTo(vx - 26, vy - vh); ctx.lineTo(vx - 4, vy - vh * 0.4); ctx.lineTo(vx - 30, vy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#171017';
  ctx.beginPath(); ctx.moveTo(vx + vw, vy); ctx.lineTo(vx + 22, vy - vh); ctx.lineTo(vx + 2, vy - vh * 0.45); ctx.lineTo(vx + 34, vy); ctx.closePath(); ctx.fill();
  // crater glow + lava rivulet down the lit face
  const cg = ctx.createRadialGradient(vx, vy - vh, 2, vx, vy - vh, 34);
  cg.addColorStop(0, 'rgba(255,220,120,0.95)'); cg.addColorStop(0.4, 'rgba(255,90,20,0.85)'); cg.addColorStop(1, 'rgba(255,60,20,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(vx - 2, vy - vh, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,110,30,0.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(vx - 8, vy - vh + 4); ctx.quadraticCurveTo(vx - 26, vy - vh * 0.55, vx - 44, vy - vh * 0.18); ctx.stroke();
  // ash plume: stacked grey-brown puffs drifting right, lit from below
  for (let i = 0; i < 9; i++) {
    const px = vx - 10 + i * 26 + Math.sin(t * 0.5 + i) * 6;
    const py = vy - vh - 14 - i * 13;
    const pr = 16 + i * 4;
    const pg = ctx.createRadialGradient(px, py, 2, px, py, pr);
    pg.addColorStop(0, 'rgba(120,90,80,0.75)'); pg.addColorStop(1, 'rgba(70,45,40,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  }
  // embers
  for (let i = 0; i < 12; i++) {
    const ex = vx - 40 + ((i * 53 + Math.floor(t * 30)) % 130);
    const ey = vy - vh + 10 + ((i * 37) % 70);
    ctx.fillStyle = i % 3 ? 'rgba(255,140,40,0.95)' : 'rgba(255,60,20,0.95)';
    ctx.beginPath(); ctx.arc(ex, ey, 1.8 + (i % 2), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function ridgeLayer(ctx, W, H, horizonY, seed, color, amp, base) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 24) {
    const n = Math.sin(x * 0.011 + seed) * 0.5 + Math.sin(x * 0.027 + seed * 2.7) * 0.3 + Math.sin(x * 0.05 + seed * 5) * 0.2;
    ctx.lineTo(x, horizonY - base - n * amp);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

// Project a world point (x,z,altFt) to screen, camera behind plane.
function project(px, pz, palt, cam, W, H) {
  const dx = px - cam.x, dz = pz - cam.z;
  const ca = Math.cos(deg2rad(cam.hdg)), sa = Math.sin(deg2rad(cam.hdg));
  const fwd = dx * sa + dz * ca;           // ahead of camera
  const lat = dx * ca - dz * sa;           // to the right
  if (fwd < 8) return null;
  const horizonY = H * 0.52 - (palt - cam.alt) * 0.3048 * 0.02 - cam.pitch * 4;
  const scale = (H * 0.9) / fwd;
  return { x: W / 2 + lat * scale, y: horizonY - (palt - cam.alt) * 0.3048 * scale * 2.0, s: scale, fwd };
}

function drawRing(ctx, pt, r, color, t) {
  if (!pt) return;
  const rr = Math.max(4, r * pt.s * 0.9);
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, rr * 0.12);
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 4);
  ctx.beginPath(); ctx.ellipse(pt.x, pt.y, rr, rr * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawRunway(ctx, world, cam, W, H, t) {
  const r = world.runway;
  const corner = (s, lat) => { const pt = world.at(s, lat); return project(pt.x, pt.z, r.elevFt, cam, W, H); };
  const p0 = corner(r.s0, -10), p1 = corner(r.s0, 10), p2 = corner(r.s0 + r.lengthM, 10), p3 = corner(r.s0 + r.lengthM, -10);
  if (!p0 || !p1 || !p2 || !p3) return;
  ctx.fillStyle = '#3a3438';
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath(); ctx.fill();
  // cliff ledge under the strip: the runway sits on a basalt shelf, so
  // draw the dark cliff face below its far edge with strata + shadow
  if (p2 && p3) {
    ctx.fillStyle = '#1e181f';
    ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p3.x - (p3.x - p2.x) * 0.08, p3.y + 46); ctx.lineTo(p2.x + (p3.x - p2.x) * 0.08, p2.y + 46);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,90,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(p2.x, p2.y + 16); ctx.lineTo(p3.x, p3.y + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p2.x, p2.y + 32); ctx.lineTo(p3.x, p3.y + 32); ctx.stroke();
  }
  // painted threshold bar "28R" across the strip mouth
  const thBar0 = corner(r.s0, -10), thBar1 = corner(r.s0, 10);
  if (thBar0 && thBar1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(3, 5 * p0.s);
    ctx.beginPath(); ctx.moveTo(thBar0.x, thBar0.y); ctx.lineTo(thBar1.x, thBar1.y); ctx.stroke();
    const midX = (thBar0.x + thBar1.x) / 2, midY = (thBar0.y + thBar1.y) / 2;
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(11, Math.round(16 * p0.s))}px 'Courier New', monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('28R', midX, midY - 8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }
  // warm halo over the threshold so the lit strip reads at long range
  const thGlow = world.at(r.s0, 0);
  const thg = project(thGlow.x, thGlow.z, r.elevFt + 4, cam, W, H);
  if (thg) {
    const rg = ctx.createRadialGradient(thg.x, thg.y, 2, thg.x, thg.y, 70);
    rg.addColorStop(0, 'rgba(255,150,40,0.40)');
    rg.addColorStop(1, 'rgba(255,150,40,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(thg.x - 70, thg.y - 70, 140, 140);
  }
  // centreline dashes so the strip reads even at long range
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1.5, 2.4 * p0.s);
  ctx.setLineDash([10 * p0.s, 8 * p0.s]);
  ctx.beginPath();
  const cm0 = corner(r.s0, 0), cm1 = corner(r.s0 + r.lengthM, 0);
  if (cm0 && cm1) { ctx.moveTo(cm0.x, cm0.y); ctx.lineTo(cm1.x, cm1.y); }
  ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i <= 8; i++) {
    const s = r.s0 + (i / 8) * r.lengthM;
    for (const lat of [-13, 13]) {
      const pt = world.at(s, lat);
      const pp = project(pt.x, pt.z, r.elevFt + 2, cam, W, H);
      if (!pp) continue;
      const fl = 0.6 + 0.4 * Math.sin(t * 6 + i * 1.7 + lat);
      ctx.fillStyle = `rgba(255,140,30,${fl})`;
      ctx.shadowColor = '#ff8c1e'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(pp.x, pp.y, Math.max(3.5, 7 * pp.s * 0.4), 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  const thp = world.at(r.s0, 0);
  const th = project(thp.x, thp.z, r.elevFt + 3, cam, W, H);
  // far runway emphasis: at ~0.5 NM the true projected strip is only
  // ~14 px wide and vanishes behind the arch — when the strip is that
  // small, draw a stylised hero threshold through the arch opening
  // (same projected centre, same threshold) so the runway reads
  const stripW = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  if (th && stripW < 60) {
    const farX = (p2.x + p3.x) / 2, farY = (p2.y + p3.y) / 2;
    const dx = farX - th.x, dy = farY - th.y, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, pxn = -uy, pyn = ux;
    const nearW = 52, farW = 18, farLen = Math.min(70, len);
    const fx = th.x + ux * farLen, fy = th.y + uy * farLen;
    ctx.fillStyle = '#6b5560';
    ctx.beginPath();
    ctx.moveTo(th.x - pxn * nearW, th.y - pyn * nearW);
    ctx.lineTo(fx - pxn * farW, fy - pyn * farW);
    ctx.lineTo(fx + pxn * farW, fy + pyn * farW);
    ctx.lineTo(th.x + pxn * nearW, th.y + pyn * nearW);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(th.x - pxn * nearW, th.y - pyn * nearW);
    ctx.lineTo(fx - pxn * farW, fy - pyn * farW);
    ctx.lineTo(fx + pxn * farW, fy + pyn * farW);
    ctx.lineTo(th.x + pxn * nearW, th.y + pyn * nearW);
    ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([8, 7]);
    ctx.beginPath(); ctx.moveTo(th.x, th.y); ctx.lineTo(fx, fy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.font = "700 13px 'Courier New', monospace";
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('28R', th.x, th.y - nearW * 0.28);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    for (const sx of [-1, 1]) {
      const hx = th.x + pxn * nearW * sx, hy = th.y + pyn * nearW * sx;
      ctx.fillStyle = 'rgba(255,150,40,0.95)'; ctx.shadowColor = '#ff8c1e'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  if (th) {
    // threshold strobes: a bright green pair, larger than the edge pots
    ctx.fillStyle = Math.sin(t * 8) > 0 ? '#39ff88' : '#1d8a4a';
    ctx.shadowColor = '#39ff88'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(th.x - 16, th.y, 8, 0, Math.PI * 2); ctx.arc(th.x + 16, th.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // flare pair flanking the threshold, with smoke drift
    for (const sx of [-1, 1]) {
      const fx = th.x + sx * 34, fy = th.y + 6;
      const fg2 = ctx.createRadialGradient(fx, fy, 1, fx, fy, 26);
      fg2.addColorStop(0, 'rgba(255,180,60,0.95)'); fg2.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = fg2; ctx.beginPath(); ctx.arc(fx, fy, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,140,40,0.5)';
      ctx.beginPath(); ctx.ellipse(fx + sx * 14 + Math.sin(t * 2) * 4, fy - 10, 16, 5, -0.3 * sx, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawArch(ctx, world, cam, W, H, t) {
  const a = world.arch;
  const base = project(a.x, a.z, 0, cam, W, H);
  if (!base) return;
  const span = a.spanM * base.s, hgt = a.heightFt * 0.3048 * base.s * 2.0;
  const cx = base.x, cy = base.y;
  ctx.save();
  // magma sunset glow shining through the opening (drawn first so the
  // rock silhouette cuts it into the shape of the opening)
  const glow = ctx.createRadialGradient(cx, cy - hgt * 0.5, 4, cx, cy - hgt * 0.5, span * 0.75);
  glow.addColorStop(0, 'rgba(255,150,50,0.55)');
  glow.addColorStop(0.6, 'rgba(255,90,30,0.28)');
  glow.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - span * 0.8, cy - hgt * 1.3, span * 1.6, hgt * 1.4);
  // faceted basalt arch: clip to the arch silhouette, then lay in
  // columnar facets, strata and a sunlit rim so the rock reads as
  // stone, not a flat charcoal cut-out
  ctx.beginPath();
  ctx.moveTo(cx - span / 2, cy);
  ctx.lineTo(cx - span / 2, cy - hgt * 0.55);
  ctx.quadraticCurveTo(cx, cy - hgt * 1.25, cx + span / 2, cy - hgt * 0.55);
  ctx.lineTo(cx + span / 2, cy);
  ctx.lineTo(cx + span * 0.28, cy);
  ctx.lineTo(cx + span * 0.28, cy - hgt * 0.5);
  ctx.quadraticCurveTo(cx, cy - hgt * 0.95, cx - span * 0.28, cy - hgt * 0.5);
  ctx.lineTo(cx - span * 0.28, cy);
  ctx.closePath();
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#221c24'; ctx.fillRect(cx - span, cy - hgt * 1.4, span * 2, hgt * 1.5);
  const facets = ['#2e2630', '#3a2f33', '#1a151c', '#45322c', '#2b2126', '#4a3a30'];
  for (let i = 0; i < 26; i++) {
    const fx = cx - span / 2 + ((i * 97) % 100) / 100 * span;
    const fy = cy - hgt * (0.15 + ((i * 61) % 100) / 100 * 1.05);
    const fw = span * (0.06 + ((i * 13) % 10) / 100);
    const fh = hgt * (0.10 + ((i * 29) % 10) / 100);
    ctx.fillStyle = facets[i % facets.length];
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(fx, fy); ctx.lineTo(fx + fw, fy - fh * 0.3); ctx.lineTo(fx + fw * 0.7, fy + fh);
    ctx.lineTo(fx - fw * 0.4, fy + fh * 0.8); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // horizontal strata
  ctx.strokeStyle = 'rgba(255,170,90,0.20)'; ctx.lineWidth = 1.5;
  for (let k = 1; k <= 4; k++) {
    const yy = cy - hgt * k * 0.22;
    ctx.beginPath(); ctx.moveTo(cx - span / 2, yy);
    ctx.quadraticCurveTo(cx, yy - hgt * 0.08, cx + span / 2, yy); ctx.stroke();
  }
  // vertical column joints on the pillars
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
  for (const px of [-0.42, -0.34, 0.34, 0.42]) {
    ctx.beginPath(); ctx.moveTo(cx + px * span, cy); ctx.lineTo(cx + px * span * 0.92, cy - hgt * 0.6); ctx.stroke();
  }
  // warm rim light on the sunlit (left) face of the opening
  const rimG = ctx.createLinearGradient(cx - span * 0.3, cy, cx - span * 0.1, cy);
  rimG.addColorStop(0, 'rgba(255,150,60,0)'); rimG.addColorStop(1, 'rgba(255,150,60,0.55)');
  ctx.fillStyle = rimG; ctx.fillRect(cx - span * 0.3, cy - hgt, span * 0.2, hgt);
  ctx.restore();
  // rock feet breaking the waterline at both pillar bases
  ctx.fillStyle = '#1d171d';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * span * 0.5 - span * 0.07, cy + 4);
    ctx.lineTo(cx + sx * span * 0.5, cy - hgt * 0.08);
    ctx.lineTo(cx + sx * span * 0.5 + span * 0.07, cy + 4);
    ctx.closePath(); ctx.fill();
  }
  // rim light on the arch
  ctx.strokeStyle = 'rgba(255,150,60,0.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - span / 2, cy - hgt * 0.55);
  ctx.quadraticCurveTo(cx, cy - hgt * 1.25, cx + span / 2, cy - hgt * 0.55); ctx.stroke();
  ctx.restore();
}

function drawLighthouse(ctx, world, cam, W, H, t) {
  const lh = world.lighthouse;
  const pt = project(lh.x, lh.z, 60, cam, W, H);
  if (!pt) return;
  const h = 90 * 0.3048 * pt.s * 2.0;
  ctx.save();
  ctx.fillStyle = '#e8e2d8';
  ctx.beginPath(); ctx.moveTo(pt.x - 6, pt.y); ctx.lineTo(pt.x - 3, pt.y - h); ctx.lineTo(pt.x + 3, pt.y - h); ctx.lineTo(pt.x + 6, pt.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c22a2a'; ctx.fillRect(pt.x - 5, pt.y - h * 0.66, 10, h * 0.18);
  ctx.fillRect(pt.x - 4, pt.y - h * 0.3, 8, h * 0.15);
  // rotating beam, sized to the tower's projected height so a distant
  // lighthouse throws a short beam instead of a searchlight across the sky
  const ang = t * 0.7;
  const beamLen = Math.max(60, h * 5);
  const beamHalf = Math.max(6, h * 0.45);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath(); ctx.moveTo(pt.x, pt.y - h);
  ctx.lineTo(pt.x + Math.cos(ang) * beamLen, pt.y - h + Math.sin(ang) * beamLen * 0.18 - beamHalf);
  ctx.lineTo(pt.x + Math.cos(ang) * beamLen, pt.y - h + Math.sin(ang) * beamLen * 0.18 + beamHalf);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// The KV-14 Fulmar, chase view: vermilion/ivory twin-prop, banked.
export function drawPlaneChase(ctx, cx, cy, scale, bankDeg, pitchDeg, flap, gearDown, propAngle, t) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(deg2rad(bankDeg));
  const S = scale;
  // wingtip condensation trails
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-118 * S, 6 * S); ctx.quadraticCurveTo(-160 * S, 14 * S, -205 * S, 26 * S); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(118 * S, 6 * S); ctx.quadraticCurveTo(160 * S, 14 * S, 205 * S, 26 * S); ctx.stroke();
  // wings (ivory top, vermilion tips) with root shadow + sunlit edge
  const wg = ctx.createLinearGradient(0, -4 * S, 0, 20 * S);
  wg.addColorStop(0, '#fff6e0'); wg.addColorStop(0.6, '#f2ead8'); wg.addColorStop(1, '#c9bda0');
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.moveTo(-14 * S, -4 * S); ctx.lineTo(-128 * S, 10 * S); ctx.lineTo(-128 * S, 20 * S); ctx.lineTo(-14 * S, 8 * S); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14 * S, -4 * S); ctx.lineTo(128 * S, 10 * S); ctx.lineTo(128 * S, 20 * S); ctx.lineTo(14 * S, 8 * S); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(-20 * S, -4 * S, 6 * S, 12 * S); ctx.fillRect(14 * S, -4 * S, 6 * S, 12 * S);
  ctx.fillStyle = '#d63c1e';
  ctx.fillRect(-128 * S, 10 * S, 14 * S, 10 * S); ctx.fillRect(114 * S, 10 * S, 14 * S, 10 * S);
  // flap deflection
  if (flap > 0) {
    ctx.fillStyle = '#c8bfa8';
    ctx.fillRect(-46 * S, 8 * S + flap * 0.25 * S, 32 * S, 5 * S);
    ctx.fillRect(14 * S, 8 * S + flap * 0.25 * S, 32 * S, 5 * S);
  }
  // tailplane
  ctx.fillStyle = '#d63c1e';
  ctx.beginPath(); ctx.moveTo(-8 * S, 34 * S); ctx.lineTo(-52 * S, 52 * S); ctx.lineTo(-52 * S, 60 * S); ctx.lineTo(-8 * S, 46 * S); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8 * S, 34 * S); ctx.lineTo(52 * S, 52 * S); ctx.lineTo(52 * S, 60 * S); ctx.lineTo(8 * S, 46 * S); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4 * S, 30 * S); ctx.lineTo(-4 * S, 62 * S); ctx.lineTo(6 * S, 62 * S); ctx.lineTo(6 * S, 30 * S); ctx.closePath(); ctx.fill();
  // fuselage, foreshortened three-quarter rear view: the nose is a
  // small rounded tip well short of the arch, the tail (nearest the
  // camera) is broad — shading is a side gradient, dark on the
  // shadow side, warm-lit on the sun side, with a spine highlight
  const fg = ctx.createLinearGradient(-12 * S, 0, 12 * S, 0);
  fg.addColorStop(0, '#8f1f0e'); fg.addColorStop(0.35, '#d63c1e'); fg.addColorStop(0.7, '#f0562a'); fg.addColorStop(1, '#f2ead8');
  ctx.fillStyle = fg;
  ctx.beginPath(); ctx.moveTo(0, -22 * S);
  ctx.quadraticCurveTo(11 * S, -6 * S, 13 * S, 14 * S);
  ctx.quadraticCurveTo(14 * S, 32 * S, 0, 40 * S);
  ctx.quadraticCurveTo(-14 * S, 32 * S, -13 * S, 14 * S);
  ctx.quadraticCurveTo(-11 * S, -6 * S, 0, -22 * S); ctx.fill();
  // belly shadow + spine highlight
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(-6 * S, 18 * S, 6 * S, 18 * S, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,160,0.75)'; ctx.lineWidth = 1.6 * S;
  ctx.beginPath(); ctx.moveTo(4 * S, -18 * S); ctx.quadraticCurveTo(8 * S, 4 * S, 5 * S, 30 * S); ctx.stroke();
  // side cheatline
  ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 2.4 * S;
  ctx.beginPath(); ctx.moveTo(-11 * S, 6 * S); ctx.quadraticCurveTo(-12 * S, 20 * S, -6 * S, 30 * S); ctx.stroke();
  // cockpit glass glow (small, set back from the nose tip)
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.ellipse(0, -10 * S, 5.5 * S, 8 * S, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.ellipse(-1.5 * S, -13 * S, 2 * S, 3 * S, 0, 0, Math.PI * 2); ctx.fill();
  // engine nacelles + spinning prop discs
  for (const sx of [-34, 34]) {
    ctx.fillStyle = '#b33218';
    ctx.beginPath(); ctx.ellipse(sx * S, -2 * S, 9 * S, 16 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(sx * S, -6 * S); ctx.rotate(propAngle);
    ctx.strokeStyle = 'rgba(240,240,240,0.55)'; ctx.lineWidth = 3 * S;
    ctx.beginPath(); ctx.moveTo(0, -26 * S); ctx.lineTo(0, 26 * S); ctx.moveTo(-26 * S, 0); ctx.lineTo(26 * S, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(sx * S, -6 * S, 3 * S, 0, Math.PI * 2); ctx.fill();
  }
  // nav lights
  ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff2a2a' : '#7a1010';
  ctx.beginPath(); ctx.arc(-128 * S, 15 * S, 3.5 * S, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2aff66';
  ctx.beginPath(); ctx.arc(128 * S, 15 * S, 3.5 * S, 0, Math.PI * 2); ctx.fill();
  // belly strobe + landing light cones
  ctx.fillStyle = Math.sin(t * 9) > 0.4 ? '#ffffff' : '#888888';
  ctx.beginPath(); ctx.arc(0, 30 * S, 3 * S, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,250,220,0.16)';
  ctx.beginPath(); ctx.moveTo(-6 * S, -20 * S); ctx.lineTo(-30 * S, -130 * S); ctx.lineTo(30 * S, -130 * S); ctx.lineTo(6 * S, -20 * S); ctx.closePath(); ctx.fill();
  // gear
  if (gearDown) {
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3 * S;
    ctx.beginPath(); ctx.moveTo(-9 * S, 30 * S); ctx.lineTo(-9 * S, 46 * S); ctx.moveTo(9 * S, 30 * S); ctx.lineTo(9 * S, 46 * S); ctx.moveTo(0, 38 * S); ctx.lineTo(0, 50 * S); ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-9 * S, 48 * S, 4 * S, 0, Math.PI * 2); ctx.arc(9 * S, 48 * S, 4 * S, 0, Math.PI * 2); ctx.arc(0, 52 * S, 3.5 * S, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function renderScene(ctx, W, H, world, plane, camera, t, view) {
  const pal = world.sortie.palette;
  sky(ctx, W, H, pal, t);
  const horizonY = H * 0.52;
  ridgeLayer(ctx, W, H, horizonY, world.seed % 10 + 1, '#3a2c4a', 46, 30);
  ridgeLayer(ctx, W, H, horizonY, world.seed % 7 + 3, '#241d2e', 70, 8);
  // sea: teal gradient below horizon, with perspective wave lines
  // (spacing widens toward the camera) and a sunset specular lane
  const sea = ctx.createLinearGradient(0, horizonY, 0, H);
  sea.addColorStop(0, pal.sea); sea.addColorStop(0.55, '#0e3a55'); sea.addColorStop(1, '#0b2233');
  ctx.fillStyle = sea; ctx.fillRect(0, horizonY, W, H - horizonY);
  // sunset specular reflection: shimmering orange dashes under the sun
  const sunX = W * 0.62;
  for (let r = 0; r < 9; r++) {
    const yy = horizonY + 8 + r * r * 1.1 + r * 6;
    if (yy > H - 8) break;
    const half = 18 + r * 16;
    ctx.strokeStyle = `rgba(255,${150 + r * 6},70,${0.55 - r * 0.045})`;
    ctx.lineWidth = 2 + r * 0.35;
    ctx.beginPath();
    for (let x = sunX - half; x <= sunX + half; x += 12) {
      const wob = Math.sin(x * 0.09 + t * 2 + r) * 3;
      x === sunX - half ? ctx.moveTo(x, yy + wob) : ctx.lineTo(x, yy + wob);
    }
    ctx.stroke();
  }
  // perspective swell lines: long low arcs, closer = wider + brighter
  for (let r = 0; r < 10; r++) {
    const yy = horizonY + 6 + r * r * 1.6 + r * 9;
    if (yy > H - 4) break;
    ctx.strokeStyle = `rgba(170,220,240,${0.10 + r * 0.028})`;
    ctx.lineWidth = 1 + r * 0.22;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 26) {
      const y = yy + Math.sin(x * 0.008 + r * 1.3 + t * 0.6) * (2 + r * 0.9);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // ice floes: faceted polygons with a lit top edge, not flat ovals
  for (let i = 0; i < 9; i++) {
    const fx = ((i * 173 + world.seed) % W), fy = horizonY + 40 + ((i * 67) % 180);
    const fw = 26 + (i % 3) * 12, fh = 7 + (i % 2) * 3;
    ctx.fillStyle = 'rgba(190,225,235,0.5)';
    ctx.beginPath();
    ctx.moveTo(fx - fw, fy); ctx.lineTo(fx - fw * 0.4, fy - fh); ctx.lineTo(fx + fw * 0.5, fy - fh * 0.7);
    ctx.lineTo(fx + fw, fy + fh * 0.4); ctx.lineTo(fx + fw * 0.3, fy + fh); ctx.lineTo(fx - fw * 0.5, fy + fh * 0.6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(fx - fw * 0.4, fy - fh); ctx.lineTo(fx + fw * 0.5, fy - fh * 0.7); ctx.stroke();
  }
  const cam = { x: plane.x - Math.sin(deg2rad(plane.hdg)) * 26, z: plane.z - Math.cos(deg2rad(plane.hdg)) * 26, alt: plane.alt + 14, hdg: plane.hdg, pitch: plane.pitch };
  if (view === 'cockpit') {
    cam.x = plane.x; cam.z = plane.z; cam.alt = plane.alt;
  }
  drawArch(ctx, world, cam, W, H, t);
  drawLighthouse(ctx, world, cam, W, H, t);
  drawRunway(ctx, world, cam, W, H, t);
  // beacon rings (next gates first)
  world.gates.forEach((g, i) => {
    if (g.hit) return;
    const pt = project(g.x, g.z, g.alt, cam, W, H);
    drawRing(ctx, pt, g.r, i === world.gates.findIndex(gg => !gg.hit) ? '#ffb62e' : '#37c8e8', t);
  });
  // thermal plume particles (sortie 2): a rising column anchored under
  // the next beacon ring, so the updraft reads as one thermal, not scatter
  if (world.sortie.id === 2) {
    const next = world.gates.find(gg => !gg.hit);
    const gp = next ? project(next.x, next.z, next.alt, cam, W, H) : null;
    const px0 = gp ? gp.x : W * 0.5;
    const pyTop = gp ? gp.y : H * 0.45;
    const glow = ctx.createRadialGradient(px0, pyTop + 90, 4, px0, pyTop + 90, 130);
    glow.addColorStop(0, 'rgba(255,140,40,0.35)');
    glow.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px0 - 130, pyTop - 40, 260, 260);
    ctx.fillStyle = 'rgba(255,150,50,0.55)';
    for (let i = 0; i < 16; i++) {
      const rise = (t * 55 + i * 34) % 210;
      const px = px0 + Math.sin(t * 1.3 + i * 1.7) * 34 + (i % 5 - 2) * 12;
      const py = pyTop + 200 - rise;
      const rr = 2.5 + (i % 3) + rise * 0.008;
      ctx.globalAlpha = 0.75 - rise / 320;
      ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (plane.onGround) {
    // runway plateau under the wheels: wet basalt asphalt + flare lines
    ctx.fillStyle = '#2e2a30'; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    ctx.fillStyle = '#3a3438'; ctx.fillRect(0, H * 0.72, W, 10);
    for (let i = 0; i < 10; i++) {
      const fx = (i / 9) * W;
      ctx.fillStyle = `rgba(255,140,30,${0.6 + 0.4 * Math.sin(t * 6 + i)})`;
      ctx.beginPath(); ctx.arc(fx, H * 0.74, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 6; i++) ctx.fillRect(W * 0.5 - 4, H * 0.76 + i * 14, 8, 8);
  }
  if (view === 'chase') {
    const bob = plane.buffet * Math.sin(t * 31) * 3;
    const px = W * (plane.chaseX ?? 0.5), py = H * (plane.chaseY ?? 0.66) + bob;
    drawPlaneChase(ctx, px, py, plane.chaseScale ?? 1.05, plane.bank, plane.pitch, plane.flap, plane.gearDown, plane.propAngle, t);
  }
  return cam;
}

// Cockpit frame: matte pillars, glareshield, wing struts and spinning props.
export function drawCockpitFrame(ctx, W, H, plane, t) {
  ctx.save();
  // side pillars: wide, dark matte canopy pillars with a warm inner
  // edge highlight — they frame the windshield, never read as thin bars
  const pilGrad = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  pilGrad.addColorStop(0, '#1c181d'); pilGrad.addColorStop(1, '#0b090c');
  ctx.fillStyle = pilGrad;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.135, 0); ctx.lineTo(W * 0.095, H * 0.62); ctx.lineTo(0, H * 0.62); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W * 0.865, 0); ctx.lineTo(W * 0.905, H * 0.62); ctx.lineTo(W, H * 0.62); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,90,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W * 0.135, 0); ctx.lineTo(W * 0.095, H * 0.62); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.865, 0); ctx.lineTo(W * 0.905, H * 0.62); ctx.stroke();
  // rivet dots down each pillar
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.arc(W * (0.115 - i * 0.004), H * (0.06 + i * 0.09), 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * (0.885 + i * 0.004), H * (0.06 + i * 0.09), 1.6, 0, Math.PI * 2); ctx.fill();
  }
  // top bar
  const topGrad = ctx.createLinearGradient(0, 0, 0, 12);
  topGrad.addColorStop(0, '#2b2830'); topGrad.addColorStop(1, '#17151a');
  ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, 10);
  // centre pillar: tapered post (wider at the roof, narrow at the base)
  // with a soft edge highlight so it reads as structure, not a glitch bar
  const cpGrad = ctx.createLinearGradient(W / 2 - 10, 0, W / 2 + 10, 0);
  cpGrad.addColorStop(0, '#241f26'); cpGrad.addColorStop(0.5, '#38333d'); cpGrad.addColorStop(1, '#241f26');
  ctx.fillStyle = cpGrad;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 11, 0); ctx.lineTo(W / 2 + 11, 0);
  ctx.lineTo(W / 2 + 5, H * 0.26); ctx.lineTo(W / 2 - 5, H * 0.26);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,90,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2 - 11, 0); ctx.lineTo(W / 2 - 5, H * 0.26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 + 11, 0); ctx.lineTo(W / 2 + 5, H * 0.26); ctx.stroke();
  // overhead compass hanging at the foot of the centre pillar
  ctx.fillStyle = '#0e0d12';
  ctx.beginPath(); ctx.arc(W / 2, H * 0.26 + 13, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffb62e'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#ffe9a8'; ctx.font = "700 9px 'Courier New', monospace";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(plane.hdg)).padStart(3, '0'), W / 2, H * 0.26 + 13);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // frost crystals in corners
  ctx.fillStyle = 'rgba(220,240,255,0.45)';
  for (let i = 0; i < 12; i++) {
    ctx.beginPath(); ctx.arc(W * 0.02 + (i % 4) * 9, H * 0.06 + Math.floor(i / 4) * 9, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  // wing struts + prop discs visible through side glass
  for (const side of [0, 1]) {
    const x0 = side === 0 ? W * 0.06 : W * 0.94;
    const x1 = side === 0 ? W * 0.24 : W * 0.76;
    ctx.strokeStyle = '#4a4238'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, H * 0.55); ctx.lineTo(x1, H * 0.42); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,160,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, H * 0.55 - 2); ctx.lineTo(x1, H * 0.42 - 2); ctx.stroke();
  }
  for (const px of [W * 0.17, W * 0.83]) {
    // engine nacelle behind the prop disc: a dark cowling with a warm
    // top highlight and an intake, so the disc is mounted on something
    const nx = px, ny = H * 0.44;
    const nGrad = ctx.createLinearGradient(nx - 26, ny, nx + 26, ny);
    nGrad.addColorStop(0, '#241a16'); nGrad.addColorStop(0.5, '#4a3428'); nGrad.addColorStop(1, '#1a1210');
    ctx.fillStyle = nGrad;
    ctx.beginPath(); ctx.ellipse(nx, ny + 6, 30, 52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,90,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(nx, ny + 6, 30, 52, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.fillStyle = '#0d0a08';
    ctx.beginPath(); ctx.ellipse(nx, ny + 34, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
    // translucent spinning disc, not a bare cross
    const disc = ctx.createRadialGradient(px, H * 0.44, 2, px, H * 0.44, 46);
    disc.addColorStop(0, 'rgba(240,240,240,0.20)');
    disc.addColorStop(0.75, 'rgba(240,240,240,0.08)');
    disc.addColorStop(1, 'rgba(240,240,240,0)');
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(px, H * 0.44, 46, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(px, H * 0.44); ctx.rotate(plane.propAngle);
    ctx.strokeStyle = 'rgba(240,240,240,0.35)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -40); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(px, H * 0.44, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,90,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px, H * 0.44, 46, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// Lit analogue-glass dashboard filling the bottom third of a cockpit view.
// All needles read the same live plane state as the HUD tapes.
// labelFmt: how tick values are printed — altimeters use hundreds
// ("0","5","10","15","20") so the numerals never collide on a small dial.
function dial(ctx, cx, cy, r, value, max, label, digital, labelFmt) {
  ctx.save();
  ctx.fillStyle = '#0d1119';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a4152'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,190,90,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, Math.PI * 2); ctx.stroke();
  const a0 = -210, sweep = 240;
  ctx.fillStyle = '#9fd8ff'; ctx.font = "400 7px 'Courier New', monospace";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let v = 0; v <= max; v += max / 5) {
    const a = (a0 + (v / max) * sweep) * Math.PI / 180;
    const x1 = cx + Math.sin(a) * (r - 8), y1 = cy - Math.cos(a) * (r - 8);
    const x2 = cx + Math.sin(a) * (r - 15), y2 = cy - Math.cos(a) * (r - 15);
    ctx.strokeStyle = '#cfe6ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // labels sit on a wider radius with a small font and short text so
    // neighbouring numerals keep clear space between them
    const lx = cx + Math.sin(a) * (r - 25), ly = cy - Math.cos(a) * (r - 25);
    ctx.fillText(labelFmt ? labelFmt(v) : String(v), lx, ly);
  }
  const na = (a0 + Math.max(0, Math.min(1, value / max)) * sweep) * Math.PI / 180;
  ctx.strokeStyle = '#ffb62e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(na) * (r - 16), cy - Math.cos(na) * (r - 16)); ctx.stroke();
  ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7fe3ff'; ctx.font = "700 15px 'Courier New', monospace";
  ctx.fillText(digital, cx, cy + r * 0.42);
  ctx.fillStyle = '#8fb8d8'; ctx.font = "700 9px 'Courier New', monospace";
  ctx.fillText(label, cx, cy + r * 0.68);
  ctx.restore();
}

export function drawCockpitDashboard(ctx, W, H, plane, t) {
  const top = H * 0.66;
  ctx.save();
  // glareshield: dark matte panel with a gently curved top lip
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, '#1b1a21'); g.addColorStop(0.25, '#121118'); g.addColorStop(1, '#0a0910');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, H); ctx.lineTo(0, top + 14);
  ctx.quadraticCurveTo(W * 0.5, top - 16, W, top + 14);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,90,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, top + 14); ctx.quadraticCurveTo(W * 0.5, top - 16, W, top + 14); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, top + 26); ctx.quadraticCurveTo(W * 0.5, top - 4, W, top + 26); ctx.stroke();
  // placard on the glareshield lip
  ctx.fillStyle = '#8fb8d8'; ctx.font = "700 10px 'Courier New', monospace";
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('KV-14 FULMAR', W / 2, top + 2);
  ctx.textAlign = 'left';
  // airspeed + altimeter (altimeter ticks in hundreds of feet: "0 5 10
  // 15 20" — the full 4-digit numerals collided on the small dial)
  dial(ctx, 150, 552, 46, plane.ias, 200, 'AIRSPEED KT', String(Math.round(plane.ias)));
  dial(ctx, 292, 552, 46, plane.alt, 2000, 'ALT x100', String(Math.round(plane.alt)), (v) => String(v / 100));
  // attitude indicator (bank + pitch)
  const ax = 640, ay = 552, ar = 52;
  ctx.save();
  ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip();
  ctx.translate(ax, ay); ctx.rotate(-plane.bank * Math.PI / 180); ctx.translate(0, plane.pitch * 2.2);
  ctx.fillStyle = '#2a6db0'; ctx.fillRect(-ar, -ar * 2, ar * 2, ar * 2);
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(-ar, 0, ar * 2, ar * 2);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-ar, 0); ctx.lineTo(ar, 0); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(ax, ay);
  ctx.strokeStyle = '#ffb62e'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, ar, 0, Math.PI * 2); ctx.stroke();
  // fixed aircraft symbol
  ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(26, 0); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fillStyle = '#ffe9a8'; ctx.fill();
  // bank pointer
  ctx.fillStyle = '#ffb62e';
  ctx.beginPath(); ctx.moveTo(0, -ar + 2); ctx.lineTo(-6, -ar + 12); ctx.lineTo(6, -ar + 12); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#8fb8d8'; ctx.font = "700 9px 'Courier New', monospace";
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('ATTITUDE', ax, ay + ar + 8);
  ctx.textAlign = 'left';
  // engine torque bars + fuel
  const bars = [['ENG L', plane.engL], ['ENG R', plane.engR]];
  bars.forEach(([label, val], i) => {
    const bx = 838 + i * 56, by = 506, bh = 82, bw = 24;
    ctx.fillStyle = '#0d1119';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3); ctx.fill();
    ctx.strokeStyle = '#3a4152'; ctx.lineWidth = 1.5; ctx.stroke();
    const fh = (bh - 6) * Math.max(0, Math.min(1, val / 100));
    const fg = ctx.createLinearGradient(0, by + bh, 0, by);
    fg.addColorStop(0, '#ff8c1e'); fg.addColorStop(1, '#ffd98a');
    ctx.fillStyle = fg;
    ctx.fillRect(bx + 3, by + bh - 3 - fh, bw - 6, fh);
    ctx.fillStyle = '#7fe3ff'; ctx.font = "700 12px 'Courier New', monospace";
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(`${Math.round(val)}%`, bx + bw / 2, by + bh + 6);
    ctx.fillStyle = '#8fb8d8'; ctx.font = "700 9px 'Courier New', monospace";
    ctx.fillText(label, bx + bw / 2, by + bh + 22);
    ctx.textAlign = 'left';
  });
  ctx.fillStyle = '#fff'; ctx.font = "700 13px 'Courier New', monospace";
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(`FUEL ${plane.fuel.toFixed(1)} GAL`, 894, 624);
  ctx.textAlign = 'left';
  // annunciator strip under the V-SCOPE
  ctx.fillStyle = 'rgba(8,12,20,0.85)';
  ctx.beginPath(); ctx.roundRect(W - 322, H - 58, 310, 44, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#7fe3ff'; ctx.font = "700 12px 'Courier New', monospace";
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(`VSI ${plane.vs >= 0 ? '+' : ''}${Math.round(plane.vs)} FPM · FLAPS ${plane.flap === 0 ? 'UP' : plane.flap + '°'} · GEAR ${plane.gearDown ? 'DN' : 'UP'}`, W - 167, H - 44);
  ctx.textAlign = 'left';
  ctx.restore();
}
