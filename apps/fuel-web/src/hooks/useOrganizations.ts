import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOrganization,
  createVehicle,
  listOrganizations,
  listVehicles,
  updateOrganization,
  updateVehicle,
} from '../services/fuel';
import type { OrganizationInput, VehicleInput } from '../types';
import { queryKeys } from './queryKeys';

export function useOrganizations(options?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: queryKeys.organizations.list(options?.includeInactive ?? false),
    queryFn: () => listOrganizations(options),
    staleTime: 60 * 1000,
  });
}

export function useVehicles(options?: { organizationId?: string; includeInactive?: boolean }) {
  return useQuery({
    queryKey: queryKeys.vehicles.list(options?.organizationId, options?.includeInactive ?? false),
    queryFn: () => listVehicles(options),
    staleTime: 60 * 1000,
  });
}

export function useOrganizationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
  };

  return {
    createOrganization: useMutation({
      mutationFn: (data: OrganizationInput) => createOrganization(data),
      onSuccess: invalidate,
    }),
    updateOrganization: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<OrganizationInput> }) =>
        updateOrganization(id, data),
      onSuccess: invalidate,
    }),
    createVehicle: useMutation({
      mutationFn: ({
        organizationId,
        data,
      }: {
        organizationId: string;
        data: VehicleInput;
      }) => createVehicle(organizationId, data),
      onSuccess: invalidate,
    }),
    updateVehicle: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<VehicleInput> }) =>
        updateVehicle(id, data),
      onSuccess: invalidate,
    }),
  };
}
