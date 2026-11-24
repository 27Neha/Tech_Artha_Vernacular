/**
 * The mutable auth store that screens import as `authStore`.
 *
 * Bridge onto the real session in AuthContext, which makes keychain
 * persistence and 401 handling apply cleanly across the app.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

const state: { accessToken: string | null; userId: string | null; language: string | null } = {
  accessToken: null,
  userId: null,
  language: null,
};

function emit() {
  [...listeners].forEach((listener) => listener());
}

export const authStore = {
  get accessToken(): string | null {
    return state.accessToken;
  },
  set accessToken(value: string | null | undefined) {
    const next = value ?? null;
    if (next === state.accessToken) return;
    state.accessToken = next;
    emit();
  },
  get userId(): string | null {
    return state.userId;
  },
  set userId(value: string | null | undefined) {
    const next = value ?? null;
    if (next === state.userId) return;
    state.userId = next;
    emit();
  },
  get language(): string | null {
    return state.language;
  },
  set language(value: string | null | undefined) {
    const next = value ?? null;
    if (next === state.language) return;
    state.language = next;
    emit();
  },
};

/** Subscribes to token changes. Returns the unsubscribe function. */
export function subscribeToAuthStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Applies a change without notifying - used by AuthProvider when it is itself the origin
 * of the change (keychain hydration, sign-out), so it does not react to its own write.
 */
export function setAuthStoreSilently(accessToken: string | null, userId: string | null) {
  state.accessToken = accessToken;
  state.userId = userId;
}
