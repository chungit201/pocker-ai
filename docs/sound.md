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
node tools/gen-win-options.mjs        # three candidate victory-cue families
node tools/probe-win-options.mjs      # measure them, no dev server needed
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

And two that cost a round of regeneration each, because the model takes
adjectives literally in both directions:

**Loudness.** The first pass described the card and error sounds as "soft",
"muffled" and "resigned" and got exactly that — peaks of 0.03 to 0.14. Rewriting
them as "crisp", "loud", "close and prominent" took `deal` from 0.142 to 1.0 and
`fold` from 0.095 to 0.491. `hover` and `lose` are still quiet on purpose.

**Brightness.** The win cues were written as "bright rising bells" with "a light
shimmer" and were reported as painful to listen to. They measured 0.56, 0.50 and
0.61 of their energy above 2 kHz — which is where the ear is most sensitive, and
so where "piercing" comes from. Turning them down would not have helped; a quiet
shrill sound is still shrill. Naming the register ("low", "mellow", "wooden",
"felt mallets") and listing what to avoid ("no bells, no chimes, no shimmer, no
bright high frequencies, no cymbals") brought them to 0.02, 0.12 and 0.05.

Naming an instrument can also override all of that. A later pass asked for the
same three cues on "a soft glass bell struck with a felt mallet, pure and
rounded, middle register" — every brightness guard above still in the prompt —
and got 0.90, 0.67 and 0.47, worse than the painful first pass. The model hears
"glass" and reaches for the top octave; the register asked for does not survive
it. The instrument is the strongest word in a musical prompt, so the fix is to
pick one that cannot be shrill rather than to ask a shrill one to behave.

Two instruments came back fine from the same phrasing and the choice between
them was taste: a celesta at 0.07, 0.08 and 0.14, and the harp that ships.

## One bad clip is not a bad prompt

The harp's first `potwin` came back at 0.24 above 2 kHz — the brightest clip of
any candidate, in the gentlest family, from the same words that gave its
siblings 0.08 and 0.06. It was shipped anyway, flagged in passing as "the
brightest of the nine", and the next person to hear the table said it was
shrill. They were right, and the measurement had already said so.

The fix was not a new prompt. The same prompt was simply run three more times:

| take | >2 kHz |
|---|---|
| the one that shipped | 0.24 |
| re-roll b | 0.05 |
| re-roll c | 0.06 |
| re-roll d | **0.04** — now shipping |

Four takes of identical words spanning 0.04 to 0.24 is the whole lesson. The
API is not deterministic, so a per-clip figure is one roll of it and not a
property of the instrument or the wording. Compare families by their mean;
when one clip of an otherwise good family is wrong, **re-roll that clip** with
`tools/gen-variant.mjs` and the option's own prompt, before touching words
that are working for the other two.

And do not ship a clip whose own measurement is an outlier because the mean
looks fine. The number was there, in the table, before anyone listened.

`probe-sound.mjs` reports both bands for this reason: above 4 kHz is hiss and
clatter, which chips and card stock are supposed to have, while above 2 kHz is
what makes a cue hurt. A chime can sit low on the first and high on the second.

The error cue resisted three attempts and stayed near 0.02 whatever it was asked
for; it is carried by the normalisation instead. Not every sound is worth a
fourth try.

## Alternatives

`tools/gen-variant.mjs` writes a candidate take into `tools/out/` without
touching the set, and the sound sheet lists whatever is there underneath the
shipping clips. It exists for the case where a cue is wrong in a *direction* —
too bright, too long, too cheerful — where hearing two side by side settles in
one pass what guessing settles in four.

Promote one by moving its prompt into `tools/gen-sounds.mjs`. The prompt is the
only record of how the sound was made, and a clip whose prompt lives nowhere
cannot be regenerated or adjusted later.

Move the prompt, but copy the mp3 too, rather than rerunning the generator to
produce the shipping file. The API is not deterministic: the same prompt comes
back a different take every time, so a `--force` rerun ships a clip nobody has
listened to and throws away the one that was chosen. The prompt records how to
get *another* take of this sound, not how to get this one back.

`tools/gen-win-options.mjs` is the same idea for the three victory cues
together. They are one event at three sizes and are heard in the same session,
so auditioning a `win` alone gives a table whose small pot is a glass bell and
whose big pot is a music box; it generates one instrument across all three and
writes a page where the families can be compared side by side. The current set
was chosen that way. `tools/probe-win-options.mjs` measures the candidates
against what ships, and unlike `probe-sound.mjs` needs no dev server — it
stands up a throwaway static server, because mp3 has no decoder in Node and
`fetch` is blocked on `file://`.

## What has not been checked

Whether it sounds *good*. Every assertion here is about decoding, duration,
level and spectrum — no tool can tell you the chip click sounds like a chip, or
that a win cue feels like winning. `tools/sound-sheet.mjs` writes a page with a
play button for every clip, which is the only way to answer that.
