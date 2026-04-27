"""Generate procedural WAV sound effects for Privacy Raja.
Writes to /dev-server/public/audio/. All sounds are royalty-free synthesized
waveforms — no external assets, no licensing concerns. Keep them short.
"""
import math, os, struct, wave, random, sys

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/audio"
os.makedirs(OUT, exist_ok=True)

def write_wav(path, samples, sr=SR):
    samples = [max(-1.0, min(1.0, s)) for s in samples]
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        data = b"".join(struct.pack("<h", int(s * 32767)) for s in samples)
        w.writeframes(data)
    print(f"wrote {path}  ({len(samples)/sr:.2f}s)")

def env(t, a, d, s, r, dur):
    if t < a: return t/a
    if t < a+d: return 1 - (1-s)*(t-a)/d
    if t < dur-r: return s
    return s * max(0, 1 - (t-(dur-r))/r)

def tone(freq, dur, amp=0.5, wave_type="sine", a=0.01, d=0.05, sus=0.6, r=0.1, vib=0.0, vib_rate=6):
    n = int(dur*SR)
    out = []
    phase = 0.0
    for i in range(n):
        t = i/SR
        f = freq * (1 + vib*math.sin(2*math.pi*vib_rate*t))
        phase += 2*math.pi*f/SR
        if wave_type == "sine":   v = math.sin(phase)
        elif wave_type == "square": v = 1 if math.sin(phase) > 0 else -1
        elif wave_type == "saw":   v = (phase % (2*math.pi))/math.pi - 1
        elif wave_type == "tri":   v = 2*abs(((phase/math.pi) % 2) - 1) - 1
        else: v = math.sin(phase)
        out.append(v * amp * env(t, a, d, sus, r, dur))
    return out

def noise(dur, amp=0.5, a=0.01, d=0.1, sus=0.4, r=0.2, filter_k=0.0):
    n = int(dur*SR); out=[]; prev=0
    for i in range(n):
        t = i/SR
        raw = (random.random()*2 - 1)
        if filter_k: raw = prev + filter_k*(raw-prev); prev = raw
        out.append(raw * amp * env(t, a, d, sus, r, dur))
    return out

def mix(*sigs):
    n = max(len(s) for s in sigs)
    out = [0.0]*n
    for s in sigs:
        for i,v in enumerate(s): out[i] += v
    # soft clip
    return [math.tanh(v*0.9) for v in out]

# === Dice rumble (looping-ish short) ===
dice_rumble = mix(
    noise(0.6, amp=0.55, a=0.03, d=0.2, sus=0.8, r=0.15, filter_k=0.3),
    tone(80, 0.6, amp=0.35, wave_type="saw", a=0.02, d=0.3, sus=0.6, r=0.15, vib=0.08, vib_rate=12),
    tone(120, 0.6, amp=0.18, wave_type="tri", a=0.02, d=0.3, sus=0.5, r=0.15),
)
write_wav(f"{OUT}/dice-rumble.wav", dice_rumble)

# === Dice thud ===
thud = mix(
    tone(60, 0.25, amp=0.8, wave_type="sine", a=0.001, d=0.05, sus=0.3, r=0.18),
    noise(0.25, amp=0.5, a=0.001, d=0.04, sus=0.1, r=0.2, filter_k=0.5),
)
write_wav(f"{OUT}/dice-thud.wav", thud)

# === Ting (outcome reveal) ===
ting = mix(
    tone(1760, 0.6, amp=0.4, a=0.002, d=0.05, sus=0.3, r=0.5),
    tone(2637, 0.6, amp=0.25, a=0.002, d=0.1, sus=0.15, r=0.5),
    tone(3520, 0.4, amp=0.15, a=0.002, d=0.1, sus=0.1, r=0.3),
)
write_wav(f"{OUT}/ting.wav", ting)

