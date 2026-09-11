import { useQuery } from '@tanstack/react-query';
import { listOrganizations } from '../services/fuel';
import { queryKeys } from './queryKeys';

const ORGANIZATIONS_STALE_MS = 5 * 60 * 1000;

export function useOrganizations() {
  return useQuery({
    queryKey: queryKeys.organizations.all,
    queryFn: listOrganizations,
    staleTime: ORGANIZATIONS_STALE_MS,
  });
}
