import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DiaryImageGallery from "@/components/diary/DiaryImageGallery";

type DiaryPreviewCardProps = {
  title: string;
  content: string;
  description: ReactNode;
  images?: string[];
  badge?: ReactNode;
  footer?: ReactNode;
  bottomSlot?: ReactNode;
  detailTo?: string;
  maxLength?: number;
};

export default function DiaryPreviewCard({
  title,
  content,
  description,
  images = [],
  badge,
  footer,
  bottomSlot,
  detailTo,
  maxLength = 180,
}: DiaryPreviewCardProps) {
  const navigate = useNavigate();
  const preview = content.length > maxLength ? `${content.slice(0, maxLength)}...` : content;

  function handleNavigate(target: EventTarget | null) {
    if (!detailTo || !(target instanceof HTMLElement)) return;
    if (typeof document !== "undefined") {
      const blocked = document.body.getAttribute("data-image-preview-block-nav");
      if (blocked === "true") return;
    }
    if (target.closest("a, button, [data-no-card-nav='true']")) return;
    navigate(detailTo);
  }

  return (
    <Card
      className={detailTo ? "cursor-pointer transition-colors hover:bg-muted/30" : undefined}
      onClick={(e) => handleNavigate(e.target)}
      onKeyDown={(e) => {
        if (!detailTo) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigate(e.target);
        }
      }}
      role={detailTo ? "link" : undefined}
      tabIndex={detailTo ? 0 : undefined}
    >
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="break-words text-base leading-snug sm:text-lg">
              {title}
            </CardTitle>
            <CardDescription className="break-words text-xs sm:text-sm">
              {description}
            </CardDescription>
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90 sm:leading-7">
          {preview}
        </div>
        <DiaryImageGallery images={images} />
        {bottomSlot ? <div className="flex flex-col gap-3">{bottomSlot}</div> : null}
        {footer ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground sm:text-sm">{footer}</div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
