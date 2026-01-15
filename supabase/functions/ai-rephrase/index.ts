import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: "Content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gatewayRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You rephrase pet-related social media posts to be more engaging, friendly, and clear. Keep the same meaning. Return ONLY the rephrased text, nothing else.",
          },
          {
            role: "user",
            content: `Rephrase this post:\n\n${content}`,
          },
        ],
      }),
    });

    if (!gatewayRes.ok) {
      const errText = await gatewayRes.text().catch(() => "");
      console.error("ai-rephrase gateway error", {
        status: gatewayRes.status,
        body: errText,
      });

      const friendly =
        gatewayRes.status === 429
          ? "Too many AI requests right now — please try again in a moment."
          : gatewayRes.status === 402
            ? "AI credits are exhausted — please add credits to continue."
            : "AI request failed — please try again.";

      return new Response(JSON.stringify({ error: friendly }), {
        status: gatewayRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await gatewayRes.json();
    const rephrased = (data?.choices?.[0]?.message?.content as string | undefined)?.trim();

    return new Response(JSON.stringify({ rephrased: rephrased || content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-rephrase error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
