import type { DiaryVisibility } from "@/types/diary";

export type DiaryDraft = {
  title: string;
  content: string;
  visibility: DiaryVisibility;
};

function getDiaryDraftStorageKey(userId: string) {
  return `casual-diary:draft:${userId}`;
}

export function loadDiaryDraft(userId: string): DiaryDraft | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(getDiaryDraftStorageKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DiaryDraft>;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      content: typeof parsed.content === "string" ? parsed.content : "",
      visibility: parsed.visibility === "private" ? "private" : "public",
    };
  } catch {
    return null;
  }
}

export function saveDiaryDraft(userId: string, draft: DiaryDraft) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getDiaryDraftStorageKey(userId),
    JSON.stringify(draft),
  );
}

export function clearDiaryDraft(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getDiaryDraftStorageKey(userId));
}
