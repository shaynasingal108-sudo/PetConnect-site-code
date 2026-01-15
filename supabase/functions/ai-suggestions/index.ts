import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, petType, petBreed, city } = await req.json();
    
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client to fetch relevant posts and groups
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant posts for context
    const { data: posts } = await supabase
      .from('posts')
      .select('content, helpful_count')
      .order('helpful_count', { ascending: false })
      .limit(5);

    // Fetch relevant groups (exclude test groups)
    const { data: allGroups } = await supabase
      .from('groups')
      .select('id, name, description, tags')
      .limit(10);
    
    const groups = allGroups?.filter(g => !['Hhhh', 'hhhh', 'HHHH'].includes(g.name?.trim())) || [];

    // Fetch businesses
    const { data: businesses } = await supabase
      .from('profiles')
      .select('business_name, business_category, business_description, city')
      .eq('is_business', true)
      .limit(3);

    const contextPosts = posts?.map(p => p.content).join('\n') || '';
    const contextGroups = groups?.map(g => `${g.name}: ${g.description}`).join('\n') || '';
    const contextBusinesses = businesses?.map(b => `${b.business_name} (${b.business_category}): ${b.business_description}`).join('\n') || '';

    const systemPrompt = `You are a helpful AI assistant for pet owners on a pet community platform called PetsConnect. 
You provide practical advice, recommendations, and support for pet-related questions.

Available community groups:
${contextGroups}

Popular helpful posts from the community:
${contextPosts}

Local pet businesses:
${contextBusinesses}

Guidelines:
- Be warm, friendly, and supportive
- Give specific, actionable advice
- Recommend relevant groups or businesses when appropriate
- For health concerns, always recommend consulting a veterinarian
- Keep responses concise but helpful (under 300 words)
- Use emojis sparingly to be friendly 🐾`;

    const userContext = petType 
      ? `User has a ${petType}${petBreed ? ` (${petBreed})` : ''}${city ? ` in ${city}` : ''}.`
      : '';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${userContext}\n\nQuestion: ${question}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit reached. Please try again in a minute.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content?.trim();

    // Return relevant groups and businesses along with the suggestion
    return new Response(
      JSON.stringify({ 
        suggestion,
        recommendedGroups: groups?.slice(0, 3) || [],
        recommendedBusinesses: businesses || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
