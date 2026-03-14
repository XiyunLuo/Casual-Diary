import { pageRange, requireSupabase } from "./core/supabase-client";
import { toPageResult } from "./core/pagination";
import type {
  PublicDiary,
  SquareSort,
  DiaryComment,
  LikedDiaryActivity,
  CommentActivity,
  IncomingNotification,
} from "@/types/square";

type DiaryFields =
  "id,user_id,author_name,title,content,visibility,image_urls,likes_count,comments_count,created_at,updated_at";

const diaryFields: DiaryFields =
  "id,user_id,author_name,title,content,visibility,image_urls,likes_count,comments_count,created_at,updated_at";

export const SQUARE_PAGE_SIZE = 10;
export const SQUARE_COMMENT_PAGE_SIZE = 8;
export const SQUARE_ACTIVITY_PAGE_SIZE = 10;
export const SQUARE_NOTIFICATION_PAGE_SIZE = 10;

export async function listPublicDiaries(params: {
  search?: string;
  sort?: SquareSort;
  page: number;
  pageSize?: number;
}) {
  const client = requireSupabase();
  const search = params.search?.trim();
  const sort = params.sort ?? "latest";
  const pageSize = params.pageSize ?? SQUARE_PAGE_SIZE;
  const { from, to } = pageRange(params.page, pageSize);

  let query = client
    .from("diaries")
    .select(diaryFields, { count: "exact" })
    .eq("visibility", "public");

  if (search) {
    query = query.or(`title.ilike.%${search}%,author_name.ilike.%${search}%`);
  }

  query =
    sort === "likes"
      ? query.order("likes_count", { ascending: false }).order("updated_at", {
          ascending: false,
        })
      : query.order("updated_at", { ascending: false });

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  const items = (data ?? []) as PublicDiary[];
  const authorIds = [...new Set(items.map((item) => item.user_id))];

  if (authorIds.length > 0) {
    const { data: profiles, error: profileError } = await client
      .from("profiles")
      .select("id,avatar_url")
      .in("id", authorIds);

    if (profileError) throw profileError;

    const avatarMap = new Map(
      (profiles ?? []).map((profile) => [profile.id as string, profile.avatar_url as string | null]),
    );
    for (const item of items) {
      item.author_avatar_url = avatarMap.get(item.user_id) ?? null;
    }
  }

  return toPageResult(items, count ?? 0, pageSize);
}

export async function getPublicDiaryDetail(id: string) {
  const client = requireSupabase();

  const { data, error } = await client
    .from("diaries")
    .select(diaryFields)
    .eq("id", id)
    .eq("visibility", "public")
    .single();

  if (error) throw error;

  const item = data as PublicDiary;
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("avatar_url")
    .eq("id", item.user_id)
    .maybeSingle();

  if (profileError) throw profileError;

  item.author_avatar_url = (profile?.avatar_url as string | null) ?? null;

  return item;
}

export async function listDiaryComments(params: {
  diaryId: string;
  sort?: "latest" | "oldest";
  page: number;
  pageSize?: number;
}) {
  const client = requireSupabase();
  const pageSize = params.pageSize ?? SQUARE_COMMENT_PAGE_SIZE;
  const { from, to } = pageRange(params.page, pageSize);

  const { data, error, count } = await client
    .from("diary_comments")
    .select("id,diary_id,user_id,author_name,content,created_at", { count: "exact" })
    .eq("diary_id", params.diaryId)
    .order("created_at", { ascending: params.sort === "oldest" })
    .range(from, to);

  if (error) throw error;

  return toPageResult((data ?? []) as DiaryComment[], count ?? 0, pageSize);
}

