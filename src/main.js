import { runActor } from './lib/runner.js';

runActor().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
