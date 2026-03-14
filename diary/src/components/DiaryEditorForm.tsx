import { useEffect, useId, useRef, useState } from "react";
import { Eye, GripVertical, ImagePlus, PencilLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DiaryImageInput, DiaryVisibility } from "@/types/diary";
import ErrorState from "@/components/states/ErrorState";
import {
  DIARY_CONTENT_MAX_LENGTH,
  DIARY_IMAGE_MAX_COUNT,
  DIARY_IMAGE_MAX_SIZE_MB,
  DIARY_TITLE_MAX_LENGTH,
  normalizeText,
  validateDiaryDraft,
  validateDiaryImages,
} from "@/lib/validation";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "@/components/ConfirmDialog";
import MarkdownContent from "@/components/common/MarkdownContent";

type DiaryEditorFormProps = {
  initialValues?: {
    title: string;
    content: string;
    visibility: DiaryVisibility;
    images: DiaryImageInput[];
  };
  submitLabel: string;
  submittingLabel: string;
  title: string;
  description: string;
  headerAction?: React.ReactNode;
  onSubmit: (values: {
    title: string;
    content: string;
    visibility: DiaryVisibility;
    images: DiaryImageInput[];
  }) => Promise<void>;
  draftControls?: {
    initialValues?: {
      title: string;
      content: string;
      visibility: DiaryVisibility;
    } | null;
    onSaveDraft: (values: {
      title: string;
      content: string;
      visibility: DiaryVisibility;
    }) => void;
    onClearDraft: () => void;
  };
};

