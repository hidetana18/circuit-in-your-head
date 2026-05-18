# The Circuit in Your Head

An interactive single-page demo for child psychology education:
a neural window into the mind through body, alarm, attention, and action.
The core idea: a mind is a learning circuit, and experience tunes the path.

## What it teaches

Four beats:

1. **The framework** — a neural window into the mind: body, alarm,
   attention, and action. A 4-step animation shows what happens when a kid
   trips: limbic system fires, brain stem activates the body, then the cortex
   catches up.
2. **The game** — Peter Rabbit is hiding in Mr. McGregor's watering can,
   heart pounding. Tap three actions in order
   (**Notice → Breathe → Reframe**) to give his circuit a safe experience.
   One trap card (**Push it down**) never works.
3. **The shared loop** — Nora and Jules turn one ambiguous courtyard moment
   into two threat stories. Their heart rate, breathing, actions, and
   interpretations become each other's input until a listener gives both
   circuits safer data.
4. **A neural lens on literature** — Jane Austen's *Pride and Prejudice* shows the same
   loop at an adult scale: first impressions become predictions, then letters
   and actions provide new evidence that updates the model.

The page is intentionally one screen of words and one screen of game.
Everything else is visual.

## Files

- `index.html` — the page
- `styles.css` — all styling, palette in `:root`
- `script.js` — intro auto-play + game state machine
- `netlify.toml` — publish config, no-cache for CSS/JS during iteration

## Run

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Drop the folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
