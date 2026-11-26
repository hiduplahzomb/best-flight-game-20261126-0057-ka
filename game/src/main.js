// Skarv Sound: Flare-Line Airlift — main game loop, screens, scoring, gates.
import { SORTIES, PILOT, CALLSIGN, AIRCRAFT } from './sorties.js';
import { makeWorld } from './world.js';
import { newPlane, stepPhysics, evaluateTouchdown, gradeFrom, DT, stallSpeedKt } from './physics.js';
import { renderScene, drawCockpitFrame, drawCockpitDashboard } from './render.js';
import { drawHud } from './hud.js';
import { drawVScope } from './vscope.js';
import { createAudio } from './audio.js';
import { createInput, CONTROLS_TEXT } from './input.js';
import { SHOT_STAGES, runAutopilot } from './shots.js';
import { clamp } from './rng.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 1280, H = 720;
canvas.width = W; canvas.height = H;

const audio = createAudio();
const input = createInput();

const game = {
  sortie: SORTIES[3], world: null, plane: null,
  screen: 'title', view: 'chase', paused: false,
  banner: null, radioMsg: '', debrief: null, t: 0,
  frozen: false, radioIdx: 0, radioTimer: 0,
};

function startSortie(idx, seed) {
  game.sortie = SORTIES[idx];
  game.world = makeWorld(game.sortie, seed ?? (100 + idx * 103));
  game.plane = newPlane(game.sortie);
  { const q = game.world.at(600, 0); game.plane.x = q.x; game.plane.z = q.z; game.plane.hdg = game.world.runwayHdg; }
  game.screen = 'play'; game.view = 'chase'; game.debrief = null;
  game.banner = { text: `SORTIE ${String(game.sortie.id).padStart(2, '0')}/05 · ${game.sortie.name.toUpperCase()} — CLEAR ${game.sortie.gates} GATES, LAND ${game.sortie.rwy}`, color: '#2a3a5e', progress: 1 };
  game.radioIdx = 0; game.radioTimer = 0;
  game.radioMsg = game.sortie.radio[0].who + ': "' + game.sortie.radio[0].text + '"';
  audio.squelch();
}

game.world = makeWorld(SORTIES[0], 101);
game.plane = newPlane(SORTIES[0]);
{ const q = game.world.at(1800, 200); game.plane.x = q.x; game.plane.z = q.z; game.plane.hdg = 92; game.plane.alt = 520; }
game.banner = { text: 'SKARV SOUND FLIGHT WATCH — STORM FRONT ETA 04:00 · STANDBY FOR LAUNCH', color: '#2a3a5e', progress: 1 };
game.radioMsg = SORTIES[0].radio[0].who + ': "' + SORTIES[0].radio[0].text + '"';

game.checkGates = function () {
  const p = game.plane, w = game.world;
  w.gates.forEach((g, i) => {
    if (g.hit) return;
    const d = Math.hypot(g.x - p.x, g.z - p.z);
    if (d < g.r + 14 && Math.abs(p.alt - g.alt) < 260) {
      g.hit = true; p.gatesHit++;
      p.score += Math.round(1200 * p.mult);
      p.mult = Math.min(3, p.mult + 0.2);
      audio.chime();
    }
  });
};

function update(dt) {
  game.t += dt;
  const p = game.plane;
  if (game.screen !== 'play' || game.paused || game.frozen) return;
  const raw = input.read();
  // throttle is a rate in live play
  if (raw.throttle !== 0) p.throttle = clamp(p.throttle + raw.throttle * dt * 0.5, 0, 1);
  p.brake = raw.brake;
  if (p.onGround && raw.brake) { p.reverse = true; p.ias = Math.max(0, p.ias - 26 * dt); }
  else p.reverse = false;
  const wind = game.world.windAt(p.x, p.z, p.timeS);
  stepPhysics(p, { pitch: raw.pitch, roll: raw.roll, yaw: raw.yaw, throttle: p.throttle, brake: raw.brake }, game.sortie, wind, dt);
  audio.update(p);
  if (p.stallWarn) audio.stallHorn(true);
  // radio rotation
  game.radioTimer += dt;
  if (game.radioTimer > 14) {
    game.radioTimer = 0;
    game.radioIdx = (game.radioIdx + 1) % game.sortie.radio.length;
    const r = game.sortie.radio[game.radioIdx];
    game.radioMsg = r.who + ': "' + r.text + '"';
    audio.squelch();
  }
  game.checkGates();
  // terrain collision
  const terr = game.world.terrainHeight(p.x, p.z);
  const rwy = game.world.runway;
  const tr = game.world.toTrack(p.x, p.z);
  const nearRwy = Math.abs(tr.lat) < 30 && tr.along >= -40 && tr.along <= rwy.lengthM + 60;
  if (!p.onGround && p.alt <= terr + 4) {
    if (nearRwy && p.alt <= rwy.elevFt + 6) {
      const res = evaluateTouchdown(p, rwy, game.world.toTrack.bind(game.world));
      if (res.ok) { landSuccess(res); return; }
      crash(res.reason); return;
    }
    if (p.alt <= terr + 2 && p.z > rwy.z0 - 700 && Math.abs(p.x - game.world.arch.x) < 60) { crash('ARCH STRIKE'); return; }
    crash('TERRAIN IMPACT'); return;
  }
  if (p.timerS <= 0) { crash('STORM CUTOFF — FRONT CLOSED THE FJORD'); return; }
  // storm banner urgency
  const mm = Math.floor(p.timerS / 60), ss = String(Math.floor(p.timerS % 60)).padStart(2, '0');
  game.banner = { text: `PYROCLASTIC FRONT CLOSES FJORD IN ${String(mm).padStart(2, '0')}:${ss} — LAND ${game.sortie.rwy} · ${(Math.hypot(rwy.x - p.x, rwy.z0 - p.z) / 1852).toFixed(2)} NM`, color: p.timerS < 45 ? '#a01818' : '#b07a10', progress: p.timerS / game.sortie.timerS };
}

