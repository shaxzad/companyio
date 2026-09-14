import { z } from 'zod';

export const FUEL_ROLES = ['owner', 'manager', 'staff', 'accountant'] as const;
export const FuelRoleSchema = z.enum(FUEL_ROLES);
export type FuelRole = (typeof FUEL_ROLES)[number];

export const ASSIGNABLE_FUEL_ROLES = ['manager', 'staff', 'accountant'] as const;
export const AssignableFuelRoleSchema = z.enum(ASSIGNABLE_FUEL_ROLES);
export type AssignableFuelRole = (typeof ASSIGNABLE_FUEL_ROLES)[number];

export const isFuelRole = (value: unknown): value is FuelRole =>
  typeof value === 'string' && (FUEL_ROLES as readonly string[]).includes(value);

export const isOwnerRole = (role: FuelRole) => role === 'owner';
export const canApprove = (role: FuelRole) => role === 'owner' || role === 'manager';

export type User = {
  id: string;
  email: string;
  name: string;
  role: FuelRole;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  facebookUrl?: string;
  xUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  main_business_id: string;
  branch_id: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
};

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

export const parseUser = (value: unknown): User => {
  const parsed = UserSchema.parse(value);
  if (!isFuelRole(parsed.role)) throw new Error('User role is required.');
  return {
    id: parsed.id,
    email: parsed.email,
    name: parsed.name,
    role: parsed.role,
    isActive: parsed.isActive === true,
    ...(parsed.firstName ? { firstName: parsed.firstName } : {}),
    ...(parsed.lastName ? { lastName: parsed.lastName } : {}),
    ...(parsed.phone ? { phone: parsed.phone } : {}),
    ...(parsed.bio ? { bio: parsed.bio } : {}),
    ...(parsed.facebookUrl ? { facebookUrl: parsed.facebookUrl } : {}),
    ...(parsed.xUrl ? { xUrl: parsed.xUrl } : {}),
    ...(parsed.linkedinUrl ? { linkedinUrl: parsed.linkedinUrl } : {}),
    ...(parsed.instagramUrl ? { instagramUrl: parsed.instagramUrl } : {}),
    main_business_id: parsed.main_business_id,
    branch_id: parsed.branch_id,
    ...(parsed.avatarUrl ? { avatarUrl: parsed.avatarUrl } : {}),
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
  main_business_id: string;
  branch_id: string;
};

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member']),
  main_business_id: z.string().min(1),
  branch_id: z.string().min(1),
});

export type AuthSession = {
  accessToken: string;
  expiresAt: number;
  user: User;
};

export const SessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
  user: UserSchema,
});

export const parseSession = (value: unknown): AuthSession => {
  const parsed = SessionSchema.parse(value);
  return {
    accessToken: parsed.accessToken,
    expiresAt: parsed.expiresAt,
    user: parseUser(parsed.user),
  };
};

export type AuthErrorCode =
  'UNAUTHENTICATED' | 'FORBIDDEN' | 'INVALID_REQUEST' | 'NETWORK_ERROR' | 'UNKNOWN';

export type AuthError = {
  code: AuthErrorCode;
  message: string;
  status?: number;
};

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  businessName: string;
};

export const SignUpSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  businessName: z.string().min(1).max(120),
});

export type SignInInput = {
  email: string;
  password: string;
};

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  facebookUrl: string;
  xUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
  main_business_id: string;
  branch_id: string;
};

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

export type CreateInvitation = {
  email: string;
  role: 'admin' | 'member';
};

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

export type CreateManagedUserInput = {
  name: string;
  email: string;
  password: string;
  role: AssignableFuelRole;
};

export const CreateManagedUserSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: AssignableFuelRoleSchema,
});

export type UpdateManagedUserInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: AssignableFuelRole;
  isActive?: boolean;
};

export const UpdateManagedUserSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  role: AssignableFuelRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

export const authErrorMessage = (
  caught: unknown,
  fallback = 'The request could not be completed.'
) => {
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
