import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, configureApi } from '../services/api/client';

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
  language: string | null;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  setLanguage: (language: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

  // The client reads the token synchronously on every request, so it is kept in a ref
  // as well as state - state alone would hand out a stale token within the same tick.
  const accessTokenRef = useRef<string | null>(null);

  const signOut = useCallback(async () => {
    // Tell the server first so the session row is deactivated, but never let a failed
    // or offline logout trap the user in a signed-in shell.
    try {
      if (accessTokenRef.current) await api.post('/auth/logout');
    } catch {
      // Ignored deliberately - local sign-out must always succeed.
    }
    accessTokenRef.current = null;
    setUser(null);
    setStatus('anonymous');
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]).catch(() => undefined);
  }, []);

  const signIn = useCallback(async (session: Session) => {
    accessTokenRef.current = session.accessToken;
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
    getAccessToken: () => accessTokenRef.current,
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
          accessTokenRef.current = token;
          setUser(JSON.parse(rawUser) as AuthUser);
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

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, language, signIn, signOut, setLanguage }),
    [status, user, language, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.');
  return context;
}
