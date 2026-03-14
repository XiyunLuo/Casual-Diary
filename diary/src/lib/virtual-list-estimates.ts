function estimateTextLines(text: string, charsPerLine: number, minLines = 1) {
  const normalizedLength = Array.from(text.trim()).length;
  return Math.max(minLines, Math.ceil(Math.max(normalizedLength, 1) / charsPerLine));
}

function estimateImageGalleryHeight(imageCount: number) {
  const visibleCount = Math.min(imageCount, 3);

  if (visibleCount === 0) return 0;
  if (visibleCount === 1) return 288;
  if (visibleCount === 2) return 180;
  return 220;
}

export function estimateDiaryPreviewCardHeight(params: {
  content: string;
  imageCount: number;
  maxLength?: number;
  interactiveFooter?: boolean;
}) {
  const previewLength = Math.min(params.content.length, params.maxLength ?? 180);
  const previewText = params.content.slice(0, previewLength);
  let height = 172;

  height += Math.min(196, estimateTextLines(previewText, 22, 2) * 28);
  height += estimateImageGalleryHeight(params.imageCount);

  if (params.interactiveFooter) {
    height += 84;
  }

  return height;
}

export function estimateMessageCardHeight(commentPreview?: string | null) {
  const text = commentPreview?.trim() ?? "";
  return text ? 96 : 88;
}

export function estimateActivityCommentCardHeight(content: string) {
  return 148 + Math.min(120, estimateTextLines(content, 28, 1) * 24);
}

export function estimateDiaryCommentHeight(content: string) {
  return 116 + Math.min(144, estimateTextLines(content, 26, 1) * 24);
}
