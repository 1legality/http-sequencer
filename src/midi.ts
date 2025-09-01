export type MidiEvent = { timeMs:number; bytes:number[] };


let access: MIDIAccess | null = null;
export async function ensureAccess(): Promise<MIDIAccess> {
  if (!('requestMIDIAccess' in navigator)) {
    throw new Error('Web MIDI API not available. Ensure you are using a secure context (HTTPS) and a supported browser.');
  }
  if (access) return access;
  try {
    access = await (navigator as any).requestMIDIAccess({ sysex: false });
    if (!access) throw new Error('navigator.requestMIDIAccess returned no access object.');
    return access;
  } catch (err:any) {
    const msg = err?.message ?? String(err);
    throw new Error(`Failed to get MIDI access: ${msg}. Check browser permissions and that the site is served over HTTPS. In Chrome, check chrome://settings/content/midiDevices and ensure the site is allowed.`);
  }
}


export async function listOutputs(): Promise<MIDIOutput[]> {
const acc = await ensureAccess();
return Array.from(acc.outputs.values());
}


export function schedule(output: MIDIOutput, events: MidiEvent[], onDone?:()=>void) {
const start = performance.now();
let idx = 0;
const LOOKAHEAD = 120; // ms
let raf = 0 as unknown as number;
function tick(now: number) {
const rel = now - start;
while (idx < events.length && events[idx].timeMs <= rel + LOOKAHEAD) {
const e = events[idx++];
output.send(e.bytes, start + e.timeMs);
}
if (idx < events.length) (raf = requestAnimationFrame(tick)); else onDone?.();
}
raf = requestAnimationFrame(tick);
return () => cancelAnimationFrame(raf as any);
}


export function allNotesOff(output: MIDIOutput){ for(let ch=0; ch<16; ch++) output.send([0xB0|ch,123,0]); }


export function startClock(output: MIDIOutput, bpm: number){
const interval = (60_000 / bpm) / 24;
output.send([0xFA]);
const id = setInterval(()=> output.send([0xF8]), interval);
return () => { clearInterval(id); output.send([0xFC]); };
}


export function testNote(output: MIDIOutput, ch=0, note=60, vel=100, ms=300){
output.send([0x90|ch, note, vel]);
setTimeout(()=> output.send([0x80|ch, note, 0x40]), ms);
}