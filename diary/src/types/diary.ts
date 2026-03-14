export type DiaryVisibility = "public" | "private";

export type DiaryImageInput =
  | {
      type: "existing";
      url: string;
    }
  | {
      type: "new";
      file: File;
      previewUrl: string;
    };

export type Diary = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  visibility: DiaryVisibility;
  image_urls: string[];
  created_at: string;
  updated_at: string;
};
