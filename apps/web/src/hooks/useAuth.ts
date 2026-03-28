import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "../api/auth.api.js";

export function useAuth() {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.fetchMe(),
    staleTime: 60_000,
    retry: false,
  });

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const register = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.register(email, password),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.setQueryData(["me"], null);
    },
  });

  return {
    user: me.data ?? null,
    isLoading: me.isLoading,
    login,
    register,
    logout,
  };
}
