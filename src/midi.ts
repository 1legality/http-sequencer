export type MidiEvent = { timeMs:number; bytes:number[] };


let access: MIDIAccess | null = null;
export async function ensureAccess(): Promise<MIDIAccess> {
access ||= await navigator.requestMIDIAccess({ sysex:false });
return access;
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