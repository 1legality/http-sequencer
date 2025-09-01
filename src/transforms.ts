import type { MidiEvent } from './midi';


export function eventsFromToneNotes(notes: {time:number; duration:number; midi:number; velocity:number}[], channel=0): MidiEvent[] {
const out: MidiEvent[] = [];
for (const n of notes){
const tOn = n.time * 1000, tOff = (n.time + n.duration) * 1000;
out.push({ timeMs: tOn, bytes:[0x90|channel, n.midi, Math.round(n.velocity*127)]});
out.push({ timeMs: tOff, bytes:[0x80|channel, n.midi, 0x40]});
}
return out.sort((a,b)=>a.timeMs-b.timeMs);
}


export type ArpMode = 'up'|'down'|'updown'|'random';
export function arp(pitches:number[], opts:{ bpm:number; rateDiv:number; octaves:number; gate:number; lengthBeats:number; channel:number; mode:ArpMode }): MidiEvent[] {
const { bpm, rateDiv, octaves, gate, lengthBeats, channel, mode } = opts;
const base = [...pitches].sort((a,b)=>a-b);
const order = mode==='down'? base.slice().reverse()
: mode==='updown'? [...base, ...base.slice().reverse().slice(1,-1)]
: mode==='random'? base.slice().sort(()=>Math.random()-0.5)
: base;
const beatMs = 60000/bpm; const stepMs = beatMs / (rateDiv/4);
const steps = Math.floor(lengthBeats * (rateDiv/4));
const out: MidiEvent[] = [];
for (let s=0; s<steps; s++){
const p = order[s % order.length] + 12 * Math.floor((s/order.length)%octaves);
const t0 = s*stepMs, dur = stepMs * Math.max(0.05, Math.min(1,gate));
out.push({ timeMs:t0, bytes:[0x90|channel, p, 0x64]});
out.push({ timeMs:t0+dur, bytes:[0x80|channel, p, 0x40]});
}
return out;
}


export function euclidMask(steps:number, pulses:number, rotate=0){
let groups = Array(pulses).fill(0).map(()=>[true]);
let rests = Array(Math.max(0, steps-pulses)).fill(0).map(()=>[false]);
while (rests.length && groups.length > 1){
const n = Math.min(groups.length, rests.length);
const merged = [] as boolean[][];
for (let i=0;i<n;i++) merged.push(groups[i].concat(rests[i]));
groups = merged.concat(groups.slice(n));
rests = rests.slice(n);
}
const seq = groups.flat();
if (rotate){ const r = ((rotate%steps)+steps)%steps; return seq.slice(steps-r).concat(seq.slice(0,steps-r)); }
return seq;
}


export function euclidGate(source: MidiEvent[], opts:{ steps:number; pulses:number; rotate:number; bpm:number }): MidiEvent[] {
const { steps, pulses, rotate, bpm } = opts;
const mask = euclidMask(steps, Math.min(pulses, steps), rotate);
const stepMs = (60000/bpm)/4; // 16th grid
return source.filter(e => mask[Math.floor(e.timeMs/stepMs)%steps]);
}