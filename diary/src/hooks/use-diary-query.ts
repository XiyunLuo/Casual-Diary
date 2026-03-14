import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDiary,
  getDiaryById,
  listOwnDiaries,
} from "@/services/diary-service";
import type { DiaryVisibility } from "@/types/diary";
import { queryKeys } from "@/lib/query-keys";

export function useOwnDiaries(params: {
  userId?: string;
  page: number;
  visibility?: DiaryVisibility;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.diaries.ownList(params),
    enabled: Boolean(params.userId),
    queryFn: () =>
      listOwnDiaries({
        userId: params.userId!,
        page: params.page,
        visibility: params.visibility,
        search: params.search,
      }),
  });
}

export function useDiaryDetail(id?: string) {
  return useQuery({
    queryKey: queryKeys.diaries.detail(id),
    enabled: Boolean(id),
    queryFn: () => getDiaryById(id!),
  });
}

export function useDeleteDiaryMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDiary,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["diaries", "own"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["square", "public"],
      });
      if (userId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.square.authorDiaries({ authorUserId: userId, page: 1 }).slice(
            0,
            2,
          ),
        });
      }
    },
  });
}
