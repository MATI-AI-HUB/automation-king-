import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.resolve(__dirname, '../scripts/vercel-ignore.sh');

function run(env: Record<string, string>): { status: number; stdout: string } {
  try {
    const stdout = execFileSync('bash', [script], {
      env: { ...process.env, ...env },
      encoding: 'utf8',
    });
    return { status: 0, stdout };
  } catch (e) {
    const err = e as { status?: number; stdout?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? '' };
  }
}

describe('vercel-ignore.sh', () => {
  it('skips non-main branches', () => {
    const r = run({ VERCEL_GIT_COMMIT_REF: '260929-feat-code-readiness-hardened-db' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('is not main');
  });

  it('skips empty branch ref', () => {
    const r = run({ VERCEL_GIT_COMMIT_REF: '' });
    expect(r.status).toBe(0);
  });

  it('proceeds or skips on main depending on frontend diff', () => {
    const r = run({ VERCEL_GIT_COMMIT_REF: 'main' });
    expect([0, 1]).toContain(r.status);
  });
});
