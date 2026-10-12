import type { NavigationProp } from '@react-navigation/native';

/**
 * Tab order inside MainTabs, mirroring the <Tab.Screen> list in App.tsx.
 *
 * A tab navigator draws its bar from the routes present in its state, so resetting
 * with only the destination tab would leave the investor on a bar with one tab on it.
 * The whole list is therefore restated here, and
 * src/utils/__tests__/navigation.spec.ts reads App.tsx to assert the two agree - the
 * failure mode of silent drift is a tab that vanishes, which is easy to miss.
 */
export const MAIN_TAB_ROUTES = ['Home', 'Portfolio', 'Expenses', 'Learn', 'Profile'] as const;

export type MainTabName = (typeof MAIN_TAB_ROUTES)[number];

/**
 * Leaves onboarding for the main app, landing on `tab`.
 *
 * Onboarding (KYC -> risk assessment -> goal -> bucket) is a stack the investor is
 * pushed through, and every step is a prerequisite for investing rather than for using
 * the app. Someone who has finished KYC is entitled to stop there and pick a bucket
 * another day, so each step offers this exit.
 *
 * reset() rather than navigate(): it discards the onboarding stack, so the hardware
 * back gesture cannot walk back into a half-finished assessment that the investor has
 * already left.
 */
export function exitOnboarding(navigation: NavigationProp<any>, tab: MainTabName = 'Profile') {
  navigation.reset({
    index: 0,
    routes: [
      {
        name: 'MainTabs',
        state: {
          index: MAIN_TAB_ROUTES.indexOf(tab),
          routes: MAIN_TAB_ROUTES.map((name) => ({ name })),
        },
      },
    ],
  });
}
