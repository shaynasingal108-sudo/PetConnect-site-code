import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { petType, breed, challenge, experience } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get groups that match the criteria
    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get relevant posts
    const { data: posts } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .order('helpful_count', { ascending: false })
      .limit(20);

    // Get business profiles sorted by points
    const { data: businesses } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_business', true)
      .order('points', { ascending: false })
      .limit(5);

    // Use AI to generate personalized recommendations
    const aiResponse = await fetch('https://api.ai.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a helpful pet community assistant. Based on user preferences and available groups/posts, recommend the best matches. Always include a health disclaimer if discussing health concerns. Return JSON with this structure:
{
  "groups": [{"id": "group_id", "reason": "why this group is good for them"}],
  "tips": ["tip1", "tip2"],
  "healthWarning": "optional warning if health related"
}`
          },
          {
            role: 'user',
            content: `User has a ${petType}${breed ? ` (${breed})` : ''}, main challenge: ${challenge}, experience level: ${experience}.

Available groups: ${JSON.stringify(groups?.map(g => ({ id: g.id, name: g.name, description: g.description, tags: g.tags })) || [])}

Top posts topics: ${JSON.stringify(posts?.map(p => p.content.substring(0, 100)) || [])}

Recommend 2-3 groups and 2-3 tips based on their needs.`
          }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    let recommendations;
    
    try {
      const content = aiData.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      recommendations = { groups: [], tips: ['Start with basic training routines', 'Join a local pet community'] };
    }

    // Map recommended group IDs to actual group data
    const recommendedGroups = recommendations.groups?.map((rec: any) => {
      const group = groups?.find(g => g.id === rec.id);
      return group ? { ...group, reason: rec.reason } : null;
    }).filter(Boolean) || [];

    // If no specific matches, return top groups
    const finalGroups = recommendedGroups.length > 0 ? recommendedGroups : (groups?.slice(0, 3) || []);

    return new Response(
      JSON.stringify({
        groups: finalGroups,
        tips: recommendations.tips || [],
        businesses: businesses || [],
        healthWarning: challenge === 'Health' ? 
          '⚠️ For urgent health concerns, please consult a veterinarian immediately. The recommendations here are for general guidance only.' : 
          recommendations.healthWarning
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