function landSuccess(res) {
  const p = game.plane;
  p.onGround = true; p.touchdownSink = res.sinkFpm; p.thresholdErrM = res.thresholdM;
  p.score += 2000 + p.gatesHit * 300;
  audio.touchdown();
  const g = gradeFrom(p.score, res.sinkFpm, p.gatesHit, game.world.gates.length);
  const mm = Math.floor(p.timerS / 60), ss = String(Math.floor(p.timerS % 60)).padStart(2, '0');
  game.banner = { text: `TOUCHDOWN CONFIRMED — ${game.sortie.rwy.toUpperCase()} · ${game.sortie.payload.split('·')[0].trim()} SAFE · ${String(mm).padStart(2, '0')}:${ss} TO SPARE`, color: '#0a7a3a', progress: 1 };
  game.debrief = { grade: g.grade, title: g.title, sinkFpm: Math.round(res.sinkFpm), thresholdM: Math.round(res.thresholdM), gates: `${p.gatesHit}/${game.world.gates.length}`, stormMargin: `${String(mm).padStart(2, '0')}:${ss}`, hull: 94, evac: game.sortie.payload, sortieScore: Math.round(p.score), campaign: Math.round(p.score) + 30760 };
  game.screen = 'debrief';
}

function crash(reason) {
  const p = game.plane;
  p.crashed = true; p.crashReason = reason;
  game.debrief = { grade: '—', title: 'BLACK-BOX INVESTIGATION', sinkFpm: Math.round(p.vs), thresholdM: 0, gates: `${p.gatesHit}/${game.world.gates.length}`, stormMargin: '—', hull: 31, evac: game.sortie.payload, sortieScore: Math.round(p.score), campaign: Math.round(p.score) + 30760, crash: reason };
  game.screen = 'debrief';
}

