interface TokenStore {
  set(userId: string, refreshToken: string): void;
  get(userId: string): string | undefined;
}

class InMemoryTokenStore implements TokenStore {
  private store = new Map<string, string>();

  set(userId: string, refreshToken: string): void {
    this.store.set(userId, refreshToken);
  }

  get(userId: string): string | undefined {
    return this.store.get(userId);
  }
}

const globalForTokens = globalThis as unknown as { tokenStore: TokenStore };

export const tokenStore: TokenStore =
  globalForTokens.tokenStore ?? new InMemoryTokenStore();

if (process.env.NODE_ENV !== "production") {
  globalForTokens.tokenStore = tokenStore;
}
