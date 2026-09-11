import { apiRequest } from '../http';
import type { Organization } from '../../types';

export const listOrganizations = () => apiRequest<Organization[]>('/fuel/organizations');