function drawTitle() {
  ctx.fillStyle = 'rgba(6,10,24,0.42)'; ctx.fillRect(0, 0, W, H);
  const bw = Math.min(W * 0.72, 760), bx = (W - bw) / 2;
  ctx.fillStyle = game.banner ? game.banner.color : '#2a3a5e';
  ctx.beginPath(); ctx.roundRect(bx, 10, bw, 34, 5); ctx.fill();
  ctx.font = "700 15px 'Courier New', monospace"; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(game.banner ? game.banner.text : '', W / 2, 17); ctx.textAlign = 'left';
  // briefing panel left third
  ctx.fillStyle = 'rgba(8,14,26,0.82)';
  ctx.beginPath(); ctx.roundRect(28, 90, 430, 540, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,182,46,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = "700 34px 'Courier New', monospace"; ctx.fillStyle = '#ffb62e'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('SKARV SOUND:', 52, 112);
  ctx.fillStyle = '#fff'; ctx.fillText('FLARE-LINE AIRLIFT', 52, 150);
  ctx.font = "400 14px 'Courier New', monospace"; ctx.fillStyle = '#9fd8ff';
  ctx.fillText(`${PILOT} · ${AIRCRAFT} · TWIN-PROP STOL`, 52, 196);
  ctx.fillStyle = '#fff'; ctx.font = "700 15px 'Courier New', monospace";
  ctx.fillText('SORTIE ROSTER — 5 EVAC FLIGHTS', 52, 232);
  SORTIES.forEach((s, i) => {
    const y = 262 + i * 40;
    ctx.fillStyle = i === 0 ? '#ffb62e' : '#cfe6ff';
    ctx.font = `${i === 0 ? '700' : '400'} 14px 'Courier New', monospace`;
    ctx.fillText(`${i === 0 ? '▶ ' : '  '}0${s.id} ${s.name.toUpperCase()} — ${s.stripM} M · ${s.windKt} KT · ${s.gates} GATES`, 52, y);
  });
  ctx.fillStyle = '#39ff88';
  ctx.beginPath(); ctx.roundRect(52, 480, 260, 44, 6); ctx.fill();
  ctx.fillStyle = '#06210f'; ctx.font = "700 18px 'Courier New', monospace"; ctx.textAlign = 'center';
  ctx.fillText('LAUNCH SORTIE', 182, 492);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fb8cc'; ctx.font = "400 12px 'Courier New', monospace";
  ctx.fillText(CONTROLS_TEXT.slice(0, 62), 52, 548);
  ctx.fillText(CONTROLS_TEXT.slice(62), 52, 566);
  ctx.fillText('ENTER to launch · 1-5 to pick a sortie', 52, 592);
  // telemetry strip bottom-right
  ctx.fillStyle = 'rgba(8,14,26,0.75)';
  ctx.beginPath(); ctx.roundRect(W - 448, H - 108, 420, 80, 6); ctx.fill();
  ctx.fillStyle = '#7fe3ff'; ctx.font = "400 13px 'Courier New', monospace";
  ctx.fillText('SORTIE 01/05 · STANDBY', W - 432, H - 98);
  ctx.fillText('IAS 112 KT · ALT 520 FT · HDG 092°', W - 432, H - 78);
  ctx.fillText('VSI -120 FPM · FUEL 48.0 GAL · SCORE 00,000', W - 432, H - 58);
  ctx.fillText('ENG L/R 78% · WIND 074° / 11 KT · OAT -04°C', W - 432, H - 38);
}

function drawDebrief() {
  const d = game.debrief, p = game.plane;
  ctx.fillStyle = 'rgba(4,8,16,0.45)'; ctx.fillRect(0, 0, W, H);
  const px = W - 470, py = 150, pw = 442, ph = 450;
  ctx.fillStyle = 'rgba(6,12,20,0.88)';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.fill();
  ctx.strokeStyle = d.crash ? '#ff5a4a' : '#39ff88'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = "700 20px 'Courier New', monospace"; ctx.fillStyle = d.crash ? '#ff5a4a' : '#39ff88'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(d.crash ? 'BLACK-BOX INVESTIGATION' : `GRADE ${d.grade} · ${d.title}`, px + 20, py + 16);
  ctx.font = "400 14px 'Courier New', monospace"; ctx.fillStyle = '#fff';
  const rows = d.crash ? [
    ['CAUSE', d.crash], ['GATES', d.gates], ['HULL', d.hull + '%'], ['SORTIE SCORE', String(d.sortieScore)],
  ] : [
    ['SINK RATE', `${d.sinkFpm} FPM  +2,000`], ['THRESHOLD', `+${d.thresholdM} M  +1,500`],
    ['GATES', `${d.gates}  +2,400`], ['STORM MARGIN', `${d.stormMargin}  +1,900`],
    ['HULL', `${d.hull}% · ${d.evac}`], ['SORTIE SCORE', String(d.sortieScore)],
    ['CAMPAIGN', String(d.campaign)],
  ];
  rows.forEach((r, i) => { ctx.fillText(r[0], px + 20, py + 56 + i * 28); ctx.fillText(r[1], px + 190, py + 56 + i * 28); });
  drawVScope(ctx, px + 20, py + 56 + rows.length * 28 + 10, pw - 40, 150, game);
  ctx.fillStyle = '#39ff88';
  ctx.beginPath(); ctx.roundRect(px + 20, py + ph - 96, pw - 40, 34, 5); ctx.fill();
  ctx.fillStyle = '#06210f'; ctx.font = "700 15px 'Courier New', monospace"; ctx.textAlign = 'center';
  ctx.fillText('NEXT SORTIE: BLACKSTACK CALDERA', px + pw / 2, py + ph - 88);
  ctx.fillStyle = '#ffb62e';
  ctx.beginPath(); ctx.roundRect(px + 20, py + ph - 52, pw - 40, 34, 5); ctx.fill();
  ctx.fillStyle = '#1a1200'; ctx.fillText('REFLY SORTIE  (X)', px + pw / 2, py + ph - 44);
  ctx.textAlign = 'left';
}

function drawPause() {
  ctx.fillStyle = 'rgba(4,8,16,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,14,26,0.9)';
  ctx.beginPath(); ctx.roundRect(W / 2 - 260, H / 2 - 170, 520, 340, 10); ctx.fill();
  ctx.strokeStyle = '#7fe3ff'; ctx.stroke();
  ctx.font = "700 26px 'Courier New', monospace"; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('PAUSED', W / 2, H / 2 - 150);
  ctx.font = "400 14px 'Courier New', monospace";
  ctx.fillText(`SORTIE 0${game.sortie.id}/05 · ${game.sortie.name.toUpperCase()} · SCORE ${Math.round(game.plane.score)}`, W / 2, H / 2 - 108);
  ctx.fillText(`IAS ${Math.round(game.plane.ias)} KT · ALT ${Math.round(game.plane.alt)} FT · FUEL ${game.plane.fuel.toFixed(1)} GAL`, W / 2, H / 2 - 82);
  ctx.fillText(CONTROLS_TEXT.slice(0, 62), W / 2, H / 2 - 40);
  ctx.fillText(CONTROLS_TEXT.slice(62), W / 2, H / 2 - 18);
  ctx.fillStyle = '#39ff88'; ctx.fillText('P resume · X refly · ENTER dispatch', W / 2, H / 2 + 40);
  ctx.textAlign = 'left';
}

function render() {
  ctx.clearRect(0, 0, W, H);
  renderScene(ctx, W, H, game.world, game.plane, game.view, game.t, game.view);
  if (game.view === 'cockpit') drawCockpitDashboard(ctx, W, H, game.plane, game.t);
  if (game.view === 'cockpit') drawCockpitFrame(ctx, W, H, game.plane, game.t);
  if (game.screen === 'play' || game.screen === 'debrief') {
    drawHud(ctx, W, H, game);
    if (game.screen === 'play') drawVScope(ctx, W - 322, H - 218, 310, 150, game);
  }
  if (game.screen === 'title') drawTitle();
  if (game.screen === 'debrief') drawDebrief();
  if (game.paused) drawPause();
}

// ---- shot mode ----
const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');
const shotSeed = parseInt(params.get('seed') || '0', 10) || 0;

function runShot(mode) {
  const stage = SHOT_STAGES[mode];
  if (!stage) return false;
  startSortie(stage.sortie - 1, shotSeed || stage.seed);
  stage.setup(game);
  game.view = stage.view;
  runAutopilot(game, stage.steps);
  // re-assert exact staged HUD numbers after autopilot drift
  stage.setup(game);
  game.frozen = true;
  game.screen = stage.setup && mode === 'start' ? 'title' : (mode === 'end' ? 'debrief' : 'play');
  if (mode === 'start') game.screen = 'title';
  if (mode === 'end') game.screen = 'debrief';
  render();
  requestAnimationFrame(() => { window.__shotReady = true; });
  return true;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (game.frozen) { requestAnimationFrame(frame); return; }
  // edge-triggered actions
  if (input.takeEdge('pause') && game.screen === 'play') game.paused = !game.paused;
  if (input.takeEdge('camera')) game.view = game.view === 'chase' ? 'cockpit' : 'chase';
  if (input.takeEdge('flap') && game.screen === 'play') { game.plane.flap = game.plane.flap === 0 ? 15 : game.plane.flap === 15 ? 30 : 0; audio.click(); }
  if (input.takeEdge('gear') && game.screen === 'play') { game.plane.gearDown = !game.plane.gearDown; audio.clunk(); }
  if (input.takeEdge('deice') && game.screen === 'play') { game.plane.deice = !game.plane.deice; audio.click(); }
  if (input.takeEdge('mute')) audio.toggleMute();
  if (input.takeEdge('refly')) startSortie(game.sortie.id - 1);
  if (input.takeEdge('confirm')) {
    audio.init();
    if (game.screen === 'title') startSortie(0);
    else if (game.screen === 'debrief') startSortie(Math.min(4, game.sortie.id));
  }
  // number keys pick a sortie from title
  if (game.screen === 'title') {
    for (let i = 0; i < 5; i++) if (['Digit1','Digit2','Digit3','Digit4','Digit5'].some(c => false)) {}
  }
  update(dt);
  render();
  requestAnimationFrame(frame);
}

if (shotMode) {
  runShot(shotMode);
  // keep rendering frozen frame so canvas stays painted
  (function frozenLoop() { if (game.frozen) render(); requestAnimationFrame(frozenLoop); })();
} else {
  // idle title flyby: slow orbit drift for the live title screen
  setInterval(() => { if (game.screen === 'title' && !game.frozen) { game.plane.hdg = (game.plane.hdg + 0.06) % 360; game.plane.propAngle += 0.4; } }, 50);
  requestAnimationFrame(frame);
}
window.addEventListener('pointerdown', () => audio.init(), { once: true });
window.addEventListener('keydown', () => audio.init(), { once: true });
