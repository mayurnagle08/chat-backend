import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, () => {
  process.stdout.write(`Chat API listening on port ${env.PORT}\n`);
});

async function shutdown(signal: string) {
  process.stdout.write(`${signal} received; shutting down\n`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
