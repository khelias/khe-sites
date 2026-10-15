import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { resolveSourceRoot, SourceError } from './architecture-sources.mjs';

// The 3D house demo at /house3d/: khe-home-assistant's own build writes it from its made-up
// test house, so no model and no house data pass through here.
export function buildHouse3dDemo(outputDir) {
  const root = resolveSourceRoot('HOME_ASSISTANT_ROOT', 'khe-home-assistant');
  try {
    execFileSync('python3', ['-I', join(root, 'scripts', 'house3d-build.py'), '--demo', outputDir], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  } catch (error) {
    throw new SourceError(`The 3D house demo build in ${root} failed (${error.message.split('\n')[0]}). Check HOME_ASSISTANT_ROOT.`);
  }
}
