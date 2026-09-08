import { describe, expect, it } from 'vitest';
import {
  AssignableFuelRoleSchema,
  CreateManagedUserSchema,
  FuelRoleSchema,
  SignInSchema,
  SignUpSchema,
  UpdateManagedUserSchema,
  canApprove,
  isOwnerRole,
} from './index';

describe('authentication contracts', () => {
  it('accepts valid sign-in credentials', () => {
    expect(SignInSchema.parse({ email: 'person@example.com', password: 'password' })).toEqual({
      email: 'person@example.com',
      password: 'password',
    });
  });

  it('requires a business name and an eight-character password for signup', () => {
    expect(() =>
      SignUpSchema.parse({
        name: 'Person',
        email: 'person@example.com',
        password: 'short',
        businessName: 'Business',
      })
    ).toThrow();
    expect(() =>
      SignUpSchema.parse({ name: 'Person', email: 'person@example.com', password: 'password123' })
    ).toThrow();
  });

  it('accepts petrol-pump roles and blocks assigning owner through user management', () => {
    expect(FuelRoleSchema.options).toEqual(['owner', 'manager', 'staff', 'accountant']);
    expect(AssignableFuelRoleSchema.parse('staff')).toBe('staff');
    expect(() => AssignableFuelRoleSchema.parse('owner')).toThrow();
    expect(isOwnerRole('owner')).toBe(true);
    expect(canApprove('manager')).toBe(true);
    expect(canApprove('staff')).toBe(false);
  });

  it('requires a role and password when the owner creates a user', () => {
    expect(
      CreateManagedUserSchema.parse({
        name: 'Cashier',
        email: 'cashier@example.com',
        password: 'password123',
        role: 'staff',
      })
    ).toMatchObject({ role: 'staff' });
    expect(
      UpdateManagedUserSchema.parse({ isActive: false, role: 'accountant' })
    ).toEqual({ isActive: false, role: 'accountant' });
  });
});
