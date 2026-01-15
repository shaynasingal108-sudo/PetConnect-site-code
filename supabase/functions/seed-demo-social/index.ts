import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SeedProfile = {
  user_id: string;
  username: string | null;
  is_business: boolean | null;
  business_name: string | null;
};

async function existsFriendship(admin: any, a: string, b: string) {
  const { count, error } = await admin
    .from("friends")
    .select("id", { count: "exact", head: true })
    .or(`and(user_id.eq.${a},friend_id.eq.${b}),and(user_id.eq.${b},friend_id.eq.${a})`);

  if (error) throw error;
  return (count ?? 0) > 0;
}

async function existsAnyMessagesBetween(admin: any, a: string, b: string) {
  const { count, error } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .or(`and(sender_id.eq.${a},receiver_id.eq.${b}),and(sender_id.eq.${b},receiver_id.eq.${a})`);

  if (error) throw error;
  return (count ?? 0) > 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate JWT and extract user
    const authClient = createClient(supabaseUrl, anonKey || serviceRoleKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(jwt);

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Use admin client for seeding (bypasses RLS)
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Find demo-like profiles to seed with
    const { data: businessTargets, error: bizErr } = await admin
      .from("profiles")
      .select("user_id, username, is_business, business_name")
      .eq("is_business", true)
      .neq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(3);

    if (bizErr) throw bizErr;

    const { data: userTargets, error: userTargetsErr } = await admin
      .from("profiles")
      .select("user_id, username, is_business, business_name")
      .eq("is_business", false)
      .neq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(3);

    if (userTargetsErr) throw userTargetsErr;

    const friendTargets: SeedProfile[] =
      (userTargets && userTargets.length > 0 ? userTargets : businessTargets) || [];

    const messageTargets: SeedProfile[] = (businessTargets && businessTargets.length > 0
      ? businessTargets
      : friendTargets) || [];

    let friendsCreated = 0;
    let messagesCreated = 0;

    // Seed accepted friends
    for (const target of friendTargets) {
      if (!target?.user_id) continue;
      const already = await existsFriendship(admin, userId, target.user_id);
      if (already) continue;

      const { error } = await admin.from("friends").insert({
        user_id: userId,
        friend_id: target.user_id,
        status: "accepted",
      });

      if (!error) friendsCreated += 1;
    }

    // Seed a couple of messages so inbox isn't empty
    for (const target of messageTargets) {
      if (!target?.user_id) continue;

      const already = await existsAnyMessagesBetween(admin, userId, target.user_id);
      if (already) continue;

      const displayName =
        target.is_business ? target.business_name || target.username : target.username;

      const inbound = {
        sender_id: target.user_id,
        receiver_id: userId,
        content: target.is_business
          ? `Hi! This is ${displayName}. Thanks for checking us out — how can we help your pet today?`
          : `Hey! I saw your profile on PetsConnect — want to swap pet pics?`,
        read: false,
      };

      const outbound = {
        sender_id: userId,
        receiver_id: target.user_id,
        content: target.is_business
          ? `Hi ${displayName}! I have a quick question about your services.`
          : `Absolutely — what kind of pet do you have?`,
        read: false,
      };

      const { error } = await admin.from("messages").insert([inbound, outbound]);
      if (!error) messagesCreated += 2;
    }

    return new Response(
      JSON.stringify({
        success: true,
        friendsCreated,
        messagesCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("seed-demo-social error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
