import { Midi } from '@tonejs/midi';
import { listOutputs, ensureAccess, schedule, startClock, allNotesOff, testNote } from './midi';
import { eventsFromToneNotes, arp, euclidGate } from './transforms';

const $ = (id: string) => document.getElementById(id)!;
const logEl = $('log');
const log = (m: string) => {
  logEl.textContent += m + '\n';
  logEl.scrollTop = logEl.scrollHeight;
};

let out: MIDIOutput | null = null;
let bpm = 120;
let stopClockFn: (() => void) | null = null;
let cancelSched: (() => void) | null = null;
let lastEvents: { timeMs: number; bytes: number[] }[] = [];

// Wake Lock to keep screen on outdoors
async function requestWakeLock() {
  try {
    // @ts-ignore
    await (navigator as any).wakeLock?.request('screen');
  } catch {}
}

// Light haptics
function buzz(ms = 15) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}

async function refreshOutputs() {
  const sel = $('outSel') as HTMLSelectElement;
  sel.innerHTML = '';
  const outs = await listOutputs();
  for (const o of outs) {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.name || o.id;
    sel.appendChild(opt);
  }
  if (outs[0]) {
    sel.value = outs[0].id;
    out = outs[0];
  }
  log(outs.length ? `MIDI outputs: ${outs.map(o => o.name).join(', ')}` : 'No MIDI outputs.');
}

$('connectBtn').addEventListener('click', async () => {
  await ensureAccess();
  await refreshOutputs();
  buzz();
  requestWakeLock();
});

$('outSel').addEventListener('change', async (e: any) => {
  const acc = await ensureAccess();
  out = acc.outputs.get(e.target.value) || null;
  buzz();
});

$('testBtn').addEventListener('click', () => {
  if (out) {
    testNote(out, 0, 60, 110, 250);
    buzz();
  }
});

($('bpm') as HTMLInputElement).addEventListener('change', e => {
  bpm = Number((e.target as HTMLInputElement).value) || 120;
  buzz();
});

$('clockBtn').addEventListener('click', () => {
  if (!out) return;
  stopClockFn?.();
  stopClockFn = startClock(out, bpm);
  log('Clock started');
  buzz();
});

$('stopBtn').addEventListener('click', () => {
  stopClockFn?.();
  stopClockFn = null;
  cancelSched?.();
  cancelSched = null;
  if (out) allNotesOff(out);
  log('Stopped');
  buzz();
});

$('playBtn').addEventListener('click', () => {
  if (!out || !lastEvents.length) return;
  cancelSched?.();
  cancelSched = schedule(out, lastEvents, () => log('Playback finished'));
  log(`Playing ${lastEvents.length} events…`);
  buzz();
});

$('file').addEventListener('change', async (ev: any) => {
  const file: File | null = ev.target.files?.[0] ?? null;
  if (!file) return;
  const buf = new Uint8Array(await file.arrayBuffer());
  const midi = new Midi(buf);
  const base = eventsFromToneNotes(midi.tracks.flatMap(t => t.notes), 0);

  // Extract unique pitches from first track for ARP
  const uniq = [...new Set(midi.tracks[0]?.notes.map(n => n.midi) ?? [60, 64, 67])].sort((a, b) => a - b);

  // UI params
  const arpRate = Number((document.getElementById('arpRate') as HTMLInputElement).value);
  const arpOct = Number((document.getElementById('arpOct') as HTMLInputElement).value);
  const arpGate = Number((document.getElementById('arpGate') as HTMLInputElement).value);
  const arpMode = (document.getElementById('arpMode') as HTMLSelectElement).value as any;

  const eSteps = Number((document.getElementById('eSteps') as HTMLInputElement).value);
  const ePulses = Number((document.getElementById('ePulses') as HTMLInputElement).value);
  const eRotate = Number((document.getElementById('eRotate') as HTMLInputElement).value);
  // eGate exists in UI but we’re just gating NoteOns, so not used in this MVP
  // const eGate = Number((document.getElementById('eGate') as HTMLInputElement).value);

  const arpEvents = arp(uniq, {
    bpm,
    rateDiv: arpRate,
    octaves: arpOct,
    gate: arpGate,
    lengthBeats: 8,
    channel: 0,
    mode: arpMode
  });
  const gatedBase = euclidGate(base, { steps: eSteps, pulses: ePulses, rotate: eRotate, bpm });

  lastEvents = [...gatedBase, ...arpEvents].sort((a, b) => a.timeMs - b.timeMs);

  (document.getElementById('fileInfo')!).textContent = `${file.name}: ${lastEvents.length} events ready`;
  log(`Loaded ${file.name} → ${lastEvents.length} events`);
  buzz();
});

// PWA install prompt
let deferred: any = null;
const installBtn = $('installBtn');
window.addEventListener('beforeinstallprompt', (e: any) => {
  e.preventDefault();
  deferred = e;
  installBtn.removeAttribute('hidden');
});
installBtn.addEventListener('click', async () => {
  buzz();
  deferred?.prompt();
  deferred = null;
  installBtn.setAttribute('hidden', 'true');
});

// ✅ Service worker registration (the line that was breaking before)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