# === Footsteps per element (one short hop sound each) ===
# Earth — low thud + dust
earth_step = mix(
    tone(110, 0.14, amp=0.55, wave_type="sine", a=0.001, d=0.04, sus=0.2, r=0.09),
    noise(0.14, amp=0.3, a=0.001, d=0.03, sus=0.1, r=0.1, filter_k=0.4),
)
write_wav(f"{OUT}/step-earth.wav", earth_step)
# Water — drip
drip = mix(
    tone(880, 0.18, amp=0.45, wave_type="sine", a=0.002, d=0.02, sus=0.1, r=0.16, vib=0.1, vib_rate=25),
    tone(1320, 0.15, amp=0.2, wave_type="sine", a=0.002, d=0.03, sus=0.05, r=0.12),
)
write_wav(f"{OUT}/step-water.wav", drip)
# Fire — crackle
fire_step = mix(
    noise(0.18, amp=0.55, a=0.001, d=0.02, sus=0.3, r=0.14, filter_k=0.1),
    tone(220, 0.15, amp=0.3, wave_type="saw", a=0.001, d=0.04, sus=0.2, r=0.1),
)
write_wav(f"{OUT}/step-fire.wav", fire_step)
# Air — whoosh
air_step = mix(
    noise(0.22, amp=0.5, a=0.01, d=0.05, sus=0.5, r=0.15, filter_k=0.05),
    tone(1200, 0.22, amp=0.2, wave_type="sine", a=0.005, d=0.1, sus=0.2, r=0.1),
)
write_wav(f"{OUT}/step-air.wav", air_step)
# Ether — shimmer
ether_step = mix(
    tone(1760, 0.28, amp=0.3, wave_type="sine", a=0.002, d=0.05, sus=0.2, r=0.22, vib=0.15, vib_rate=14),
    tone(2349, 0.28, amp=0.22, wave_type="sine", a=0.003, d=0.05, sus=0.15, r=0.22, vib=0.12, vib_rate=18),
    tone(3136, 0.28, amp=0.15, wave_type="sine", a=0.003, d=0.05, sus=0.1, r=0.22),
)
write_wav(f"{OUT}/step-ether.wav", ether_step)

# === MCQ correct — bright chime (major triad arpeggio) ===
correct = mix(
    tone(523.25, 0.9, amp=0.4, a=0.005, d=0.1, sus=0.3, r=0.5),       # C
    tone(659.25, 0.9, amp=0.35, a=0.08, d=0.1, sus=0.3, r=0.5),       # E
    tone(783.99, 0.9, amp=0.3, a=0.16, d=0.1, sus=0.3, r=0.5),        # G
    tone(1046.5, 1.0, amp=0.25, a=0.24, d=0.12, sus=0.3, r=0.55),     # C octave
)
write_wav(f"{OUT}/mcq-correct.wav", correct)

# === MCQ wrong — low brass stinger (minor second dissonance) ===
wrong = mix(
    tone(174.61, 0.9, amp=0.5, wave_type="saw", a=0.005, d=0.1, sus=0.55, r=0.6),  # F
    tone(185.00, 0.9, amp=0.45, wave_type="saw", a=0.005, d=0.1, sus=0.55, r=0.6), # F# (clash)
    tone(87.31, 0.9, amp=0.35, wave_type="tri", a=0.005, d=0.1, sus=0.55, r=0.6),  # F low
)
write_wav(f"{OUT}/mcq-wrong.wav", wrong)

# === Layer build — ascending chord (C E G C) ===
def seq(notes, step=0.12, dur=0.5):
    out = []
    for i,f in enumerate(notes):
        t = tone(f, dur, amp=0.45, wave_type="sine", a=0.005, d=0.08, sus=0.5, r=0.25)
        start = int(i*step*SR)
        while len(out) < start + len(t): out.append(0.0)
        for j,v in enumerate(t): out[start+j] += v
    return [math.tanh(v*0.85) for v in out]
