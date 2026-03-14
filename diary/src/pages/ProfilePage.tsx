import { useEffect, useState } from "react";
import { Home, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatarImage,
} from "@/services/profile-service";
import type { Profile } from "@/types/profile";
import { useAuthStore } from "@/store/auth";
import ErrorState from "@/components/states/ErrorState";
import { getErrorMessage } from "@/lib/errors";
import AppShell from "@/components/layout/AppShell";

const MAX_DISPLAY_NAME_LENGTH = 6;
const MAX_BIO_LENGTH = 30;
const MAX_AVATAR_SIZE_MB = 2;

function charLength(value: string) {
  return Array.from(value).length;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await getMyProfile(user.id);
        if (!cancelled) {
          setProfile(data);
          setDisplayName(data.display_name ?? "");
          setAvatarUrl(data.avatar_url ?? null);
          setAvatarPreviewUrl(data.avatar_url ?? null);
          setAvatarFile(null);
          setBio(data.bio ?? "");
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "加载资料失败"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("头像文件必须是图片格式");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      setError(`头像大小不能超过 ${MAX_AVATAR_SIZE_MB}MB`);
      return;
    }

    if (avatarPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setError(null);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!displayName.trim()) {
      setError("昵称不能为空");
      return;
    }
    if (charLength(displayName.trim()) > MAX_DISPLAY_NAME_LENGTH) {
      setError(`昵称需小于等于 ${MAX_DISPLAY_NAME_LENGTH} 个字符`);
      return;
    }
    if (charLength(bio.trim()) > MAX_BIO_LENGTH) {
      setError(`个人简介需小于等于 ${MAX_BIO_LENGTH} 个字符`);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        nextAvatarUrl = await uploadAvatarImage({
          userId: user.id,
          file: avatarFile,
        });
      }

      const updated = await updateMyProfile(user.id, {
        display_name: displayName.trim(),
        avatar_url: nextAvatarUrl,
        bio: bio.trim() ? bio.trim() : null,
      });
      setProfile(updated);
      setAvatarUrl(updated.avatar_url ?? null);
      setAvatarPreviewUrl(updated.avatar_url ?? null);
      setAvatarFile(null);
      setMessage("资料已保存");
    } catch (err) {
      setError(getErrorMessage(err, "保存失败"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-semibold sm:text-3xl">个人资料</div>
            <div className="text-sm text-muted-foreground">
              修改你的昵称、头像和简介。
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="relative group">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => navigate("/app")}
                aria-label="返回我的日记"
              >
                <Home className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                返回我的日记
              </div>
            </div>
            <div className="relative group">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => navigate("/square")}
                aria-label="返回广场"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                返回广场
              </div>
            </div>
          </div>
        </div>
        {!loading && profile && (
          <form onSubmit={handleSave} className="space-y-5 rounded-xl border p-4 sm:p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="profile-email">
                邮箱
              </label>
              <Input
                id="profile-email"
                value={profile.email ?? ""}
                disabled
                readOnly
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="profile-display-name">
                昵称
              </label>
              <Input
                id="profile-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                placeholder="输入昵称"
              />
              <div className="text-xs text-muted-foreground">
                {charLength(displayName)}/{MAX_DISPLAY_NAME_LENGTH}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="profile-avatar-file">
                上传头像
              </label>
              <Input
                id="profile-avatar-file"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
              <div className="text-xs text-muted-foreground">
                支持图片文件，大小不超过 {MAX_AVATAR_SIZE_MB}MB。
              </div>
              {avatarPreviewUrl && (
                <img
                  src={avatarPreviewUrl}
                  alt="avatar preview"
                  className="h-16 w-16 rounded-full border object-cover sm:h-20 sm:w-20"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="profile-bio">
                个人简介
              </label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="介绍一下你自己"
                maxLength={MAX_BIO_LENGTH}
                className="min-h-[140px]"
              />
              <div className="text-xs text-muted-foreground">
                {charLength(bio)}/{MAX_BIO_LENGTH}
              </div>
            </div>

            {error && <ErrorState message={error} />}
            {message && <div className="text-sm text-green-700">{message}</div>}

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? "保存中..." : "保存资料"}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
