// HUD: eight perimeter zones — compass tape, airspeed tape, altitude tape,
// score card, banner, radio strip, bottom binnacle, V-SCOPE panel.
import { clamp } from './rng.js';

function text(ctx, s, x, y, size, color, align = 'left', bold = true) {
  ctx.font = `${bold ? '700' : '400'} ${size}px 'Courier New', monospace`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillText(s, x, y);
}
function panel(ctx, x, y, w, h, fill = 'rgba(8,12,20,0.72)') {
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
}
const fmt = (n) => n.toLocaleString('en-US');

export function drawHud(ctx, W, H, g) {
  const p = g.plane, s = g.sortie, w = g.world;
  const nextGate = w.gates.findIndex(gg => !gg.hit);
  const gateLabel = nextGate < 0 ? `${w.gates.length}/${w.gates.length}` : `${String(nextGate + 1).padStart(2, '0')}/${String(w.gates.length).padStart(2, '0')}`;
  const stall = 56 + (p.flap === 0 ? 12 : p.flap === 15 ? 6 : 0) + p.rime * 0.14;
  const distNm = Math.max(0, Math.hypot(w.runway.x - p.x, w.runway.z0 - p.z) / 1852);
  const wind = `WIND ${String(s.windDir).padStart(3, '0')}° / ${s.windKt} KT G${s.windKt + s.gustKt}`;

  // --- top banner ---
  const banner = g.banner;
  if (banner) {
    const bw = Math.min(W * 0.72, 760);
    const bx = (W - bw) / 2;
    ctx.fillStyle = banner.color;
    ctx.beginPath(); ctx.roundRect(bx, 10, bw, 34, 5); ctx.fill();
    // hazard stripes
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = bx + 6; x < bx + bw - 6; x += 22) { ctx.fillRect(x, 12, 8, 4); ctx.fillRect(x, 38, 8, 4); }
    text(ctx, banner.text, W / 2, 17, 15, '#fff', 'center');
    if (banner.progress != null) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(bx + 14, 46, bw - 28, 5);
      ctx.fillStyle = '#ffb62e'; ctx.fillRect(bx + 14, 46, (bw - 28) * clamp(banner.progress, 0, 1), 5);
    }
  }
  // --- compass top-left ---
  panel(ctx, 12, 54, 300, 74);
  text(ctx, `HDG ${String(Math.round(p.hdg)).padStart(3, '0')}°`, 22, 60, 20, '#7fe3ff');
  text(ctx, `BUG ${String(w.runwayHdg).padStart(3, '0')}° · ${distNm.toFixed(2)} NM`, 22, 84, 13, '#ffd98a', 'left', false);
  text(ctx, `SORTIE ${String(s.id).padStart(2, '0')}/05 · ${s.name.toUpperCase()}`, 22, 104, 13, '#fff');
  text(ctx, `GATE ${gateLabel}`, 240, 60, 16, '#ffb62e', 'left');
  // compass strip
  ctx.fillStyle = '#0a1420'; ctx.fillRect(22, 122, 280, 4);
  ctx.fillStyle = '#ffb62e'; ctx.fillRect(22 + ((p.hdg % 360) / 360) * 280 - 2, 118, 4, 12);

  // --- airspeed tape left ---
  panel(ctx, 12, 150, 150, 150);
  text(ctx, 'IAS', 22, 156, 12, '#8fb8d8', 'left', false);
  text(ctx, `${String(Math.round(p.ias)).padStart(3, '0')} KT`, 22, 174, 22, p.stallWarn ? '#ff5a4a' : '#7fe3ff');
  text(ctx, `STALL ${Math.round(stall)} KT`, 22, 204, 12, '#ff9a8a', 'left', false);
  text(ctx, `GS ${String(Math.round(Math.max(0, p.ias - 20))).padStart(3, '0')} KT`, 22, 224, 13, '#fff', 'left', false);
  text(ctx, wind, 22, 246, 12, '#ffd98a', 'left', false);
  text(ctx, `FLAPS ${p.flap}° · GEAR ${p.gearDown ? 'DN' : 'UP'}`, 22, 266, 12, '#fff', 'left', false);

  // --- altitude tape right ---
  panel(ctx, W - 162, 150, 150, 150);
  text(ctx, 'ALT', W - 152, 156, 12, '#8fb8d8', 'left', false);
  text(ctx, `${String(Math.round(p.alt)).padStart(3, '0')} FT`, W - 152, 174, 22, '#7fe3ff');
  text(ctx, `RAD ${String(Math.round(Math.max(0, p.alt - w.terrainHeight(p.x, p.z)))).padStart(3, '0')} FT`, W - 152, 204, 12, '#fff', 'left', false);
  text(ctx, `VSI ${p.vs >= 0 ? '+' : ''}${Math.round(p.vs)} FPM`, W - 152, 224, 13, p.vs < -600 ? '#ff5a4a' : '#fff', 'left', false);
  text(ctx, 'TERR CLEAR', W - 152, 246, 12, '#39ff88', 'left', false);
  text(ctx, `FUEL ${p.fuel.toFixed(1)} GAL`, W - 152, 266, 12, p.fuel < 8 ? '#ff5a4a' : '#fff', 'left', false);

  // --- score card top-right ---
  panel(ctx, W - 312, 54, 300, 88);
  text(ctx, `SCORE ${fmt(Math.round(p.score))} (x${p.mult.toFixed(1)})`, W - 302, 60, 17, '#ffd98a');
  text(ctx, s.payload, W - 302, 84, 12, '#fff', 'left', false);
  text(ctx, `OAT ${s.oat}°C · QNH ${s.qnh} hPa · VIS ${s.visNm} NM`, W - 302, 104, 12, '#fff', 'left', false);
  text(ctx, `RIME ${Math.round(p.rime)}% · DE-ICE ${p.deice ? 'ON' : 'OFF'}`, W - 302, 122, 12, p.rime > 25 ? '#ff9a8a' : '#39ff88', 'left', false);

  // --- radio strip bottom-left ---
  panel(ctx, 12, H - 118, 430, 56);
  text(ctx, 'CAPT. MAREN LIND · FULMAR-4', 22, H - 112, 12, '#8fb8d8');
  const msg = g.radioMsg || '';
  ctx.font = "400 12px 'Courier New', monospace"; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  wrapText(ctx, msg, 22, H - 94, 410, 15);
  // --- bottom binnacle ---
  const bw = 340, bx = (W - bw) / 2, by = H - 96;
  panel(ctx, bx, by, bw, 84);
  // attitude ball
  ctx.save();
  ctx.beginPath(); ctx.arc(bx + 46, by + 42, 30, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#2a6db0'; ctx.fillRect(bx + 16, by + 12, 60, 30);
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(bx + 16, by + 42, 60, 30);
  ctx.restore();
  ctx.save(); ctx.translate(bx + 46, by + 42); ctx.rotate(-p.bank * Math.PI / 180);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = '#ffb62e'; ctx.beginPath(); ctx.arc(bx + 46, by + 42, 30, 0, Math.PI * 2); ctx.stroke();
  text(ctx, `ENG L ${Math.round(p.engL)}%`, bx + 92, by + 10, 13, '#7fe3ff');
  text(ctx, `ENG R ${Math.round(p.engR)}%`, bx + 92, by + 30, 13, '#7fe3ff');
  text(ctx, `FUEL ${p.fuel.toFixed(1)} GAL`, bx + 92, by + 50, 13, '#fff', 'left', false);
  const ann = [`FLAP ${p.flap}`, p.gearDown ? 'GEAR' : 'GEAR UP', p.deice ? 'DE-ICE' : '—', 'X-WIND'];
  ann.forEach((a, i) => {
    ctx.fillStyle = i === 1 && !p.gearDown ? 'rgba(255,90,74,0.85)' : 'rgba(57,255,136,0.25)';
    ctx.beginPath(); ctx.roundRect(bx + 208 + i * 32, by + 12, 28, 22, 3); ctx.fill();
    text(ctx, a.split(' ')[0], bx + 222 + i * 32, by + 17, 8, '#fff', 'center', false);
  });
  text(ctx, p.stallWarn ? 'STALL!' : 'TRIM OK', bx + 208, by + 52, 12, p.stallWarn ? '#ff5a4a' : '#39ff88');
}

function wrapText(ctx, s, x, y, maxW, lh) {
  const words = s.split(' '); let line = '', yy = y;
  for (const wd of words) {
    if (ctx.measureText(line + wd).width > maxW && line) { ctx.fillText(line, x, yy); line = ''; yy += lh; }
    line += wd + ' ';
  }
  ctx.fillText(line, x, yy);
}
