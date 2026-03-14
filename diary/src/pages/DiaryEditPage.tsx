import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DiaryEditorForm from "../components/DiaryEditorForm";
import { getDiaryById, resolveDiaryImageUrls, updateDiary } from "@/services/diary-service";
import type { Diary, DiaryImageInput } from "@/types/diary";
import ErrorState from "@/components/states/ErrorState";
import EmptyStateCard from "@/components/states/EmptyStateCard";
import { getErrorMessage } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export default function DiaryEditPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [diary, setDiary] = useState<Diary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDiary() {
      if (!id) {
        setError("缺少日记 ID");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("请先登录");
        setLoading(false);
        return;
      }

      try {
        const record = await getDiaryById(id);
        if (!cancelled) {
          if (record.user_id !== user.id) {
            setDiary(null);
            setError("你无权编辑这篇日记");
            return;
          }
          setDiary(record);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = getErrorMessage(err, "加载日记失败");
          if (
            message.includes("no rows") ||
            message.includes("PGRST116") ||
            message.includes("permission")
          ) {
            setError("日记不存在，或你无权限编辑这篇日记");
          } else {
            setError(message);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDiary();

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  async function handleSubmit(values: {
    title: string;
    content: string;
    visibility: "public" | "private";
    images: DiaryImageInput[];
  }) {
    if (!id || !user) return;

    try {
      const imageUrls = await resolveDiaryImageUrls({
        userId: user.id,
        images: values.images,
      });

      await updateDiary(id, {
        title: values.title,
        content: values.content,
        visibility: values.visibility,
        image_urls: imageUrls,
      });
      nav("/app", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "保存失败，可能已无权限编辑该日记"));
    }
  }

  return (
    <AppShell
      actions={
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/app">返回我的日记</Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-3xl">
        {!loading && error && <ErrorState message={error} />}
        {!loading && !error && !diary && (
          <EmptyStateCard
            title="无法编辑该日记"
            description="该日记可能不存在，或者你无权访问。"
          />
        )}
        {!loading && diary && (
          <DiaryEditorForm
            title="编辑日记"
            description="修改标题、内容和公开状态。"
            submitLabel="保存修改"
            submittingLabel="保存中..."
            initialValues={{
              title: diary.title,
              content: diary.content,
              visibility: diary.visibility,
              images: (diary.image_urls ?? []).map((url) => ({
                type: "existing" as const,
                url,
              })),
            }}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </AppShell>
  );
}
