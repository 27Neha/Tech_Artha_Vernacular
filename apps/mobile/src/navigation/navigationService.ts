import { BackHandler, Alert } from 'react-native';
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

// Core main tabs recognized by the application
export const MAIN_TABS = ['Home', 'Explore', 'Goals', 'Portfolio', 'Profile'] as const;
export type MainTabType = (typeof MAIN_TABS)[number];

// Cross-tab navigation history stack (guarantees Home is initial root)
let tabHistory: string[] = ['Home'];
let isNavigatingBack = false;
let lastBackTime = 0;

// Modal & overlay dismissal registry
interface ModalEntry {
  id: string;
  close: () => void;
}
const activeModals: ModalEntry[] = [];

// Unsaved changes confirmation registry
interface UnsavedChecker {
  id: string;
  isDirty: () => boolean;
  onDiscard?: () => void;
}
const unsavedCheckers: UnsavedChecker[] = [];

// Screen-level custom back handlers (e.g. multi-step forms / wizards)
interface CustomBackHandlerEntry {
  id: string;
  handler: () => boolean | void;
}
const customBackHandlers: CustomBackHandlerEntry[] = [];

// Listeners to notify UI (e.g. Header back button enabled/disabled state)
type NavigationHistoryListener = () => void;
const listeners = new Set<NavigationHistoryListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('[NavigationService] Error in listener', e);
    }
  });
}

