import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'frontend/scripts/vercel-ignore.sh');

function runIgnore(cwd: string, extraEnv: Record<string, string> = {}) {
  const r = spawnSync('bash', [SCRIPT], {
    cwd,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
  });
  return { status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}

function git(cwd: string, args: string[]) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  }
  return (r.stdout || '').trim();
}

function initRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'vercel-ignore-'));
  git(dir, ['init']);
  git(dir, ['config', 'user.email', 'matiailearninghub@gmail.com']);
  git(dir, ['config', 'user.name', 'MATI-AI-HUB']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  mkdirSync(join(dir, 'frontend'), { recursive: true });
  mkdirSync(join(dir, 'frontend/scripts'), { recursive: true });
  mkdirSync(join(dir, 'worker'), { recursive: true });
  writeFileSync(join(dir, 'frontend/scripts/vercel-ignore.sh'), readFileSync(SCRIPT, 'utf8'));
  chmodSync(join(dir, 'frontend/scripts/vercel-ignore.sh'), 0o755);
  return dir;
}

describe('vercel-ignore.sh', () => {
  it('builds when the repo has a single commit with no HEAD^ (initial clone)', () => {
    const dir = initRepo();
    writeFileSync(join(dir, 'frontend/index.txt'), 'web');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-m', 'feat: initial frontend']);
    const r = runIgnore(dir);
    expect(r.status).toBe(1);
  });

  it('skips when HEAD only changes worker/ (no frontend/ diff vs HEAD^)', () => {
    const dir = initRepo();
    writeFileSync(join(dir, 'frontend/index.txt'), 'web');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-m', 'feat: frontend']);
    writeFileSync(join(dir, 'worker/job.js'), 'console.log(1)');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-m', 'chore: worker only']);
    const r = runIgnore(dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/skipping Vercel build/i);
  });

  it('builds when HEAD changes frontend/', () => {
    const dir = initRepo();
    writeFileSync(join(dir, 'frontend/index.txt'), 'web');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-m', 'feat: frontend']);
    writeFileSync(join(dir, 'frontend/index.txt'), 'web-2');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-m', 'fix: frontend copy']);
    const r = runIgnore(dir);
    expect(r.status).toBe(1);
  });

  it('uses VERCEL_GIT_PREVIOUS_SHA when that commit exists', () => {
    const dir = initRepo();
    writeFileSync(join(dir, 'frontend/index.txt'), 'web');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-m', 'feat: frontend']);
    const prev = git(dir, ['rev-parse', 'HEAD']);
    writeFileSync(join(dir, 'worker/job.js'), 'ok');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-m', 'chore: worker']);
    const skip = runIgnore(dir, { VERCEL_GIT_PREVIOUS_SHA: prev });
    expect(skip.status).toBe(0);

    writeFileSync(join(dir, 'frontend/index.txt'), 'web-3');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-m', 'fix: frontend again']);
    const build = runIgnore(dir, { VERCEL_GIT_PREVIOUS_SHA: prev });
    expect(build.status).toBe(1);
    expect(build.stdout).toMatch(/frontend\/ changed/i);
  });

  it('falls back to HEAD^ when VERCEL_GIT_PREVIOUS_SHA is unknown', () => {
    const dir = initRepo();
    writeFileSync(join(dir, 'frontend/index.txt'), 'web');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-m', 'feat: frontend']);
    writeFileSync(join(dir, 'worker/job.js'), 'ok');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-m', 'chore: worker']);
    const r = runIgnore(dir, {
      VERCEL_GIT_PREVIOUS_SHA: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    expect(r.status).toBe(0);
  });
});

describe('repo git log simulation (main / p1-owner-hardening last 5)', () => {
  it('documents skip vs build for the last 5 commits on this clone', () => {
    const log = spawnSync(
      'git',
      ['log', '--format=%h %s', '-5', 'HEAD'],
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(log.status).toBe(0);
    const lines = (log.stdout || '').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);

    const results = lines.map((line) => {
      const sha = line.split(' ')[0];
      const names = spawnSync(
        'git',
        ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', sha, '--', 'frontend/'],
        { cwd: ROOT, encoding: 'utf8' },
      );
      const frontendFiles = (names.stdout || '').trim().split('\n').filter(Boolean);
      const parent = spawnSync('git', ['rev-parse', `${sha}^`], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      let decision: 'BUILD' | 'SKIP';
      if (parent.status !== 0) {
        decision = 'BUILD';
      } else {
        const diff = spawnSync(
          'git',
          ['diff', '--quiet', parent.stdout.trim(), sha, '--', 'frontend/'],
          { cwd: ROOT },
        );
        decision = diff.status === 0 ? 'SKIP' : 'BUILD';
      }
      return { sha, subject: line.slice(sha.length).trim(), frontendFiles: frontendFiles.length, decision };
    });

    for (const row of results) {
      if (row.frontendFiles === 0) expect(row.decision).toBe('SKIP');
      else expect(row.decision).toBe('BUILD');
    }
  });
});
