import { supabase } from "@/integrations/supabase/client";
import type { Comment, Post, Profile } from "@/types";

type AnyRow = Record<string, any>;

export async function fetchHydratedPosts({
  groupId,
  limit = 50,
}: {
  groupId: string | null;
  limit?: number;
}): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (groupId === null) query = query.is("group_id", null);
  else query = query.eq("group_id", groupId);

  const { data: postsRaw, error: postsError } = await query;
  if (postsError) throw postsError;

  const posts = (postsRaw || []) as AnyRow[];
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  const authorUserIds = posts.map((p) => p.user_id);

  const [{ data: likes }, { data: helpfulMarks }, { data: commentsRaw }] = await Promise.all([
    supabase.from("likes").select("*").in("post_id", postIds),
    supabase.from("helpful_marks").select("*").in("post_id", postIds),
    supabase
      .from("comments")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
  ]);

  const comments = (commentsRaw || []) as AnyRow[];

  const commentUserIds = comments.map((c) => c.user_id);
  const allUserIds = Array.from(new Set([...authorUserIds, ...commentUserIds]));

  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("*")
    .in("user_id", allUserIds);

  const profiles = (profilesRaw || []) as Profile[];
  const profileByUserId = new Map(profiles.map((p) => [p.user_id, p]));

  const likesByPostId = new Map<string, AnyRow[]>();
  for (const l of (likes || []) as AnyRow[]) {
    const arr = likesByPostId.get(l.post_id) || [];
    arr.push(l);
    likesByPostId.set(l.post_id, arr);
  }

  const helpfulByPostId = new Map<string, AnyRow[]>();
  for (const h of (helpfulMarks || []) as AnyRow[]) {
    const arr = helpfulByPostId.get(h.post_id) || [];
    arr.push(h);
    helpfulByPostId.set(h.post_id, arr);
  }

  const commentsByPostId = new Map<string, Comment[]>();
  for (const c of comments) {
    const enriched: Comment = {
      ...(c as any),
      profiles: profileByUserId.get(c.user_id),
    };
    const arr = commentsByPostId.get(c.post_id) || [];
    arr.push(enriched);
    commentsByPostId.set(c.post_id, arr);
  }

  return posts.map((p) => {
    const hydrated: Post = {
      ...(p as any),
      profiles: profileByUserId.get(p.user_id),
      likes: (likesByPostId.get(p.id) || []) as any,
      helpful_marks: (helpfulByPostId.get(p.id) || []) as any,
      comments: commentsByPostId.get(p.id) || [],
    };
    return hydrated;
  });
}
