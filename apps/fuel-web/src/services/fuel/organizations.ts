import { apiRequest } from '../http';
import type { Organization, OrganizationInput, Vehicle, VehicleInput } from '../../types';

export const listOrganizations = (options?: { includeInactive?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.includeInactive) params.set('includeInactive', 'true');
  const query = params.toString();
  return apiRequest<Organization[]>(`/fuel/organizations${query ? `?${query}` : ''}`);
};

export const getOrganization = (organizationId: string) =>
  apiRequest<Organization>(`/fuel/organizations/${organizationId}`);

export const createOrganization = (data: OrganizationInput) =>
  apiRequest<Organization>('/fuel/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateOrganization = (organizationId: string, data: Partial<OrganizationInput>) =>
  apiRequest<Organization>(`/fuel/organizations/${organizationId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const listVehicles = (options?: { organizationId?: string; includeInactive?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.organizationId) params.set('organizationId', options.organizationId);
  if (options?.includeInactive) params.set('includeInactive', 'true');
  const query = params.toString();
  return apiRequest<Vehicle[]>(`/fuel/vehicles${query ? `?${query}` : ''}`);
};

export const createVehicle = (organizationId: string, data: VehicleInput) =>
  apiRequest<Vehicle>(`/fuel/organizations/${organizationId}/vehicles`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateVehicle = (vehicleId: string, data: Partial<VehicleInput>) =>
  apiRequest<Vehicle>(`/fuel/vehicles/${vehicleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
