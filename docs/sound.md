# The sound set

21 clips in `public/sounds/`, generated with ElevenLabs' sound-effects API and
committed. `src/engine/sound.ts` plays them; the synthesiser that used to be the
whole sound system is still in that file, underneath, as the fallback.

```bash
node tools/gen-sounds.mjs             # only what is missing
node tools/gen-sounds.mjs --force     # all of it again
node tools/gen-sounds.mjs deal fold   # just these
node tools/sound-sheet.mjs            # a page that plays every clip
node tools/probe-sound.mjs            # measure and check the wiring
```

The key lives in `.env.local` as `ELEVENLABS_API_KEY`. It has no
`NEXT_PUBLIC_` prefix, so Next will not put it in the browser bundle, and
nothing in `src/` reads it — only the generator does, and the generator is
never part of the build. The audio is committed, so the key is needed again
only to change a sound.

## What is loaded, and when

Nothing is fetched until a sound is actually asked for.

That is not the obvious design and it is worth knowing why. The app starts
**unmuted** — `muted: !(this.props.soundDefault ?? true)` — so hanging the load
off "the player turned sound on" would mean every visitor downloading ~400 KB
during first paint whether or not they ever heard any of it. The trigger is the
first `play()` instead. The sound that triggers it is answered by the
synthesiser, because the samples are still in flight; everything after it is
sampled.

`sfx()` is strict about when a sound may play at all: you must be seated, the
felt must be the visible screen, the tab must be focused, and a hand must
exist. Sound is a cue for *your* hand. One practical consequence — nothing in
the lobby or in settings makes a noise, including the sound toggle itself,
which only sets a flag.

A clip that 404s, fails to decode, or has not arrived yet falls through to its
synthesised voice. One bad file costs one voice, never the set.

## Levelling

Generated clips come back at wildly different levels — this set spanned peaks
from 0.02 to 1.0 — so each is peak-normalised at decode and then placed in the
mix by `MIX` in `sound.ts`. Normalising alone would make a hover tick as loud
as a jackpot fanfare; `MIX` is where that is decided, and it is the knob to
turn when something is too loud. No regeneration, no API key, just a number.

The lift is capped, because amplifying a quiet clip amplifies its hiss too. The
cap follows the clip rather than being a flat number: it may be lifted until
its own noise floor would reach `NOISE_CEIL`, and never past `ABSOLUTE`.

Two mistakes were made here and both are worth not repeating:

- **A flat 6× cap**, chosen out of caution before measuring anything, left the
  error cue four times quieter than the card sounds for no reason. The measured
  noise floors are around 0.00005 — a 40× lift still leaves them inaudible.
- **Reading sustain as noise.** The floor is the RMS of the quietest 20 ms,
  which for a held musical note is real content, not hiss. That held the
  badbeat cue at a third of its intended level until the rule learned that a
  floor *above* the ceiling means the clip is simply never quiet, and may be
  lifted freely.

`tools/probe-sound.mjs` prints what each clip will actually come out at, so
this is checkable rather than assumed.

## Lead-in silence

Generated foley arrives with a little silence in front of it, and for a card
landing that silence is latency — the sound lands after the card has visibly
stopped. This set's lead-ins run from 0 to 116 ms.

They are not trimmed in the files. There is no ffmpeg on this machine, and
shelling out to one would make the generator unrunnable elsewhere. The player
finds the first audible sample at decode time and starts playback there, which
is adjustable without spending credits again. The threshold is deliberately
low: cutting the attack off a click stops it sounding like a click.

## Writing prompts

Three things decide whether a clip is usable, and all three have to be said
explicitly or the model will do the opposite:

- **Dry and close.** Reverb reads as distance; these sounds happen under your
  hands.
- **Short.** A card landing is 300 ms in life.
- **No music**, unless it is a win cue.

And one that cost a round of regeneration: **the model takes loudness adjectives
literally.** The first pass described the card and error sounds as "soft",
"muffled" and "resigned" and got exactly that — peaks of 0.03 to 0.14. Rewriting
them as "crisp", "loud", "close and prominent" took `deal` from 0.142 to 1.0 and
`fold` from 0.095 to 0.491. `hover` and `lose` are still quiet on purpose.

The error cue resisted three attempts and stayed near 0.02 whatever it was asked
for; it is carried by the normalisation instead. Not every sound is worth a
fourth try.

## What has not been checked

Whether it sounds *good*. Every assertion here is about decoding, duration and
level — no tool can tell you the chip click sounds like a chip.
`tools/sound-sheet.mjs` writes a page with a play button for every clip, which
is the only way to answer that.
