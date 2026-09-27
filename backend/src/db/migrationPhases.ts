import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

interface MigrationEntry {
  idx: number;
  tag: string;
  when: number;
  version: string;
  breakpoints: boolean;
}

interface MigrationJournal {
  version: string;
  dialect: string;
  entries: MigrationEntry[];
}

export function selectMigrationEntries(
  journal: MigrationJournal,
  throughIndex: number,
): MigrationJournal {
  return {
    ...journal,
    entries: journal.entries.filter(entry => entry.idx <= throughIndex),
  };
}

export async function createMigrationPhaseFolder(
  migrationsFolder: string,
  throughIndex: number,
): Promise<string> {
  const phaseFolder = await mkdtemp(path.join(tmpdir(), 'kompcards-migrations-'));
  const metaFolder = path.join(phaseFolder, 'meta');
  await mkdir(metaFolder);

  const journal = JSON.parse(
    await readFile(path.join(migrationsFolder, 'meta', '_journal.json'), 'utf8'),
  ) as MigrationJournal;
  const selected = selectMigrationEntries(journal, throughIndex);

  await writeFile(
    path.join(metaFolder, '_journal.json'),
    `${JSON.stringify(selected, null, 2)}\n`,
  );
  await Promise.all(selected.entries.map(entry => cp(
    path.join(migrationsFolder, `${entry.tag}.sql`),
    path.join(phaseFolder, `${entry.tag}.sql`),
  )));

  return phaseFolder;
}