export default function DiaryEditorForm({
  initialValues,
  submitLabel,
  submittingLabel,
  title,
  description,
  headerAction,
  onSubmit,
  draftControls,
}: DiaryEditorFormProps) {
  const baseValues = draftControls?.initialValues ?? initialValues;
  const [diaryTitle, setDiaryTitle] = useState(baseValues?.title ?? "");
  const [content, setContent] = useState(baseValues?.content ?? "");
  const [visibility, setVisibility] = useState<DiaryVisibility>(
    baseValues?.visibility ?? "public",
  );
  const [images, setImages] = useState<DiaryImageInput[]>(
    initialValues?.images ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [confirmClearDraftOpen, setConfirmClearDraftOpen] = useState(false);
  const [contentMode, setContentMode] = useState<"write" | "preview">("write");
  const imagesRef = useRef(images);
  const imageInputId = useId();
  const formStateRef = useRef({
    title: diaryTitle,
    content,
    visibility,
  });

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    formStateRef.current = {
      title: diaryTitle,
      content,
      visibility,
    };
  }, [content, diaryTitle, visibility]);

  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) {
        if (image.type === "new") {
          URL.revokeObjectURL(image.previewUrl);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!draftControls) return;

    const persistDraft = () => {
      const current = formStateRef.current;
      if (
        hasUserInput(
          current.title,
          current.content,
          current.visibility,
          imagesRef.current,
        )
      ) {
        draftControls.onSaveDraft(current);
      } else {
        draftControls.onClearDraft();
      }
    };

    const handleBeforeUnload = () => {
      persistDraft();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      persistDraft();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [draftControls]);

  function hasUserInput(
    titleValue: string,
    contentValue: string,
    visibilityValue: DiaryVisibility,
    imageValues: DiaryImageInput[],
  ) {
    return Boolean(
      titleValue.trim() ||
      contentValue.trim() ||
      imageValues.length > 0 ||
      visibilityValue !== "public",
    );
  }

  const hasInput = hasUserInput(diaryTitle, content, visibility, images);

  function clearSelectedImages() {
    for (const image of imagesRef.current) {
      if (image.type === "new") {
        URL.revokeObjectURL(image.previewUrl);
      }
    }
    setImages([]);
  }

  function moveImage(from: number, to: number) {
    if (from === to) return;

    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function removeImage(index: number) {
    setImages((current) => {
      const next = [...current];
      const [removed] = next.splice(index, 1);
      if (removed?.type === "new") {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  }

  function handleSelectImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const totalCount = images.length + files.length;
    if (totalCount > DIARY_IMAGE_MAX_COUNT) {
      setError(`最多上传 ${DIARY_IMAGE_MAX_COUNT} 张图片`);
      e.target.value = "";
      return;
    }

    const validationError = validateDiaryImages(files);
    if (validationError) {
      setError(validationError);
      e.target.value = "";
      return;
    }

    setError(null);
    setImages((current) => [
      ...current,
      ...files.map((file) => ({
        type: "new" as const,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validateDiaryDraft({
      title: diaryTitle,
      content,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await onSubmit({
        title: normalizeText(diaryTitle),
        content: normalizeText(content),
        visibility,
        images,
      });
      if (draftControls) {
        draftControls.onClearDraft();
      }
    } catch (err) {
      setError(getErrorMessage(err, "保存失败"));
    } finally {
      setLoading(false);
    }
  }

  function handleSaveDraft() {
    if (!draftControls) return;

    const nextValues = {
      title: diaryTitle,
      content,
      visibility,
    };

    if (!hasInput) {
      draftControls.onClearDraft();
      setMessage("暂无内容可保存");
      return;
    }

    draftControls.onSaveDraft(nextValues);
    setMessage("草稿已保存");
    setError(null);
  }

  async function handleConfirmClearDraft() {
    clearSelectedImages();
    setDiaryTitle("");
    setContent("");
    setVisibility("public");
    setError(null);
    setMessage(null);
    draftControls?.onClearDraft();
    setConfirmClearDraftOpen(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
          {headerAction}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="diary-title">
          标题
        </label>
        <Input
          id="diary-title"
          placeholder="给今天起个标题"
          value={diaryTitle}
          onChange={(e) => {
            setDiaryTitle(e.target.value);
            setMessage(null);
          }}
          maxLength={DIARY_TITLE_MAX_LENGTH}
        />
        <div className="text-xs text-muted-foreground">
          {diaryTitle.length}/{DIARY_TITLE_MAX_LENGTH}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="diary-visibility">
          可见性
        </label>
        <select
          id="diary-visibility"
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={visibility}
          onChange={(e) => {
            setVisibility(e.target.value as DiaryVisibility);
            setMessage(null);
          }}
        >
          <option value="private">私密</option>
          <option value="public">公开</option>
        </select>
        <p className="text-xs text-muted-foreground">
          公开日记可用于广场展示，私有日记仅你自己可见。
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={imageInputId}>
            图片
          </label>
          <p className="text-xs text-muted-foreground">
            最多 {DIARY_IMAGE_MAX_COUNT} 张，单张不超过{" "}
            {DIARY_IMAGE_MAX_SIZE_MB}MB。
          </p>
        </div>
        <Input
          id={imageInputId}
          type="file"
          accept="image/*"
          multiple
          onChange={handleSelectImages}
          disabled={images.length >= DIARY_IMAGE_MAX_COUNT}
          className="hidden"
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {images.map((image, index) => {
            const imageUrl =
              image.type === "existing" ? image.url : image.previewUrl;

            return (
              <div
                key={image.type === "existing" ? image.url : image.previewUrl}
                draggable
                onDragStart={() => setDraggingIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggingIndex === null) return;
                  moveImage(draggingIndex, index);
                  setDraggingIndex(null);
                }}
                onDragEnd={() => setDraggingIndex(null)}
                className={`group relative aspect-square overflow-hidden rounded-2xl border bg-muted ${
                  draggingIndex === index ? "opacity-60" : ""
                }`}
              >
                <img
                  src={imageUrl}
                  alt={`selected diary ${index + 1}`}
                  className="h-full w-full object-cover object-center"
                />
                <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm sm:left-3 sm:top-3">
                  <GripVertical className="h-4 w-4" />
                  {index + 1}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 rounded-full bg-background/90 sm:right-3 sm:top-3"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          {images.length < DIARY_IMAGE_MAX_COUNT && (
            <label
              htmlFor={imageInputId}
              className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
            >
              <span className="flex flex-col items-center gap-2">
                <ImagePlus className="h-8 w-8" />
                <span className="text-xs">添加图片</span>
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-sm font-medium" htmlFor="diary-content">
            内容
          </label>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <Button
              type="button"
              variant={contentMode === "write" ? "default" : "outline"}
              className="h-9"
              onClick={() => setContentMode("write")}
            >
              <PencilLine className="h-4 w-4" />
              编辑
            </Button>
            <Button
              type="button"
              variant={contentMode === "preview" ? "default" : "outline"}
              className="h-9"
              onClick={() => setContentMode("preview")}
            >
              <Eye className="h-4 w-4" />
              预览
            </Button>
          </div>
        </div>
        {contentMode === "write" ? (
          <Textarea
            id="diary-content"
            className="min-h-[260px] sm:min-h-[320px]"
            placeholder="写下今天的想法..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setMessage(null);
            }}
            maxLength={DIARY_CONTENT_MAX_LENGTH}
          />
        ) : (
          <div className="min-h-[260px] rounded-md border border-input px-3 py-2 sm:min-h-[320px]">
            {content.trim() ? (
              <MarkdownContent content={content} />
            ) : (
              <div className="text-sm text-muted-foreground">
                暂无内容可预览，先在编辑模式输入一些 Markdown。
              </div>
            )}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {content.length}/{DIARY_CONTENT_MAX_LENGTH}
        </div>
      </div>

      {error && <ErrorState message={error} />}
      {message && <div className="text-sm text-green-700">{message}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? submittingLabel : submitLabel}
        </Button>
        {draftControls ? (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleSaveDraft}
            className="w-full sm:w-auto"
          >
            保存草稿
          </Button>
        ) : null}
        {draftControls && hasInput ? (
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={() => setConfirmClearDraftOpen(true)}
            className="w-full sm:w-auto"
          >
            清空草稿
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmClearDraftOpen}
        onOpenChange={setConfirmClearDraftOpen}
        title="清空草稿"
        description="确定要清空当前草稿吗？页面中的标题、内容、可见性和未发布图片都会被清除。"
        confirmText="确认清空"
        onConfirm={handleConfirmClearDraft}
      />
    </form>
  );
}
