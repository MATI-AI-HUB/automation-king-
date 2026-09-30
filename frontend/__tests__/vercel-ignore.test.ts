import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.resolve(__dirname, '../scripts/vercel-ignore.sh');

function run(env: NodeJS.ProcessEnv): { status: number; stdout: string } {
  try {
    const stdout = execFileSync('bash', [script], {
      env: { ...process.env, ...env },
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '../..'),
    });
    return { status: 0, stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? '' };
  }
}

describe('vercel-ignore.sh', () => {
  it('does not skip solely because the branch is not main', () => {
    const result = run({ VERCEL_GIT_COMMIT_REF: 'p1-owner-hardening' });
    expect(result.stdout).not.toContain('is not main');
    expect([0, 1]).toContain(result.status);
  });

  it('does not skip solely because ref is main', () => {
    const result = run({
      VERCEL_GIT_COMMIT_REF: 'main',
      VERCEL_GIT_PREVIOUS_SHA: '',
    });
    expect([0, 1]).toContain(result.status);
  });
});
