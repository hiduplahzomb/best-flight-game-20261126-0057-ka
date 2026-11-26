// The five named sorties of the Skarv Sound campaign. Distances in metres,
// headings in degrees, speeds in knots, altitudes in feet. Each sortie carries
// its palette, weather, radio script and gate list (gates lie along the track).
export const SORTIES = [
  {
    id: 1, name: 'Kaldvik Harbor', rwy: 'RWY 09 Kaldvik Harbor', stripM: 320, gates: 5,
    windDir: 74, windKt: 11, gustKt: 0, oat: -4, qnh: 996, visNm: 4.2, timerS: 240,
    palette: { skyTop: '#2b2f6e', skyMid: '#7a5a9e', horizon: '#ff9a4d', sea: '#1d5f7a', rock: '#2e2a33' },
    fuelGal: 48.0, payload: 'LIGHT CARGO · 120 KG', radio: [
      { who: 'Torben Vik · Skarv Tower', text: 'Fulmar-4, harbor flares lit — wind 074 at 11, runway 09 clear for evac lift.' },
      { who: 'Dr. Signe Halvorsen · Gannet Pad', text: 'First families are at the pier, Maren. Gentle on the flare, sea is glassy.' },
    ],
  },
  {
    id: 2, name: 'Kaldvik Ridge', rwy: 'RWY 22 Kaldvik Shelf', stripM: 260, gates: 7,
    windDir: 186, windKt: 19, gustKt: 8, oat: -7, qnh: 996, visNm: 2.6, timerS: 210,
    palette: { skyTop: '#232a5e', skyMid: '#8a5a3a', horizon: '#ffb347', sea: '#1a4f66', rock: '#33291f' },
    fuelGal: 42.0, payload: '460 KG BATTERY POD', radio: [
      { who: 'Oskar Nygard · Caldera Obs', text: 'Vent surge on Ridge B — ride the updraft through Gate 4, brace for lee rotor past the saddle.' },
      { who: 'Torben Vik · Skarv Tower', text: 'Thermal window closing, Fulmar-4. Keep 124 knots over the ridge lip.' },
    ],
  },
  {
    id: 3, name: 'Rimecap Glacier', rwy: 'RWY 14 Rimecap Ice', stripM: 230, gates: 7,
    windDir: 240, windKt: 24, gustKt: 10, oat: -16, qnh: 990, visNm: 1.8, timerS: 180,
    palette: { skyTop: '#1c2447', skyMid: '#5d6a8f', horizon: '#e8b06a', sea: '#9fc4d4', rock: '#3a3f4a' },
    fuelGal: 40.0, payload: 'GLACIER CREW · 4 PAX', radio: [
      { who: 'Oskar Nygard · Caldera Obs', text: 'Squall line on the glacier — rime builds fast, keep the bleed air hot.' },
      { who: 'Dr. Signe Halvorsen · Gannet Pad', text: 'Ice strip is short, Maren. Flaps thirty, aim for the orange pots.' },
    ],
  },
  {
    id: 4, name: 'Gannet Ledge', rwy: 'RWY 28R Gannet Ledge', stripM: 180, gates: 8,
    windDir: 314, windKt: 28, gustKt: 11, oat: -14, qnh: 984, visNm: 1.1, timerS: 150,
    palette: { skyTop: '#1a2148', skyMid: '#6a3a6e', horizon: '#ff7a2a', sea: '#123a5e', rock: '#241f26' },
    fuelGal: 30.0, payload: '6 EVAC · 420 KG MED', radio: [
      { who: 'Torben Vik · Skarv Tower', text: 'Gannet flares lit — gusts 39 knots off the arch, hold 84 knots over the lip!' },
      { who: 'Dr. Signe Halvorsen · Gannet Pad', text: 'Six evacuees strapped in, Maren. Bring them home through the arch.' },
    ],
  },
  {
    id: 5, name: 'Blackstack Caldera', rwy: 'RWY 31 Blackstack Rim', stripM: 165, gates: 9,
    windDir: 20, windKt: 34, gustKt: 12, oat: -11, qnh: 978, visNm: 0.9, timerS: 150,
    palette: { skyTop: '#160f2e', skyMid: '#5a1f2e', horizon: '#ff5a1a', sea: '#241a30', rock: '#1d1418' },
    fuelGal: 28.0, payload: 'CALDERA TEAM · 5 PAX', radio: [
      { who: 'Oskar Nygard · Caldera Obs', text: 'Twin shear over the crater rim — ash plume both sides, thread the middle, Fulmar-4.' },
      { who: 'Torben Vik · Skarv Tower', text: 'Last sortie, Maren. The fjord closes behind you. Make it count.' },
    ],
  },
];
export const PILOT = 'CAPT. MAREN LIND';
export const CALLSIGN = 'FULMAR-4';
export const AIRCRAFT = 'KV-14 FULMAR';
