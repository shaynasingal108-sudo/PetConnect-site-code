import { supabase } from "@/integrations/supabase/client";

export type SocialProfile = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  city?: string | null;
  is_business?: boolean | null;
  business_name?: string | null;
};

export type FriendRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: string | null;
  created_at: string;
};

export function getOtherUserId(row: Pick<FriendRow, "user_id" | "friend_id">, currentUserId: string) {
  return row.user_id === currentUserId ? row.friend_id : row.user_id;
}

export async function fetchFriendRows(currentUserId: string): Promise<FriendRow[]> {
  const { data, error } = await supabase
    .from("friends")
    .select("*")
    .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

  if (error) throw error;
  return (data as FriendRow[]) || [];
}

export async function fetchProfilesMapByUserIds(userIds: string[]): Promise<Record<string, SocialProfile>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, avatar_url, city, is_business, business_name")
    .in("user_id", unique);

  if (error) throw error;

  const map: Record<string, SocialProfile> = {};
  (data || []).forEach((p: any) => {
    map[p.user_id] = p;
  });
  return map;
}
