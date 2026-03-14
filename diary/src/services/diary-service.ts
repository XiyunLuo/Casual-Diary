import { pageRange, requireSupabase } from "./core/supabase-client";
import { toPageResult } from "./core/pagination";
import type { Diary, DiaryImageInput, DiaryVisibility } from "@/types/diary";

export const DIARY_PAGE_SIZE = 10;
const DIARY_IMAGE_BUCKET = "diary-images";

export async function listOwnDiaries(params: {
  userId: string;
  page: number;
  visibility?: DiaryVisibility;
  search?: string;
  pageSize?: number;
}) {
  const client = requireSupabase();
  const pageSize = params.pageSize ?? DIARY_PAGE_SIZE;
  const { from, to } = pageRange(params.page, pageSize);
  const search = params.search?.trim();

  let query = client
    .from("diaries")
    .select("*", { count: "exact" })
    .eq("user_id", params.userId)
    .order("updated_at", { ascending: false });

  if (params.visibility) {
    query = query.eq("visibility", params.visibility);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  return toPageResult((data ?? []) as Diary[], count ?? 0, pageSize);
}

export async function getDiaryById(id: string) {
  const client = requireSupabase();

  const { data, error } = await client
    .from("diaries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data as Diary;
}

export async function createDiary(input: {
  userId: string;
  title: string;
  content: string;
  visibility: DiaryVisibility;
  image_urls?: string[];
}) {
  const client = requireSupabase();

  const { data, error } = await client
    .from("diaries")
    .insert({
      user_id: input.userId,
      title: input.title,
      content: input.content,
      visibility: input.visibility,
      image_urls: input.image_urls ?? [],
    })
    .select("*")
    .single();

  if (error) throw error;

  return data as Diary;
}

export async function updateDiary(
  id: string,
  input: {
    title: string;
    content: string;
    visibility: DiaryVisibility;
    image_urls?: string[];
  },
) {
  const client = requireSupabase();

  const { data, error } = await client
    .from("diaries")
    .update({
      title: input.title,
      content: input.content,
      visibility: input.visibility,
      image_urls: input.image_urls ?? [],
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return data as Diary;
}

export async function deleteDiary(id: string) {
  const client = requireSupabase();

  const { error } = await client.from("diaries").delete().eq("id", id);

  if (error) throw error;
}

export async function resolveDiaryImageUrls(params: {
  userId: string;
  images: DiaryImageInput[];
}) {
  const client = requireSupabase();
  const urls: string[] = [];

  for (const image of params.images) {
    if (image.type === "existing") {
      urls.push(image.url);
      continue;
    }

    const file = image.file;
    const fileExt = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase() || "png"
      : "png";
    const filePath = `${params.userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await client.storage
      .from(DIARY_IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = client.storage.from(DIARY_IMAGE_BUCKET).getPublicUrl(filePath);
    urls.push(data.publicUrl);
  }

  return urls;
}
