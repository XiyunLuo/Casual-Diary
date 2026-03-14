import type { DiaryVisibility } from "@/types/diary";
import type { SquareSort } from "@/types/square";

export const queryKeys = {
  auth: ["auth"] as const,
  profiles: {
    me: (userId?: string) => ["profiles", "me", userId] as const,
    public: (userId?: string) => ["profiles", "public", userId] as const,
  },
  diaries: {
    ownList: (params: {
      userId?: string;
      page: number;
      visibility?: DiaryVisibility;
      search?: string;
    }) => ["diaries", "own", params] as const,
    detail: (id?: string) => ["diaries", "detail", id] as const,
  },
  square: {
    publicList: (params: {
      page: number;
      search?: string;
      sort: SquareSort;
    }) => ["square", "public", params] as const,
    detail: (id?: string) => ["square", "detail", id] as const,
    liked: (params: { diaryId?: string; userId?: string }) =>
      ["square", "liked", params] as const,
    comments: (params: {
      diaryId?: string;
      page: number;
      sort: "latest" | "oldest";
    }) => ["square", "comments", params] as const,
    authorDiaries: (params: { authorUserId?: string; page: number }) =>
      ["square", "author", params] as const,
    activityLikes: (params: { userId?: string; page: number }) =>
      ["square", "activity", "likes", params] as const,
    activityComments: (params: { userId?: string; page: number }) =>
      ["square", "activity", "comments", params] as const,
    notifications: (params: { userId?: string; page: number }) =>
      ["square", "notifications", params] as const,
    notificationCount: (userId?: string) =>
      ["square", "notifications", "count", userId] as const,
  },
};
