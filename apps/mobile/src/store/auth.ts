export interface AuthStore {
  accessToken: string | null;
  userId: string | null;
  language: string | null;
}

export const authStore: AuthStore = {
  accessToken: null,
  userId: null,
  language: null,
};
