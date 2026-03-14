export const DIARY_TITLE_MAX_LENGTH = 30;
export const DIARY_CONTENT_MAX_LENGTH = 2000;
export const COMMENT_MAX_LENGTH = 200;
export const DIARY_IMAGE_MAX_COUNT = 9;
export const DIARY_IMAGE_MAX_SIZE_MB = 5;

export function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function validateDiaryDraft(input: { title: string; content: string }) {
  const title = normalizeText(input.title);
  const content = normalizeText(input.content);

  if (!title) return "请输入标题";
  if (!content) return "请输入日记内容";

  if (title.length > DIARY_TITLE_MAX_LENGTH) {
    return `标题最多 ${DIARY_TITLE_MAX_LENGTH} 字`;
  }

  if (content.length > DIARY_CONTENT_MAX_LENGTH) {
    return `正文最多 ${DIARY_CONTENT_MAX_LENGTH} 字`;
  }

  return null;
}

export function validateDiaryImages(images: File[]) {
  if (images.length > DIARY_IMAGE_MAX_COUNT) {
    return `最多上传 ${DIARY_IMAGE_MAX_COUNT} 张图片`;
  }

  for (const image of images) {
    if (!image.type.startsWith("image/")) {
      return "只能上传图片文件";
    }

    if (image.size > DIARY_IMAGE_MAX_SIZE_MB * 1024 * 1024) {
      return `单张图片不能超过 ${DIARY_IMAGE_MAX_SIZE_MB}MB`;
    }
  }

  return null;
}

export function validateCommentContent(content: string) {
  const normalized = normalizeText(content);

  if (!normalized) return "请输入评论内容";
  if (normalized.length > COMMENT_MAX_LENGTH) {
    return `评论最多 ${COMMENT_MAX_LENGTH} 字`;
  }

  return null;
}
