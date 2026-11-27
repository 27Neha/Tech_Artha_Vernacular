import { BackHandler, Alert } from 'react-native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { authStore } from '../store/auth';

export const navigationRef = createNavigationContainerRef<any>();

// Core main tabs recognized by the application (in exact bottom-bar order)
export const MAIN_TABS = ['Home', 'Portfolio', 'Assistant', 'Expenses', 'Profile'] as const;
export type MainTabType = (typeof MAIN_TABS)[number];

// Unauthenticated screens where users must never be redirected to Home/MainTabs on Back
const UNAUTH_ROUTES = new Set([
  'Welcome',
  'Language',
  'Signup',
  'Login',
  'ForgotPassword',
  'ForgotPasswordOtp',
  'ResetPassword',
  'PasswordResetSuccess',
]);

// Cross-tab navigation history stack (guarantees Home is initial root for authenticated tabs)
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
 * Register a screen-level back handler (e.g. multi-step forms like Signup/Login/GoalSelection).
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
 */
export function canGlobalGoBack(): boolean {
  if (activeModals.length > 0) {
    return true;
  }

  if (customBackHandlers.length > 0) {
    return true;
  }

  if (navigationRef.isReady()) {
    const currentRoute = navigationRef.getCurrentRoute()?.name || '';
    if (currentRoute === 'Welcome') {
      return navigationRef.canGoBack();
    }
    if (UNAUTH_ROUTES.has(currentRoute)) {
      return true;
    }

    const isRootTab = currentRoute && MAIN_TABS.includes(currentRoute as MainTabType);

    if (!isRootTab && navigationRef.canGoBack()) {
      return true;
    }

    if (currentRoute === 'Home') {
      return tabHistory.length > 1;
    }

    if (isRootTab) {
      return true;
    }

    if (navigationRef.canGoBack()) {
      return true;
    }
  }

  return Boolean(authStore.accessToken) && tabHistory.length > 1;
}

/**
 * Single central handler for ALL back actions (Header Back button & Android Hardware Back).
 * Returns true if the back event was handled and consumed.
 */
export function handleGlobalBack(customOnBack?: () => void): boolean {
  const now = Date.now();
  if (now - lastBackTime < 300) {
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

  // PRIORITY 3.5: Registered custom screen handler (e.g. multi-step forms)
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
  const isAuthenticated = Boolean(authStore.accessToken);
  const isUnauthScreen = UNAUTH_ROUTES.has(currentRoute) || !isAuthenticated;
  const isMainTab = MAIN_TABS.includes(currentRoute as MainTabType);

  // PRIORITY 4: Unauthenticated / onboarding screens must NEVER fall back to MainTabs/Home
  if (isUnauthScreen) {
    if (currentRoute === 'Welcome' && !navigationRef.canGoBack()) {
      return false;
    }
    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
      notifyListeners();
      return true;
    }
    if (currentRoute !== 'Welcome') {
      navigationRef.navigate('Welcome');
      notifyListeners();
      return true;
    }
    return false;
  }

  // PRIORITY 5: Nested screen stack (detail screens, editors, modals)
  if (!isMainTab && navigationRef.canGoBack()) {
    navigationRef.goBack();
    notifyListeners();
    return true;
  }

  // PRIORITY 6: Cross-tab navigation history for authenticated MainTabs
  if (tabHistory.length > 1) {
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

  // If on a main tab other than Home, fallback to Home
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

  // Fallback for deep-linked authenticated screens with empty stack
  if (!isMainTab && isAuthenticated) {
    if (currentRoute.includes('Goal')) {
      navigationRef.navigate('MainTabs', { screen: 'Portfolio', params: { tab: 'goals' } });
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

  return false;
}

/**
 * Initialize Android hardware back button handler.
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
