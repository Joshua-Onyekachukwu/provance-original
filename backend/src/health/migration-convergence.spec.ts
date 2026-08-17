import {
  buildManifestBlock,
  checkCombinedBlock,
  diffFileSets,
  MANIFEST_BEGIN,
  MANIFEST_END,
  normalizeSql,
  parseManifest,
} from './migration-convergence';

/**
 * Fixture factories for the pure convergence helpers — following the
 * notifications.service.spec.ts convention of helper functions at the top of
 * the file and plan-style fixtures consumed in call order.
 */

const FILES = ['0005_organization.sql', '0007_incidents.sql', '0016_role_scopes.sql'];

/** A runbook text with a canonical manifest block for the given file list. */
function manifestRunbook(files: string[] = FILES): string {
  const rows = files
    .map((f, i) => `| ${i + 1} | \`${f}\` |`)
    .join('\n');
  return [
    '# Runbook',
    '',
    `${MANIFEST_BEGIN} — canonical file set + order; do not hand-edit between markers -->`,
    '| # | Migration file |',
    '| - | -------------- |',
    rows,
    MANIFEST_END,
    '',
    'Some prose after the manifest.',
  ].join('\n');
}

/** The on-disk source content a banner's section should byte-match. */
function diskSource(file: string): string {
  const num = file.slice(0, 4);
  const table = file.replace('.sql', '').replace(/^\d{4}_/, '');
  return `-- ${num}: fixture.\ncreate table if not exists public.${table} (id text primary key);\n`;
}

/**
 * A fenced ```sql combined paste block with one banner per file. Each section
 * body is the file's own diskSource (normalized) so the happy path matches
 * byte-for-byte — same contract the real runbook/disk pair has.
 */
function combinedBlock(files: string[] = FILES): string {
  const sections = files
    .map((f) => {
      const num = f.slice(0, 4);
      return [
        '-- =====================================================================',
        `-- MIGRATION ${num} · ${f}`,
        '-- =====================================================================',
        normalizeSql(diskSource(f)),
      ].join('\n');
    })
    .join('\n\n');
  return `Prose before the block.\n\n\`\`\`sql\n${sections}\n\`\`\`\n\nProse after.`;
}

/** Map-backed readFile stub: returns the diskSource for known files, else null. */
function createReadFile(files: string[] = FILES) {
  const map = new Map(files.map((f) => [f, diskSource(f)]));
  return (file: string) => map.get(file) ?? null;
}

describe('normalizeSql', () => {
  it('strips CRLF to LF and lone CRs', () => {
    expect(normalizeSql('a\r\nb\r\nc')).toBe('a\nb\nc');
    // A lone mid-line CR is pure whitespace — stripped, not promoted to LF.
    expect(normalizeSql('a\rb\nc')).toBe('ab\nc');
  });

  it('strips trailing whitespace per line and surrounding blank lines, preserving leading indentation', () => {
    expect(normalizeSql('\n\n  select 1;   \n\n')).toBe('  select 1;');
  });
});

describe('parseManifest', () => {
  it('extracts the documented file list in order', () => {
    expect(parseManifest(manifestRunbook())).toEqual(FILES);
  });

  it('returns null when the BEGIN/END markers are missing', () => {
    expect(parseManifest('# no manifest here')).toBeNull();
  });

  it('returns null when the markers are inverted', () => {
    expect(parseManifest(`${MANIFEST_END}\n${MANIFEST_BEGIN}`)).toBeNull();
  });
});

describe('buildManifestBlock', () => {
  it('round-trips with parseManifest using LF', () => {
    const block = buildManifestBlock(FILES, '\n');
    expect(parseManifest(block)).toEqual(FILES);
  });

  it('respects the given EOL convention', () => {
    const block = buildManifestBlock(FILES, '\r\n');
    expect(block.includes('\r\n')).toBe(true);
    expect(parseManifest(block)).toEqual(FILES);
  });
});

describe('diffFileSets', () => {
  it('reports no drift for the same set in the same order', () => {
    expect(diffFileSets(FILES, [...FILES])).toEqual({
      missing: [],
      extra: [],
      orderDrift: false,
    });
  });

  it('flags a file on disk that the manifest does not document', () => {
    expect(diffFileSets([...FILES, '0022_new.sql'], [...FILES]).missing).toEqual([
      '0022_new.sql',
    ]);
  });

  it('flags a file the manifest documents that is not on disk', () => {
    expect(diffFileSets(FILES, [...FILES, '0022_ghost.sql']).extra).toEqual([
      '0022_ghost.sql',
    ]);
  });

  it('flags order drift when the sets match but the order differs', () => {
    expect(diffFileSets(FILES, [...FILES].reverse()).orderDrift).toBe(true);
  });
});

describe('checkCombinedBlock', () => {
  it('returns null when the runbook has no -- MIGRATION banner at all', () => {
    expect(checkCombinedBlock('no banners here', createReadFile())).toBeNull();
  });

  it('passes every banner when number matches filename and content matches disk', () => {
    const text = combinedBlock(FILES);
    const result = checkCombinedBlock(text, createReadFile());

    expect(result).not.toBeNull();
    expect(result!.count).toBe(3);
    expect(result!.issues).toEqual([]);
  });

  it('flags a banner whose number does not match its filename prefix', () => {
    const text = combinedBlock(FILES).replace(
      '-- MIGRATION 0005 · 0005_organization.sql',
      '-- MIGRATION 0006 · 0005_organization.sql',
    );
    const result = checkCombinedBlock(text, createReadFile());

    expect(result!.issues).toHaveLength(1);
    expect(result!.issues[0].file).toBe('0005_organization.sql');
    expect(result!.issues[0].detail).toContain(
      'banner number 0006 does not match the filename prefix',
    );
  });

  it('flags a content swap under a banner against the on-disk file', () => {
    const text = combinedBlock(FILES).replace(
      'create table if not exists public.role_scopes (id text primary key);',
      '-- [corrupted] content-swap probe line',
    );
    const result = checkCombinedBlock(text, createReadFile());

    expect(result!.issues).toHaveLength(1);
    expect(result!.issues[0].file).toBe('0016_role_scopes.sql');
    expect(result!.issues[0].detail).toContain('content-level mislabel');
  });

  it('flags a banner that references a file missing from disk', () => {
    const text = combinedBlock(FILES);
    const result = checkCombinedBlock(text, () => null);

    expect(result!.issues).toHaveLength(3);
    expect(result!.issues[0].detail).toContain(
      'banner references a migration file that does not exist on disk',
    );
  });

  it('tolerates CRLF/EOL noise without flagging content drift', () => {
    // The runbook block is CRLF while the disk file is LF — both normalize to
    // the same SQL, so no issue is raised.
    const text = combinedBlock(FILES).replace(/\n/g, '\r\n');
    const result = checkCombinedBlock(text, createReadFile());

    expect(result!.issues).toEqual([]);
  });

  it('reports a single issue when a banner exists but matches no banner header inside the fence', () => {
    // `-- MIGRATION` is found (indexOf), but the line does not match the
    // BANNER_RE (requires \d{4} + <file>.sql), so count is 0 with an issue.
    const text = '```sql\n-- MIGRATION nope\n```';
    const result = checkCombinedBlock(text, createReadFile());

    expect(result).not.toBeNull();
    expect(result!.count).toBe(0);
    expect(result!.issues).toHaveLength(1);
    expect(result!.issues[0].detail).toContain('no -- MIGRATION banners');
  });
});