build = seq([523.25, 659.25, 783.99, 1046.5], step=0.11, dur=0.7)
write_wav(f"{OUT}/layer-build.wav", build)

# === Card reveal — page flip ===
flip = mix(
    noise(0.35, amp=0.5, a=0.02, d=0.05, sus=0.5, r=0.25, filter_k=0.15),
    tone(3000, 0.35, amp=0.1, wave_type="sine", a=0.005, d=0.1, sus=0.2, r=0.2, vib=0.3, vib_rate=40),
)
write_wav(f"{OUT}/card-flip.wav", flip)

# === Jail clank ===
clank = mix(
    tone(180, 0.5, amp=0.5, wave_type="square", a=0.001, d=0.05, sus=0.2, r=0.35),
    tone(90, 0.5, amp=0.4, wave_type="sine", a=0.001, d=0.05, sus=0.2, r=0.4),
    noise(0.5, amp=0.4, a=0.001, d=0.03, sus=0.1, r=0.4, filter_k=0.2),
    tone(240, 0.5, amp=0.25, wave_type="tri", a=0.001, d=0.05, sus=0.15, r=0.35),
)
write_wav(f"{OUT}/jail-clank.wav", clank)

# === Victory fanfare (C-E-G-C big with harmony) ===
fanfare = seq([523.25, 659.25, 783.99, 1046.5, 1318.51], step=0.18, dur=1.3)
fanfare2 = seq([261.63, 329.63, 392.00, 523.25, 659.25], step=0.18, dur=1.3)
# layer in
n = max(len(fanfare), len(fanfare2))
victory = []
for i in range(n):
    a = fanfare[i] if i < len(fanfare) else 0
    b = fanfare2[i] if i < len(fanfare2) else 0
    victory.append(math.tanh(0.7*(a+b*0.7)))
write_wav(f"{OUT}/victory.wav", victory)

# === Crowd cheer (filtered noise rising + falling) ===
n = int(2.0*SR); cheer=[]; prev=0
for i in range(n):
    t = i/SR
    raw = (random.random()*2-1) * 0.6
    raw = prev + 0.15*(raw-prev); prev = raw
    e = 0
    if t<0.4: e = t/0.4
    elif t<1.3: e = 1
    else: e = max(0, 1-(t-1.3)/0.7)
    cheer.append(raw*e*0.85)
write_wav(f"{OUT}/crowd-cheer.wav", cheer)

# === Ambient loop — slow drone with gentle sitar-like overtones (12s, loopable) ===
dur = 12.0
n = int(dur*SR)
amb = [0.0]*n
drones = [
    (146.83, 0.22),  # D3
    (220.00, 0.14),  # A3
    (293.66, 0.10),  # D4
    (440.00, 0.06),  # A4
    (587.33, 0.04),  # D5
]
for f, a in drones:
    phase = 0.0
    for i in range(n):
        t = i/SR
        vib = 1 + 0.004*math.sin(2*math.pi*0.4*t + f*0.01)
        phase += 2*math.pi*f*vib/SR
        amb[i] += math.sin(phase)*a
# gentle bell taps every ~4s
for tap_t in [1.0, 4.5, 7.8, 10.8]:
    bell = tone(880, 1.5, amp=0.08, wave_type="sine", a=0.005, d=0.1, sus=0.3, r=1.3)
    start = int(tap_t*SR)
    for j,v in enumerate(bell):
        if start+j < n: amb[start+j] += v
# crossfade the first and last 0.8s so the loop is seamless
fade = int(0.8*SR)
for i in range(fade):
    w = i/fade
    head = amb[i]
    tail = amb[n-fade+i]
    amb[i] = head*w + tail*(1-w)
    amb[n-fade+i] = head*(1-w) + tail*w
amb = [math.tanh(v*0.9) for v in amb]
write_wav(f"{OUT}/ambient.wav", amb)

print("done.")
