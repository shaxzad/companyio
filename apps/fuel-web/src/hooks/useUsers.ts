import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@companyio/auth-react';
import type { User } from '@companyio/auth-contracts';
import { queryKeys } from './queryKeys';

export function useUsers() {
  const { client } = useAuth();
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => client.listUsers(),
    staleTime: 60 * 1000,
  });
}

/** Resolves a user from the shared users list cache (no extra request). */
export function useUser(userId: string | undefined) {
  const usersQuery = useUsers();
  const user = useMemo(
    () => usersQuery.data?.find((item) => item.id === userId),
    [usersQuery.data, userId]
  );

  return {
    ...usersQuery,
    data: user,
    isLoading: Boolean(userId) && usersQuery.isLoading,
  };
}

export function useUserMutations() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

  return {
    createUser: useMutation({
      mutationFn: (input: Parameters<typeof client.createUser>[0]) => client.createUser(input),
      onSuccess: invalidate,
    }),
    updateUser: useMutation({
      mutationFn: ({
        id,
        data,
      }: {
        id: string;
        data: Parameters<typeof client.updateUser>[1];
      }) => client.updateUser(id, data),
      onSuccess: (_user: User) => {
        void invalidate();
      },
    }),
  };
}
