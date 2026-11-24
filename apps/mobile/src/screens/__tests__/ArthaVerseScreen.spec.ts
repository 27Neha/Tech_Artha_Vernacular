/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DESTINATION_CARDS,
  DESTINATION_LABELS,
  resolveDestinationDeepLink,
  resolveDestinationTap,
} from '../ArthaVerseScreen';

describe('ArthaVerse destination cards & navigation guard', () => {
  const screenSrc = readFileSync(join(__dirname, '../ArthaVerseScreen.tsx'), 'utf8');
  const appSrc = readFileSync(join(__dirname, '../../../App.tsx'), 'utf8');

  it('declares all 7 existing destinations with unique IDs, titles, descriptions, and icons', () => {
    const ids = DESTINATION_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'markets',
      'news',
      'explorer',
      'intelligence',
      'play',
      'academy',
      'research',
    ]);

    for (const card of DESTINATION_CARDS) {
      expect(card.title.trim().length).toBeGreaterThan(0);
      expect(card.description.trim().length).toBeGreaterThan(0);
      expect(String(card.icon).trim().length).toBeGreaterThan(0);
    }

    // Every in-screen destination has a display label
    for (const id of ['markets', 'news', 'explorer', 'play', 'academy', 'research'] as const) {
      expect(DESTINATION_LABELS[id]).toBeTruthy();
    }
  });

  it('routes every destination card tap to its exact existing section or Funds screen without duplicates', () => {
    // Fund Intelligence opens the existing Funds discovery screen
    expect(resolveDestinationTap('intelligence', 'all')).toEqual({ route: 'Funds' });
    expect(resolveDestinationTap('intelligence', 'markets')).toEqual({ route: 'Funds' });

    // Every in-screen destination selects that section and scrolls to it
    for (const id of ['markets', 'news', 'explorer', 'play', 'academy', 'research'] as const) {
      expect(resolveDestinationTap(id, 'all')).toEqual({
        nextTab: id,
        shouldScrollToSection: true,
      });

      // Tapping the already-active card toggles cleanly back to all destinations
      expect(resolveDestinationTap(id, id)).toEqual({
        nextTab: 'all',
        shouldScrollToSection: false,
      });
    }
  });

  it('maps HomeScreen and deep-link section params safely (including studio -> explorer)', () => {
    expect(resolveDestinationDeepLink('markets')).toBe('markets');
    expect(resolveDestinationDeepLink('studio')).toBe('explorer');
    expect(resolveDestinationDeepLink('explorer')).toBe('explorer');
    expect(resolveDestinationDeepLink('news')).toBe('news');
    expect(resolveDestinationDeepLink('play')).toBe('play');
    expect(resolveDestinationDeepLink('academy')).toBe('academy');
    expect(resolveDestinationDeepLink('research')).toBe('research');
    expect(resolveDestinationDeepLink('unknown')).toBeNull();
    expect(resolveDestinationDeepLink(undefined)).toBeNull();
  });

  it('keeps the destination card section unconditionally rendered and preserves Hero + Market Boulevard/NIFTY 50', () => {
    // Destination grid is always rendered directly after the Hero Banner (not gated by loading or activeTab)
    expect(screenSrc).toContain('testID="arthaverse-hero-banner"');
    expect(screenSrc).toContain('testID="arthaverse-destination-grid"');
    expect(screenSrc).toContain('DESTINATION_CARDS.map((card) =>');
    expect(screenSrc).toContain('MarketPulseCard');
    expect(screenSrc).toContain('MarketBriefCard');
    expect(screenSrc).toContain('MarketStoriesSection');
    expect(screenSrc).toContain('MarketDetailModal');

    // Old horizontal text tab bar remains completely removed
    expect(screenSrc).not.toContain('subFilterScroll');
    expect(screenSrc).not.toContain('subTabPill');
    expect(screenSrc).not.toContain('filterScroll');
  });

  it('labels the bottom tab as ArthaVerse instead of Explore while preserving internal route compatibility', () => {
    expect(appSrc).toContain("tabRoute.name === 'Explore' ? 'ArthaVerse' : tabRoute.name");
    expect(appSrc).toContain('<Tab.Screen name="Explore" component={ArthaVerseScreen} />');
  });
});