export async function hasLikedDiary(params: {
  diaryId: string;
  userId: string;
}) {
  const client = requireSupabase();

  const { data, error } = await client
    .from("diary_likes")
    .select("diary_id")
    .eq("diary_id", params.diaryId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (error) throw error;

  return Boolean(data);
}

export async function listLikedDiaryIds(params: {
  diaryIds: string[];
  userId: string;
}) {
  const client = requireSupabase();
  const diaryIds = [...new Set(params.diaryIds.filter(Boolean))];

  if (diaryIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await client
    .from("diary_likes")
    .select("diary_id")
    .eq("user_id", params.userId)
    .in("diary_id", diaryIds);

  if (error) throw error;

  return new Set((data ?? []).map((item) => item.diary_id as string));
}

export async function toggleDiaryLike(params: {
  diaryId: string;
  userId: string;
  liked: boolean;
}) {
  const client = requireSupabase();

  if (params.liked) {
    const { error } = await client
      .from("diary_likes")
      .delete()
      .eq("diary_id", params.diaryId)
      .eq("user_id", params.userId);

    if (error) throw error;
    return false;
  }

  const { error } = await client.from("diary_likes").insert({
    diary_id: params.diaryId,
    user_id: params.userId,
  });

  if (error) throw error;

  return true;
}

export async function createComment(input: {
  diaryId: string;
  userId: string;
  content: string;
}) {
  const client = requireSupabase();

  const { error } = await client.from("diary_comments").insert({
    diary_id: input.diaryId,
    user_id: input.userId,
    content: input.content,
  });

  if (error) throw error;
}

export async function deleteComment(input: { commentId: string; userId: string }) {
  const client = requireSupabase();

  const { error } = await client
    .from("diary_comments")
    .delete()
    .eq("id", input.commentId)
    .eq("user_id", input.userId);

  if (error) throw error;
}

export async function listAuthorPublicDiaries(params: {
  authorUserId: string;
  page: number;
  pageSize?: number;
}) {
  const client = requireSupabase();
  const pageSize = params.pageSize ?? SQUARE_PAGE_SIZE;
  const { from, to } = pageRange(params.page, pageSize);

  const { data, error, count } = await client
    .from("diaries")
    .select(diaryFields, { count: "exact" })
    .eq("visibility", "public")
    .eq("user_id", params.authorUserId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const items = (data ?? []) as PublicDiary[];

  return {
    ...toPageResult(items, count ?? 0, pageSize),
    authorName: items[0]?.author_name ?? "用户",
  };
}

export async function listMyLikedDiaries(params: {
  userId: string;
  page: number;
  pageSize?: number;
}) {
  const client = requireSupabase();
  const pageSize = params.pageSize ?? SQUARE_ACTIVITY_PAGE_SIZE;
  const { from, to } = pageRange(params.page, pageSize);

  const { data: likeRows, error: likeError, count } = await client
    .from("diary_likes")
    .select("diary_id,created_at", { count: "exact" })
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (likeError) throw likeError;

  const rows = likeRows ?? [];
  const diaryIds = rows.map((row) => row.diary_id);

  if (diaryIds.length === 0) {
    return toPageResult<LikedDiaryActivity>([], count ?? 0, pageSize);
  }

  const { data: diaryRows, error: diaryError } = await client
    .from("diaries")
    .select(diaryFields)
    .in("id", diaryIds)
    .eq("visibility", "public");

  if (diaryError) throw diaryError;

  const diaryMap = new Map((diaryRows as PublicDiary[]).map((item) => [item.id, item]));
  const items: LikedDiaryActivity[] = rows
    .map((row) => ({
      diary: diaryMap.get(row.diary_id),
      liked_at: row.created_at,
    }))
    .filter((item): item is LikedDiaryActivity => Boolean(item.diary));

  return toPageResult(items, count ?? 0, pageSize);
}

export async function listMyCommentActivities(params: {
  userId: string;
  page: number;
  pageSize?: number;
}) {
  const client = requireSupabase();
  const pageSize = params.pageSize ?? SQUARE_ACTIVITY_PAGE_SIZE;
  const { from, to } = pageRange(params.page, pageSize);

  const { data: commentRows, error: commentError, count } = await client
    .from("diary_comments")
    .select("id,diary_id,content,created_at", { count: "exact" })
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (commentError) throw commentError;

  const rows = commentRows ?? [];
  const diaryIds = [...new Set(rows.map((row) => row.diary_id))];

  if (diaryIds.length === 0) {
    return toPageResult<CommentActivity>([], count ?? 0, pageSize);
  }

  const { data: diaryRows, error: diaryError } = await client
    .from("diaries")
    .select(diaryFields)
    .in("id", diaryIds)
    .eq("visibility", "public");

  if (diaryError) throw diaryError;

  const diaryMap = new Map((diaryRows as PublicDiary[]).map((item) => [item.id, item]));
  const items: CommentActivity[] = rows
    .map((row) => ({
      id: row.id,
      diary: diaryMap.get(row.diary_id),
      content: row.content,
      created_at: row.created_at,
    }))
    .filter((item): item is CommentActivity => Boolean(item.diary));

  return toPageResult(items, count ?? 0, pageSize);
}

export async function listMyNotifications(params: {
  page: number;
  pageSize?: number;
}) {
  const client = requireSupabase();
  const pageSize = params.pageSize ?? SQUARE_NOTIFICATION_PAGE_SIZE;

  const { data, error } = await client.rpc("list_my_notifications", {
    p_page: params.page,
    p_page_size: pageSize,
  });

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    notification_key: string;
    notification_type: "like" | "comment";
    actor_user_id: string;
    actor_name: string | null;
    actor_avatar_url: string | null;
    created_at: string;
    diary_id: string;
    comment_id: string | null;
    comment_preview: string | null;
    is_unread: boolean;
    total_count: number | string;
  }>;

  const items: IncomingNotification[] = rows.map((row) => ({
    notification_key: row.notification_key,
    type: row.notification_type,
    actor_user_id: row.actor_user_id,
    actor_name: row.actor_name ?? "用户",
    actor_avatar_url: row.actor_avatar_url,
    created_at: row.created_at,
    diary_id: row.diary_id,
    comment_id: row.comment_id,
    comment_preview: row.comment_preview,
    is_unread: row.is_unread,
  }));
  const total = Number(rows[0]?.total_count ?? 0);

  return toPageResult(items, total, pageSize);
}

export async function countMyNotifications() {
  const client = requireSupabase();
  const { data, error } = await client.rpc("count_my_notifications");

  if (error) throw error;

  return Number(data ?? 0);
}

export async function markNotificationRead(input: {
  notificationKey: string;
}) {
  const client = requireSupabase();
  const { error } = await client.rpc("mark_notification_read", {
    p_notification_key: input.notificationKey,
  });

  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const client = requireSupabase();
  const { error } = await client.rpc("mark_all_notifications_read");

  if (error) throw error;
}

export async function getDiaryCommentPage(params: {
  diaryId: string;
  commentId: string;
  pageSize?: number;
  sort?: "latest" | "oldest";
}) {
  const client = requireSupabase();
  const pageSize = params.pageSize ?? SQUARE_COMMENT_PAGE_SIZE;
  const sort = params.sort ?? "latest";

  const { data: comment, error: commentError } = await client
    .from("diary_comments")
    .select("id,created_at")
    .eq("id", params.commentId)
    .eq("diary_id", params.diaryId)
    .maybeSingle();

  if (commentError) throw commentError;
  if (!comment) return 1;

  const countQuery = client
    .from("diary_comments")
    .select("id", { count: "exact", head: true })
    .eq("diary_id", params.diaryId);

  const { count, error: countError } =
    sort === "oldest"
      ? await countQuery.lt("created_at", comment.created_at)
      : await countQuery.gt("created_at", comment.created_at);

  if (countError) throw countError;

  return Math.max(1, Math.floor((count ?? 0) / pageSize) + 1);
}
