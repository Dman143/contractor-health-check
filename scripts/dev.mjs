import { spawn } from 'node:child_process';

const rootDir = new URL('..', import.meta.url);
const processes = [
  spawn(process.execPath, ['server/index.mjs'], { cwd: rootDir, stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], { cwd: rootDir, stdio: 'inherit' }),
];

let shuttingDown = false;

const shutdown = (signal = 'SIGTERM') => {
  if (shuttingDown) return;
  shuttingDown = true;
  processes.forEach((child) => {
    if (!child.killed) child.kill(signal);
  });
};

processes.forEach((child) => {
  child.on('error', (error) => {
    console.error(error);
    shutdown();
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      shutdown();
      process.exitCode = code ?? (signal ? 1 : 0);
    }
  });
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
