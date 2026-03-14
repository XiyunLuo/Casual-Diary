import { requireSupabase } from "./core/supabase-client";
import type { Profile, PublicProfile } from "@/types/profile";

const AVATAR_BUCKET = "avatars";

export async function getMyProfile(userId: string) {
  const client = requireSupabase();

  const { data, error } = await client
    .from("profiles")
    .select("id,email,display_name,avatar_url,bio,created_at,updated_at")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return data as Profile;
}

export async function updateMyProfile(
  userId: string,
  input: {
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
  },
) {
  const client = requireSupabase();

  const { data, error } = await client
    .from("profiles")
    .update({
      display_name: input.display_name,
      avatar_url: input.avatar_url,
      bio: input.bio,
    })
    .eq("id", userId)
    .select("id,email,display_name,avatar_url,bio,created_at,updated_at")
    .single();

  if (error) throw error;

  return data as Profile;
}

export async function uploadAvatarImage(params: { userId: string; file: File }) {
  const client = requireSupabase();
  const fileExt = params.file.name.includes(".")
    ? params.file.name.split(".").pop()?.toLowerCase() || "png"
    : "png";
  const filePath = `${params.userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, params.file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function getPublicProfile(userId: string) {
  const client = requireSupabase();

  const { data, error } = await client.rpc("get_public_profile", {
    p_user_id: userId,
  });

  if (error) throw error;
  if (!data) return null;

  if (Array.isArray(data)) {
    return (data[0] ?? null) as PublicProfile | null;
  }

  return data as PublicProfile;
}
