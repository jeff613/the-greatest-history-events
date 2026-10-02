import { loadDataFiles } from './loadDataFiles';

const CONCURRENCY = 4;
const { eventFiles } = loadDataFiles();
const events = eventFiles.flatMap((f) => f.records as { id: string; wikipedia: string }[]);

const problems: string[] = [];
let next = 0;
async function worker(): Promise<void> {
  while (next < events.length) {
    const { id, wikipedia } = events[next++];
    const res = await fetch(wikipedia, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'User-Agent': 'TheGreatestHistory/0.1 (personal history timeline; link check)' },
    });
    if (res.status >= 300 && res.status < 400) {
      problems.push(`${id}: redirects to ${res.headers.get('location')}`);
    } else if (!res.ok) {
      problems.push(`${id}: HTTP ${res.status} for ${wikipedia}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`all ${events.length} Wikipedia links OK`);
