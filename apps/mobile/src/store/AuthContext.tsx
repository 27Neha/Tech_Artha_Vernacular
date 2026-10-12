import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, configureApi } from '../services/api/client';
import { authStore, setAuthStoreSilently, subscribeToAuthStore } from './auth';

/**
 * Authentication state.
 *
 * Replaces the old `authStore`, a plain mutable module object. That had two defects:
 * the session was lost on every app restart because nothing persisted it, and mutating
 * a module object does not re-render React, so logout and session expiry could never
 * propagate to the UI.
 *
 * Tokens live in the device keychain/keystore via expo-secure-store - not AsyncStorage,
 * which is unencrypted and unsuitable for a credential granting access to KYC and
 * investment data.
 *
 * The token itself is held in ./auth, because the screens merged from b657c9f assign to
 * `authStore.accessToken` directly. This provider owns the persistence and the status
 * around it, so those assignments get the keychain and the navigator reset for free
 * instead of being a second, divergent session.
 */

const ACCESS_TOKEN_KEY = 'techartha.accessToken';
const REFRESH_TOKEN_KEY = 'techartha.refreshToken';
const USER_KEY = 'techartha.user';

export type AuthUser = { id: string; mobile: string };

/** What POST /auth/verify-otp returns (AuthService.createSession). */
export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  user: AuthUser;
};

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  // authStore is read synchronously on every request, by this client and by the merged
  // screens that build their own fetch headers. State alone would hand out a stale token
  // within the same tick, which is why the token does not live in useState.

  const signOut = useCallback(async () => {
    // Tell the server first so the session row is deactivated, but never let a failed
    // or offline logout trap the user in a signed-in shell.
    try {
      if (authStore.accessToken) await api.post('/auth/logout');
    } catch {
      // Ignored deliberately - local sign-out must always succeed.
    }
    // Silently: this provider is the origin of the change, so it must not react to its
    // own write and recurse back into signOut.
    setAuthStoreSilently(null, null);
    setUser(null);
    setStatus('anonymous');
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]).catch(() => undefined);
  }, []);

  const signIn = useCallback(async (session: Session) => {
    setAuthStoreSilently(session.accessToken, session.user?.id ?? null);
    setUser(session.user);
    setStatus('authenticated');
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user)),
    ]).catch(() => undefined);
  }, []);

  // Register with the API client before any screen can fire a request.
  configureApi({
    getAccessToken: () => authStore.accessToken,
    onUnauthorized: () => {
      // The server rejected the token; drop straight to the login stack rather than
      // leaving the user tapping a screen that silently fails.
      void signOut();
    },
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [token, rawUser] = await Promise.all([
          SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (cancelled) return;

        if (token && rawUser) {
          const hydrated = JSON.parse(rawUser) as AuthUser;
          setAuthStoreSilently(token, hydrated.id ?? null);
          setUser(hydrated);
          setStatus('authenticated');
          return;
        }
      } catch {
        // Keychain unavailable or corrupt entry - treat as signed out.
      }
      if (!cancelled) setStatus('anonymous');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // A screen assigning authStore.accessToken after its own login fetch is a sign-in that
  // did not come through signIn(), so persist it and move the navigator. Assigning null
  // is a sign-out. Without this the merged screens would hold a token that vanished on
  // restart and never reached the keychain.
  useEffect(
    () =>
      subscribeToAuthStore(() => {
        const token = authStore.accessToken;
        if (!token) {
          void signOut();
          return;
        }
        const nextUser: AuthUser = { id: authStore.userId ?? '', mobile: user?.mobile ?? '' };
        setUser(nextUser);
        setStatus('authenticated');
        void Promise.all([
          SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token),
          SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser)),
        ]).catch(() => undefined);
      }),
    [signOut, user?.mobile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut }),
    [status, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.');
  return context;
}
