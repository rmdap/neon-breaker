// NEON BREAKER — the entry program (Node 22, standard library only). It
// hands the game in: copies game/ and screenshots/ from beside this file
// into the output directory and writes /output/dossier.json, the summary
// the judge reads, using the vendored make.fun library. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository's root: the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
// The grader hands us /output; a local run names its own directory.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

// The playable game: plain static files, game/index.html at its root.
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

// The screenshots, first by name the cover (1-play.jpg).
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier the scorer re-derives with the same library and compares
// byte for byte: same caps as the bounty's gate (see RULES.txt), so this
// program fails exactly where the scorer would refuse the entry.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