export function subscribeNavigationHistory(listener: NavigationHistoryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Record a tab visit in the cross-tab history stack.
 * Prevents consecutive duplicates and ignores transitions during back navigation.
 */
export function recordTabVisit(tabName: string) {
  if (isNavigatingBack) {
    return;
  }
  if (!MAIN_TABS.includes(tabName as MainTabType)) {
    return;
  }

  const lastTab = tabHistory[tabHistory.length - 1];
  if (lastTab !== tabName) {
    tabHistory.push(tabName);
    notifyListeners();
  }
}

/**
 * Register an active modal or bottom-sheet to be closed by Back.
 */
export function registerActiveModal(id: string, close: () => void): () => void {
  // Avoid duplicate registrations
  const existingIdx = activeModals.findIndex((m) => m.id === id);
  if (existingIdx >= 0) {
    activeModals[existingIdx] = { id, close };
  } else {
    activeModals.push({ id, close });
  }
  notifyListeners();

  return () => {
    unregisterActiveModal(id);
  };
}

export function unregisterActiveModal(id: string) {
  const index = activeModals.findIndex((m) => m.id === id);
  if (index >= 0) {
    activeModals.splice(index, 1);
    notifyListeners();
  }
}

/**
 * Register an unsaved-data checker for forms.
 */
export function registerUnsavedChecker(
  id: string,
  isDirty: () => boolean,
  onDiscard?: () => void,
): () => void {
  const existingIdx = unsavedCheckers.findIndex((c) => c.id === id);
  if (existingIdx >= 0) {
    unsavedCheckers[existingIdx] = { id, isDirty, onDiscard };
  } else {
    unsavedCheckers.push({ id, isDirty, onDiscard });
  }

  return () => {
    const idx = unsavedCheckers.findIndex((c) => c.id === id);
    if (idx >= 0) unsavedCheckers.splice(idx, 1);
  };
}

/**
 * Register a screen-level back handler (e.g. multi-step forms like GoalSelection step CONFIGURE -> SELECT).
 */
export function registerCustomBackHandler(id: string, handler: () => boolean | void): () => void {
  const existingIdx = customBackHandlers.findIndex((h) => h.id === id);
  if (existingIdx >= 0) {
    customBackHandlers[existingIdx] = { id, handler };
  } else {
    customBackHandlers.push({ id, handler });
  }
  notifyListeners();

  return () => {
    const idx = customBackHandlers.findIndex((h) => h.id === id);
    if (idx >= 0) {
      customBackHandlers.splice(idx, 1);
      notifyListeners();
    }
  };
}

/**
 * Determine whether a meaningful back action is currently available.
 * Returns true if:
 * 1. An open modal can be dismissed.
 * 2. A custom screen handler is registered (e.g. multi-step wizard).
 * 3. A nested screen stack can go back.
 * 4. The user has a previous visited tab in cross-tab history.
 *
 * On Home, if there is no previous visited tab and no modal/handler, returns false (disabled state).
 */
export function canGlobalGoBack(): boolean {
  if (activeModals.length > 0) {
    return true;
  }

  if (customBackHandlers.length > 0) {
    return true;
  }

  if (navigationRef.isReady()) {
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    const isRootTab = currentRoute && MAIN_TABS.includes(currentRoute as MainTabType);

    // If on a nested screen inside RootStack, check if RootStack can go back
    if (!isRootTab && navigationRef.canGoBack()) {
      return true;
    }

    // If on a main tab (or nested within MainTabs):
    // If on Home, check if there is a previous tab in history
    if (currentRoute === 'Home') {
      return tabHistory.length > 1;
    }

    // If on another main tab (Explore, Goals, Portfolio, Profile):
    // Can always return through tab history to previous tab or Home
    if (isRootTab) {
      return true;
    }

    if (navigationRef.canGoBack()) {
      return true;
    }
  }

  return tabHistory.length > 1;
}

/**
 * Single central handler for ALL back actions (Header Back button & Android Hardware Back).
 * Returns true if the back event was handled and consumed.
 */
export function handleGlobalBack(customOnBack?: () => void): boolean {
  // Rapid clicks protection: 350ms debounce
  const now = Date.now();
  if (now - lastBackTime < 350) {
    return true;
  }
  lastBackTime = now;

  // PRIORITY 1: Dismiss active modal / overlay if open
  if (activeModals.length > 0) {
    const topModal = activeModals.pop();
    if (topModal) {
      topModal.close();
      notifyListeners();
      return true;
    }
  }

  // PRIORITY 2: Check for unsaved changes before leaving
  for (const checker of unsavedCheckers) {
    if (checker.isDirty()) {
      Alert.alert(
        'Unsaved Changes',
        "Your changes haven't been saved. Do you want to leave this page?",
        [
          { text: 'Stay on this page', style: 'cancel' },
          {
            text: 'Leave without saving',
            style: 'destructive',
            onPress: () => {
              if (checker.onDiscard) checker.onDiscard();
              // Proceed with back after confirmation
              executeBackNavigation(customOnBack);
            },
          },
        ],
      );
      return true;
    }
  }

  return executeBackNavigation(customOnBack);
}

/**
 * Executes the actual navigation step after modal & unsaved-changes checks pass.
 */
function executeBackNavigation(customOnBack?: () => void): boolean {
  // PRIORITY 3: Custom screen-specific onBack handler (e.g. multi-step wizard step transition)
  if (customOnBack) {
    customOnBack();
    notifyListeners();
    return true;
  }

  // PRIORITY 3.5: Registered custom screen handler (e.g. multi-step forms like GoalSelection step)
  if (customBackHandlers.length > 0) {
    const topHandler = customBackHandlers[customBackHandlers.length - 1];
    const handled = topHandler.handler();
    if (handled !== false) {
      notifyListeners();
      return true;
    }
  }

  if (!navigationRef.isReady()) {
    return false;
  }

  const currentRoute = navigationRef.getCurrentRoute()?.name || '';
  const isMainTab = MAIN_TABS.includes(currentRoute as MainTabType);

  // PRIORITY 4: Nested screen stack (detail screens, editors, modals)
  // If we are on a screen outside MainTabs and navigation stack can go back:
  if (!isMainTab && navigationRef.canGoBack()) {
    navigationRef.goBack();
    notifyListeners();
    return true;
  }

  // PRIORITY 5: Cross-tab navigation history
  // If on a main tab, navigate back to the previously active tab
  if (tabHistory.length > 1) {
    // Pop current tab
    tabHistory.pop();
    const previousTab = tabHistory[tabHistory.length - 1];

    isNavigatingBack = true;
    navigationRef.navigate('MainTabs', { screen: previousTab });
    setTimeout(() => {
      isNavigatingBack = false;
      notifyListeners();
    }, 150);

    notifyListeners();
    return true;
  }

  // If on a main tab other than Home, but tabHistory had only 1 entry:
  // Gracefully fallback to Home
  if (isMainTab && currentRoute !== 'Home') {
    isNavigatingBack = true;
    tabHistory = ['Home'];
    navigationRef.navigate('MainTabs', { screen: 'Home' });
    setTimeout(() => {
      isNavigatingBack = false;
      notifyListeners();
    }, 150);
    notifyListeners();
    return true;
  }

  // Fallback for deep-linked nested screens with empty stack
  if (!isMainTab) {
    if (currentRoute.includes('Goal')) {
      navigationRef.navigate('MainTabs', { screen: 'Goals' });
    } else if (currentRoute.includes('Fund') || currentRoute.includes('Invest') || currentRoute.includes('Explore')) {
      navigationRef.navigate('MainTabs', { screen: 'Explore' });
    } else if (
      currentRoute.includes('Bank') ||
      currentRoute.includes('Nominee') ||
      currentRoute.includes('Mandate') ||
      currentRoute.includes('Profile') ||
      currentRoute.includes('Setting')
    ) {
      navigationRef.navigate('MainTabs', { screen: 'Profile' });
    } else {
      navigationRef.navigate('MainTabs', { screen: 'Home' });
    }
    notifyListeners();
    return true;
  }

  // Scenario 2: Home is initial screen with no prior history -> Not handled, let system exit or remain
  return false;
}

/**
 * Initialize Android hardware back button handler.
 * Call once in RootNavigator / App.
 */
export function initHardwareBackHandler(): () => void {
  const onHardwareBack = () => {
    return handleGlobalBack();
  };

  const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
  return () => {
    subscription.remove();
  };
}

/**
 * Reset navigation history (e.g. on fresh login or logout).
 */
export function resetNavigationHistory() {
  tabHistory = ['Home'];
  isNavigatingBack = false;
  activeModals.length = 0;
  unsavedCheckers.length = 0;
  customBackHandlers.length = 0;
  notifyListeners();
}
