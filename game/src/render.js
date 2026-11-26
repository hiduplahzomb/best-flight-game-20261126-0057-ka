// Pseudo-3D renderer: gradient dusk sky, aurora band, layered ridge silhouettes,
// projected terrain strips, sea arch, lighthouse beam, runway flare line,
// beacon rings, and the KV-14 Fulmar drawn as a vector twin-prop.
import { clamp, lerp, deg2rad } from './rng.js';

function sky(ctx, W, H, pal, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  g.addColorStop(0, pal.skyTop); g.addColorStop(0.55, pal.skyMid); g.addColorStop(1, pal.horizon);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.62);
  // aurora band
  ctx.save(); ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#59e89a'; ctx.lineWidth = 7; ctx.beginPath();
  for (let x = 0; x <= W; x += 16) {
    const y = H * 0.10 + Math.sin(x * 0.008 + t * 0.4) * 14 + Math.sin(x * 0.02) * 6;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.restore();
  // sun glow at horizon
  const sg = ctx.createRadialGradient(W * 0.62, H * 0.58, 4, W * 0.62, H * 0.58, 260);
  sg.addColorStop(0, 'rgba(255,190,90,0.85)'); sg.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H * 0.7);
  // ash wall on the horizon (storm front)
  ctx.fillStyle = 'rgba(60,12,16,0.55)';
  ctx.beginPath(); ctx.moveTo(0, H * 0.52);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H * 0.52 - Math.sin(x * 0.01 + t * 0.2) * 10 - 18);
  ctx.lineTo(W, H * 0.62); ctx.lineTo(0, H * 0.62); ctx.closePath(); ctx.fill();
  // volcano glow
  const vg = ctx.createRadialGradient(W * 0.78, H * 0.50, 2, W * 0.78, H * 0.50, 120);
  vg.addColorStop(0, 'rgba(255,60,20,0.9)'); vg.addColorStop(1, 'rgba(255,60,20,0)');
  ctx.fillStyle = vg; ctx.fillRect(W * 0.6, H * 0.3, W * 0.4, H * 0.3);
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
  if (th) {
    ctx.fillStyle = Math.sin(t * 8) > 0 ? '#39ff88' : '#1d8a4a';
    ctx.shadowColor = '#39ff88'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(th.x - 14, th.y, 6, 0, Math.PI * 2); ctx.arc(th.x + 14, th.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
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
  ctx.fillStyle = '#1c171d';
  ctx.beginPath();
  ctx.moveTo(cx - span / 2, cy);
  ctx.lineTo(cx - span / 2, cy - hgt * 0.55);
  ctx.quadraticCurveTo(cx, cy - hgt * 1.25, cx + span / 2, cy - hgt * 0.55);
  ctx.lineTo(cx + span / 2, cy);
  ctx.lineTo(cx + span * 0.28, cy);
  ctx.lineTo(cx + span * 0.28, cy - hgt * 0.5);
  ctx.quadraticCurveTo(cx, cy - hgt * 0.95, cx - span * 0.28, cy - hgt * 0.5);
  ctx.lineTo(cx - span * 0.28, cy);
  ctx.closePath(); ctx.fill();
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
  // wings (ivory top, vermilion tips)
  ctx.fillStyle = '#f2ead8';
  ctx.beginPath(); ctx.moveTo(-14 * S, -4 * S); ctx.lineTo(-128 * S, 10 * S); ctx.lineTo(-128 * S, 20 * S); ctx.lineTo(-14 * S, 8 * S); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14 * S, -4 * S); ctx.lineTo(128 * S, 10 * S); ctx.lineTo(128 * S, 20 * S); ctx.lineTo(14 * S, 8 * S); ctx.closePath(); ctx.fill();
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
  // fuselage: vermilion back, ivory belly
  const fg = ctx.createLinearGradient(0, -30 * S, 0, 34 * S);
  fg.addColorStop(0, '#e8491f'); fg.addColorStop(0.6, '#d63c1e'); fg.addColorStop(1, '#f2ead8');
  ctx.fillStyle = fg;
  ctx.beginPath(); ctx.moveTo(0, -34 * S);
  ctx.quadraticCurveTo(13 * S, -10 * S, 12 * S, 16 * S);
  ctx.quadraticCurveTo(11 * S, 34 * S, 0, 40 * S);
  ctx.quadraticCurveTo(-11 * S, 34 * S, -12 * S, 16 * S);
  ctx.quadraticCurveTo(-13 * S, -10 * S, 0, -34 * S); ctx.fill();
  // cockpit glass glow
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.ellipse(0, -18 * S, 7 * S, 11 * S, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.ellipse(-2 * S, -22 * S, 2.5 * S, 4 * S, 0, 0, Math.PI * 2); ctx.fill();
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
  ctx.beginPath(); ctx.moveTo(-8 * S, -30 * S); ctx.lineTo(-34 * S, -150 * S); ctx.lineTo(34 * S, -150 * S); ctx.lineTo(8 * S, -30 * S); ctx.closePath(); ctx.fill();
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
  // sea: teal gradient below horizon
  const sea = ctx.createLinearGradient(0, horizonY, 0, H);
  sea.addColorStop(0, pal.sea); sea.addColorStop(1, '#0b2233');
  ctx.fillStyle = sea; ctx.fillRect(0, horizonY, W, H - horizonY);
  // ice floes
  ctx.fillStyle = 'rgba(190,225,235,0.5)';
  for (let i = 0; i < 9; i++) {
    const fx = ((i * 173 + world.seed) % W), fy = horizonY + 40 + ((i * 67) % 180);
    ctx.beginPath(); ctx.ellipse(fx, fy, 26 + (i % 3) * 12, 7, 0.2, 0, Math.PI * 2); ctx.fill();
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
  // side pillars: tapered matte charcoal with a warm inner edge highlight
  const pilGrad = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  pilGrad.addColorStop(0, '#2b2830'); pilGrad.addColorStop(1, '#141216');
  ctx.fillStyle = pilGrad;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.11, 0); ctx.lineTo(W * 0.075, H * 0.62); ctx.lineTo(0, H * 0.62); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W * 0.89, 0); ctx.lineTo(W * 0.925, H * 0.62); ctx.lineTo(W, H * 0.62); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,90,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W * 0.11, 0); ctx.lineTo(W * 0.075, H * 0.62); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.89, 0); ctx.lineTo(W * 0.925, H * 0.62); ctx.stroke();
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
function dial(ctx, cx, cy, r, value, max, label, digital) {
  ctx.save();
  ctx.fillStyle = '#0d1119';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a4152'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,190,90,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, Math.PI * 2); ctx.stroke();
  const a0 = -210, sweep = 240;
  ctx.fillStyle = '#9fd8ff'; ctx.font = "400 8px 'Courier New', monospace";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let v = 0; v <= max; v += max / 5) {
    const a = (a0 + (v / max) * sweep) * Math.PI / 180;
    const x1 = cx + Math.sin(a) * (r - 8), y1 = cy - Math.cos(a) * (r - 8);
    const x2 = cx + Math.sin(a) * (r - 15), y2 = cy - Math.cos(a) * (r - 15);
    ctx.strokeStyle = '#cfe6ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const lx = cx + Math.sin(a) * (r - 24), ly = cy - Math.cos(a) * (r - 24);
    ctx.fillText(String(v), lx, ly);
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
  // airspeed + altimeter
  dial(ctx, 150, 552, 46, plane.ias, 200, 'AIRSPEED KT', String(Math.round(plane.ias)));
  dial(ctx, 292, 552, 46, plane.alt, 2000, 'ALT FT', String(Math.round(plane.alt)));
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
