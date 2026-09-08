import { z } from 'zod';

export const FuelRoleSchema = z.enum(['owner', 'manager', 'staff', 'accountant']);
export type FuelRole = z.infer<typeof FuelRoleSchema>;

export const ASSIGNABLE_FUEL_ROLES = ['manager', 'staff', 'accountant'] as const;
export const AssignableFuelRoleSchema = z.enum(ASSIGNABLE_FUEL_ROLES);
export type AssignableFuelRole = z.infer<typeof AssignableFuelRoleSchema>;

export const isOwnerRole = (role: FuelRole) => role === 'owner';
export const canApprove = (role: FuelRole) => role === 'owner' || role === 'manager';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  role: FuelRoleSchema,
  isActive: z.boolean(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  facebookUrl: z.string().url().or(z.literal('')).optional(),
  xUrl: z.string().url().or(z.literal('')).optional(),
  linkedinUrl: z.string().url().or(z.literal('')).optional(),
  instagramUrl: z.string().url().or(z.literal('')).optional(),
  main_business_id: z.string().min(1),
  branch_id: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member']),
  main_business_id: z.string().min(1),
  branch_id: z.string().min(1),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const SessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
  user: UserSchema,
});

export type AuthSession = z.infer<typeof SessionSchema>;

export type AuthErrorCode =
  'UNAUTHENTICATED' | 'FORBIDDEN' | 'INVALID_REQUEST' | 'NETWORK_ERROR' | 'UNKNOWN';

export type AuthError = {
  code: AuthErrorCode;
  message: string;
  status?: number;
};

export const SignUpSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  businessName: z.string().min(1).max(120),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type SignInInput = z.infer<typeof SignInSchema>;

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().max(40),
  bio: z.string().max(500),
  facebookUrl: z.string().url().or(z.literal('')),
  xUrl: z.string().url().or(z.literal('')),
  linkedinUrl: z.string().url().or(z.literal('')),
  instagramUrl: z.string().url().or(z.literal('')),
  main_business_id: z.string().min(1),
  branch_id: z.string().min(1),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export type AuthClientConfig = {
  baseUrl: string;
  clientId: string;
  storage?: TokenStorage;
  fetch?: typeof fetch;
};

export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

export type AuthApi = {
  session: AuthSession;
  user: User;
  organizations: Organization[];
};

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

export type CreateInvitation = z.infer<typeof CreateInvitationSchema>;

export const CreateManagedUserSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: AssignableFuelRoleSchema,
});

export type CreateManagedUserInput = z.infer<typeof CreateManagedUserSchema>;

export const UpdateManagedUserSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  role: AssignableFuelRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

export type UpdateManagedUserInput = z.infer<typeof UpdateManagedUserSchema>;

export const authErrorMessage = (caught: unknown, fallback = 'The request could not be completed.') => {
  if (
    caught &&
    typeof caught === 'object' &&
    'message' in caught &&
    typeof caught.message === 'string' &&
    caught.message.length > 0
  ) {
    return caught.message;
  }
  if (caught instanceof Error && caught.message) return caught.message;
  return fallback;
};
