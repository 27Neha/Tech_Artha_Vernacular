/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Every screen a navigate() call names must be registered in App.tsx.
 *
 * React Navigation does not fail a build - or even a render - for an unknown route. It
 * throws at the moment of the tap, as "The action 'NAVIGATE' with payload ... was not
 * handled by any navigator", which only surfaces if a human happens to press that
 * button. Two of these were live at once: FundsScreen navigated to 'FundDetails' while
 * the route is 'FundDetail', and SignupScreen navigated to 'ProfileSetup', which has
 * never existed - so finishing signup dead-ended.
 *
 * Route names are strings on both sides, so the type system cannot help here; reading
 * the files is the only way to check it cheaply.
 */
const root = join(__dirname, '../../..');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.tsx') ? [full] : [];
  });

const app = readFileSync(join(root, 'App.tsx'), 'utf8');
const registered = new Set([...app.matchAll(/(?:Stack|Tab)\.Screen\s+name="([A-Za-z]+)"/g)].map((m) => m[1]));

const NAVIGATE = /navigation\.(?:navigate|replace|push)\(\s*['"]([A-Za-z]+)['"]/g;
const RESET = /routes:\s*\[\s*\{\s*name:\s*['"]([A-Za-z]+)['"]/g;

const targets = new Map<string, string[]>();
for (const file of walk(join(root, 'src'))) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of [NAVIGATE, RESET]) {
    for (const match of text.matchAll(pattern)) {
      const line = text.slice(0, match.index ?? 0).split('\n').length;
      const where = `${file.replace(root + '/', '')}:${line}`;
      targets.set(match[1], [...(targets.get(match[1]) ?? []), where]);
    }
  }
}

describe('navigation targets', () => {
  it('registers every screen that something navigates to', () => {
    // Collected rather than asserted one at a time, so a failure names every broken
    // destination at once instead of stopping at the first.
    const broken = [...targets.entries()]
      .filter(([name]) => !registered.has(name))
      .map(([name, where]) => `${name} (from ${[...new Set(where)].join(', ')})`);

    expect(broken).toEqual([]);
  });

  it('finds the navigator and some targets, so the test cannot pass by reading nothing', () => {
    // Guards the regexes themselves: if App.tsx is restructured and these stop matching,
    // the test above would silently pass with two empty sets.
    expect(registered.size).toBeGreaterThan(10);
    expect(targets.size).toBeGreaterThan(10);
  });

  it('keeps the tab routes exitOnboarding resets to registered', () => {
    ['Home', 'Portfolio', 'Expenses', 'Assistant', 'Profile'].forEach((tab) =>
      expect(registered.has(tab)).toBe(true),
    );
  });
});
