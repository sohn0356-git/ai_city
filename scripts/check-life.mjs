import { readFile } from 'node:fs/promises';
import { validateLife } from '../src/simulation/engine.mjs';
try {
  const life = JSON.parse(await readFile('public/life.json', 'utf8'));
  validateLife(life);
  console.log(
    `Living world valid: ${life.actors.length} residents, ${life.completed} completed actions`,
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.log('Living world not initialized yet; legacy world remains available');
}
