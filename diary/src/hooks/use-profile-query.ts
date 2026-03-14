import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getMyProfile, getPublicProfile } from "@/services/profile-service";

export function useMyProfile(userId?: string) {
  return useQuery({
    queryKey: queryKeys.profiles.me(userId),
    enabled: Boolean(userId),
    queryFn: () => getMyProfile(userId!),
  });
}

export function usePublicProfile(userId?: string) {
  return useQuery({
    queryKey: queryKeys.profiles.public(userId),
    enabled: Boolean(userId),
    queryFn: () => getPublicProfile(userId!),
  });
}
