import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  countMyNotifications,
  getPublicDiaryDetail,
  hasLikedDiary,
  listAuthorPublicDiaries,
  listDiaryComments,
  listMyCommentActivities,
  listMyLikedDiaries,
  listMyNotifications,
  listPublicDiaries,
} from "@/services/square-service";
import type { SquareSort } from "@/types/square";

export function usePublicDiaries(params: {
  page: number;
  search?: string;
  sort: SquareSort;
}) {
  return useQuery({
    queryKey: queryKeys.square.publicList(params),
    queryFn: () =>
      listPublicDiaries({
        page: params.page,
        search: params.search,
        sort: params.sort,
      }),
  });
}

export function usePublicDiaryDetail(id?: string) {
  return useQuery({
    queryKey: queryKeys.square.detail(id),
    enabled: Boolean(id),
    queryFn: () => getPublicDiaryDetail(id!),
  });
}

export function useDiaryLiked(params: { diaryId?: string; userId?: string }) {
  return useQuery({
    queryKey: queryKeys.square.liked(params),
    enabled: Boolean(params.diaryId && params.userId),
    queryFn: () =>
      hasLikedDiary({
        diaryId: params.diaryId!,
        userId: params.userId!,
      }),
  });
}

export function useDiaryComments(params: {
  diaryId?: string;
  page: number;
  sort: "latest" | "oldest";
}) {
  return useQuery({
    queryKey: queryKeys.square.comments(params),
    enabled: Boolean(params.diaryId),
    queryFn: () =>
      listDiaryComments({
        diaryId: params.diaryId!,
        page: params.page,
        sort: params.sort,
      }),
  });
}

export function useAuthorPublicDiaries(params: {
  authorUserId?: string;
  page: number;
}) {
  return useQuery({
    queryKey: queryKeys.square.authorDiaries(params),
    enabled: Boolean(params.authorUserId),
    queryFn: () =>
      listAuthorPublicDiaries({
        authorUserId: params.authorUserId!,
        page: params.page,
      }),
  });
}

export function useMyLikedDiaries(params: { userId?: string; page: number }) {
  return useQuery({
    queryKey: queryKeys.square.activityLikes(params),
    enabled: Boolean(params.userId),
    queryFn: () =>
      listMyLikedDiaries({
        userId: params.userId!,
        page: params.page,
      }),
  });
}

export function useMyCommentActivities(params: {
  userId?: string;
  page: number;
}) {
  return useQuery({
    queryKey: queryKeys.square.activityComments(params),
    enabled: Boolean(params.userId),
    queryFn: () =>
      listMyCommentActivities({
        userId: params.userId!,
        page: params.page,
      }),
  });
}

export function useMyNotifications(params: { userId?: string; page: number }) {
  return useQuery({
    queryKey: queryKeys.square.notifications(params),
    enabled: Boolean(params.userId),
    queryFn: () =>
      listMyNotifications({
        page: params.page,
      }),
  });
}

export function useMyNotificationCount(userId?: string) {
  return useQuery({
    queryKey: queryKeys.square.notificationCount(userId),
    enabled: Boolean(userId),
    queryFn: () => countMyNotifications(),
  });
}
