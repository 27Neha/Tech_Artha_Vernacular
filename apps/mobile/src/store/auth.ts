/**
 * The mutable auth store that 11 screens import as `authStore`.
 *
 * The cherry-picked commit (b657c9f) imports this module from every screen that makes an
 * authenticated request, but does not contain it - the file was never committed, so those
 * screens could not compile. Rather than restore the original plain object, this is a
 * bridge onto the real session in AuthContext, which is what makes the keychain
 * persistence and the 401 handling apply to those screens too.
 *
 * Reading `authStore.accessToken` is synchronous because callers use it inline when
 * building a fetch header. Writing it - which LoginScreen and SignupScreen do after a
 * successful login - notifies AuthProvider, which persists the token to the device
 * keychain and flips the navigator into the signed-in stack. Assigning null signs out.
 *
 * This is the one source of truth for the token: the api client reads it through the
 * same getter, so a screen using raw fetch and a screen using the client cannot end up
 * authenticated as different users.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

const state: { accessToken: string | null; userId: string | null } = {
  accessToken: null,
  userId: null,
};

function emit() {
  // A copy, because a listener that unsubscribes while we iterate would otherwise
  // mutate the set mid-loop.
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
