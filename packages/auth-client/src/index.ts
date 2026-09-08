import {
  AuthClientConfig,
  AuthError,
  AuthSession,
  CreateManagedUserInput,
  CreateManagedUserSchema,
  Organization,
  SignInInput,
  SignUpInput,
  UpdateManagedUserInput,
  UpdateManagedUserSchema,
  UpdateProfileInput,
  UpdateProfileSchema,
  TokenStorage,
  User,
  parseSession,
  parseUser,
} from '@companyio/auth-contracts';

const memoryStorage = (): TokenStorage => {
  let token: string | null = null;

  return {
    get: async () => token,
    set: async (value) => {
      token = value;
    },
    clear: async () => {
      token = null;
    },
  };
};

export const createMemoryStorage = memoryStorage;

export const createBrowserStorage = (): TokenStorage => ({
  get: async () =>
    typeof localStorage === 'undefined' ? null : localStorage.getItem('auth_token'),
  set: async (token) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('auth_token', token);
  },
  clear: async () => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('auth_token');
  },
});

export class AuthClient {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly storage: TokenStorage;
  private readonly requestFetch: typeof fetch;
  private sessionValue: AuthSession | null = null;
  private listeners = new Set<(session: AuthSession | null) => void>();

  constructor(config: AuthClientConfig) {
    const configuredBaseUrl = config.baseUrl.replace(/\/$/, '');
    this.baseUrl = configuredBaseUrl.endsWith('/api/v1')
      ? configuredBaseUrl
      : `${configuredBaseUrl}/api/v1`;
    this.clientId = config.clientId;
    this.storage = config.storage ?? memoryStorage();
    this.requestFetch = (config.fetch ?? globalThis.fetch).bind(globalThis);
  }

  get session(): AuthSession | null {
    return this.sessionValue;
  }

  subscribe(listener: (session: AuthSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async restore(): Promise<AuthSession | null> {
    const token = await this.storage.get();
    if (!token) return null;

    try {
      const session = await this.request<AuthSession>('/auth/session', { method: 'GET' });
      this.setSession(parseSession(session));
      return this.sessionValue;
    } catch {
      try {
        await this.signOut();
      } catch {
        await this.storage.clear();
        this.setSession(null);
      }
      return null;
    }
  }

  async signIn(provider = 'default'): Promise<void> {
    const response = await this.request<{ authorizationUrl: string }>('/auth/authorize', {
      method: 'POST',
      body: JSON.stringify({ clientId: this.clientId, provider }),
    });

    if (typeof window !== 'undefined') {
      window.location.assign(response.authorizationUrl);
    }
  }

  async signInWithPassword(input: SignInInput): Promise<AuthSession> {
    const session = parseSession(
      await this.request<AuthSession>('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    );
    this.setSession(session);
    return session;
  }

  async signUp(input: SignUpInput): Promise<AuthSession> {
    const session = parseSession(
      await this.request<AuthSession>('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    );
    this.setSession(session);
    return session;
  }

  async completeSignIn(code: string, redirectUri: string): Promise<AuthSession> {
    const session = parseSession(
      await this.request<AuthSession>('/auth/callback', {
        method: 'POST',
        body: JSON.stringify({ clientId: this.clientId, code, redirectUri }),
      })
    );
    this.setSession(session);
    return session;
  }

  async getCurrentUser(): Promise<User> {
    return parseUser(await this.request<User>('/users/me'));
  }

  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const response = await this.request<{ session: AuthSession; user: User }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(UpdateProfileSchema.parse(input)),
    });
    this.setSession(parseSession(response.session));
    return parseUser(response.user);
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>('/organizations');
  }

  async listUsers(): Promise<User[]> {
    const users = await this.request<User[]>('/users');
    return users.map((user) => parseUser(user));
  }

  async createUser(input: CreateManagedUserInput): Promise<User> {
    return parseUser(
      await this.request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(CreateManagedUserSchema.parse(input)),
      })
    );
  }

  async updateUser(id: string, input: UpdateManagedUserInput): Promise<User> {
    return parseUser(
      await this.request<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(UpdateManagedUserSchema.parse(input)),
      })
    );
  }

  async signOut(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      await this.storage.clear();
      this.setSession(null);
    }
  }

  private setSession(session: AuthSession | null): void {
    this.sessionValue = session;
    session ? void this.storage.set(session.accessToken) : void this.storage.clear();
    this.listeners.forEach((listener) => listener(session));
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.storage.get();
    let response: Response;

    try {
      response = await this.requestFetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'X-Client-Id': this.clientId,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
    } catch {
      throw {
        code: 'NETWORK_ERROR',
        message: `Unable to reach the API at ${this.baseUrl}. Start the API with "pnpm --filter @companyio/api dev" and try again.`,
      } satisfies AuthError;
    }

    if (!response.ok) {
      throw await this.toAuthError(response);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private async toAuthError(response: Response): Promise<AuthError> {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    const code: AuthError['code'] =
      response.status === 401
        ? 'UNAUTHENTICATED'
        : response.status === 403
          ? 'FORBIDDEN'
          : response.status < 500
            ? 'INVALID_REQUEST'
            : 'UNKNOWN';

    return {
      code,
      message: body?.message ?? 'Authentication request failed.',
      status: response.status,
    };
  }
}
