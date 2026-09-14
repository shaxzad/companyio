import { describe, expect, it, vi } from 'vitest';
import { AuthClient, createMemoryStorage } from './index';

const user = {
  id: 'user-1',
  email: 'person@example.com',
  name: 'Test Person',
  role: 'owner' as const,
  isActive: true,
  main_business_id: 'business-1',
  branch_id: 'branch-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const session = { accessToken: 'token-1', expiresAt: Date.now() + 60_000, user };

describe('AuthClient', () => {
  it('signs in with a password and persists the access token', async () => {
    const requestFetch: typeof fetch = vi.fn(
      async (input: URL | RequestInfo) =>
        new Response(
          input.toString().endsWith('/auth/sign-in')
            ? JSON.stringify(session)
            : JSON.stringify(user),
          { status: 200 }
        )
    );
    const client = new AuthClient({
      baseUrl: 'http://localhost:3000',
      clientId: 'test-client',
      storage: createMemoryStorage(),
      fetch: requestFetch,
    });

    await expect(
      client.signInWithPassword({ email: user.email, password: 'password' })
    ).resolves.toEqual(session);
    await expect(client.getCurrentUser()).resolves.toEqual(user);
    expect(requestFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/sign-in',
      expect.objectContaining({ method: 'POST' })
    );
    expect(requestFetch).toHaveBeenLastCalledWith(
      'http://localhost:3000/api/v1/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-1' }),
      })
    );
  });

  it('clears the session when the API rejects restoration', async () => {
    const storage = createMemoryStorage();
    await storage.set('expired-token');
    const requestFetch: typeof fetch = vi.fn(async (input: URL | RequestInfo) =>
      input.toString().endsWith('/auth/logout')
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify({ message: 'Session expired.' }), { status: 401 })
    );
    const client = new AuthClient({
      baseUrl: 'http://localhost:3000',
      clientId: 'test-client',
      storage,
      fetch: requestFetch,
    });

    await expect(client.restore()).resolves.toBeNull();
    await expect(storage.get()).resolves.toBeNull();
    expect(client.session).toBeNull();
  });

  it('creates a staff user for the owner', async () => {
    const created = {
      ...user,
      id: 'user-2',
      email: 'cashier@example.com',
      name: 'Cashier',
      role: 'staff' as const,
    };
    const requestFetch: typeof fetch = vi.fn(
      async () => new Response(JSON.stringify(created), { status: 201 })
    );
    const storage = createMemoryStorage();
    await storage.set('token-1');
    const client = new AuthClient({
      baseUrl: 'http://localhost:3000',
      clientId: 'test-client',
      storage,
      fetch: requestFetch,
    });

    await expect(
      client.createUser({
        name: 'Cashier',
        email: 'cashier@example.com',
        password: 'password123',
        role: 'staff',
      })
    ).resolves.toEqual(created);
    expect(requestFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/users',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
