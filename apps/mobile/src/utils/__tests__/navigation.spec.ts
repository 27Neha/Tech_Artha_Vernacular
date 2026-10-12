/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import { MAIN_TAB_ROUTES, exitOnboarding } from '../navigation';

/**
 * exitOnboarding resets the navigator with an explicit list of tab routes, because a tab
 * navigator draws its bar from the routes in its state. That list is a copy of the
 * <Tab.Screen> names in App.tsx, and a copy can drift - adding a tab there and not here
 * would make the new tab disappear for anyone who left onboarding early, which is
 * exactly the kind of bug nobody reproduces.
 */
describe('MAIN_TAB_ROUTES', () => {
  it('matches the Tab.Screen names declared in App.tsx, in order', () => {
    const app = readFileSync(join(__dirname, '../../../App.tsx'), 'utf8');
    const declared = [...app.matchAll(/<Tab\.Screen\s+name="([^"]+)"/g)].map((m) => m[1]);
    expect(declared).toEqual([...MAIN_TAB_ROUTES]);
  });
});

describe('exitOnboarding', () => {
  const resetWith = (tab?: Parameters<typeof exitOnboarding>[1]) => {
    const reset = jest.fn();
    exitOnboarding({ reset } as never, tab);
    return reset.mock.calls[0][0];
  };

  it('lands on the Profile tab by default', () => {
    const action = resetWith();
    const tabState = action.routes[0].state;
    expect(action.routes[0].name).toBe('MainTabs');
    expect(tabState.routes[tabState.index].name).toBe('Profile');
  });

  it('can land on any other tab', () => {
    const tabState = resetWith('Portfolio').routes[0].state;
    expect(tabState.routes[tabState.index].name).toBe('Portfolio');
  });

  it('keeps every tab in state so the tab bar stays complete', () => {
    const tabState = resetWith().routes[0].state;
    expect(tabState.routes.map((r: { name: string }) => r.name)).toEqual([...MAIN_TAB_ROUTES]);
  });

  it('replaces the stack rather than pushing, so back cannot re-enter onboarding', () => {
    // index 0 with a single route is what discards the onboarding history; a navigate()
    // here would leave the half-finished assessment reachable by the back gesture.
    const action = resetWith();
    expect(action.index).toBe(0);
    expect(action.routes).toHaveLength(1);
  });
});
