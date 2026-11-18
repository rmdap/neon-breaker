# NEON BREAKER

[![make.fun bounty](https://make.fun/api/competitions/best-game-01/badge.svg)](https://make.fun/bounty/best-game-01)
[![owner](https://make.fun/api/owners/rmdap/badge.svg)](https://make.fun/r/8aa53bxw)
[![repo](https://make.fun/api/repos/rmdap/neon-breaker/badge.svg)](https://make.fun/bounty/best-game-01)

A neon Breakout arcade game for make.fun's **"Make the best game"** bounty ($1,000). Steer the paddle, smash every brick, catch the power-ups, and survive all three levels — *First Light*, *Double Trouble* (tough two-hit bricks), and *Steel Maze* (armoured bricks and unbreakable steel).

## How to play

- **Mouse or ← →** — move the paddle (the ball bounces off at an angle depending on where it hits)
- **Space / click** — launch the ball, fire the laser while it's active
- **P** — pause, **R** — restart, **M** — mute

Power-ups fall from smashed bricks: **W** wide paddle, **M** multi-ball, **S** slow ball, **L** laser, **+** extra life. Chain brick hits without touching the paddle to build a combo multiplier (up to x8). Three lives; clear level 3 to win.

## The game

Vanilla JavaScript canvas 2D, no libraries, no network — every file is local. WebAudio synth sounds, particles, screen shake, and a HUD with score, lives, level, combo and high score. Source is split by job: `config.js` (tunables), `input.js` (keyboard/mouse), `audio.js` (synth sounds), `particles.js` (bursts + shake), `levels.js` (the three layouts), `game.js` (rules and physics), `render.js` (everything drawn), `main.js` (boot + screenshot scenes).

## Run it

Serve `game/` with any static server and open `index.html` in a desktop browser:

```sh
python3 -m http.server 8080 --directory game
```

Or `node serve.ts` if you have the kit's starter handy. Screenshot scenes render deterministically with `?shot=start|play|win|gameover`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `make.fun` library.
