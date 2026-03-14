import type { Diary } from "./diary";

export type SquareSort = "latest" | "likes";

export type PublicDiary = Diary & {
  author_name: string | null;
  author_avatar_url?: string | null;
  likes_count: number;
  comments_count: number;
};

export type DiaryComment = {
  id: string;
  diary_id: string;
  user_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
};

export type LikedDiaryActivity = {
  diary: PublicDiary;
  liked_at: string;
};

export type CommentActivity = {
  id: string;
  diary: PublicDiary;
  content: string;
  created_at: string;
};

export type IncomingNotification = {
  notification_key: string;
  type: "like" | "comment";
  actor_user_id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  created_at: string;
  diary_id: string;
  comment_id: string | null;
  comment_preview: string | null;
  is_unread: boolean;
};
