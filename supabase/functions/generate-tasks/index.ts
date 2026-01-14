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
    const { userId, petType, petBreed } = await req.json();
    
    if (!userId || !petType) {
      return new Response(
        JSON.stringify({ error: 'User ID and pet type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to generate personalized tasks
    const response = await fetch('https://api.ai.lovable.dev/v1/chat/completions', {
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
            content: `You are a pet care expert. Generate 3-5 daily tasks for a ${petType}${petBreed ? ` (${petBreed})` : ''} owner. Each task should be helpful for pet care and community engagement. Return JSON array with objects containing: title, description, points (1-5 based on effort).`
          },
          {
            role: 'user',
            content: `Generate daily care tasks for my ${petType}${petBreed ? ` (${petBreed})` : ''}. Include a mix of pet care activities and community engagement tasks like posting or helping others.`
          }
        ],
      }),
    });

    const aiData = await response.json();
    let tasks = [];
    
    try {
      const content = aiData.choices?.[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      tasks = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      // Fallback tasks
      tasks = [
        { title: `Walk your ${petType}`, description: 'Take a 15-minute walk outside', points: 2 },
        { title: 'Post a photo', description: 'Share a cute moment with the community', points: 3 },
        { title: 'Help a fellow pet owner', description: 'Comment helpful advice on a post', points: 5 },
        { title: 'Update AI Life', description: 'Log an update about your pet', points: 2 },
      ];
    }

    // Insert tasks into database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tasksToInsert = tasks.map((task: any) => ({
      user_id: userId,
      title: task.title,
      description: task.description,
      points: task.points || 2,
      completed: false,
    }));

    const { error } = await supabase.from('tasks').insert(tasksToInsert);
    
    if (error) {
      console.error('Error inserting tasks:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, tasks: tasksToInsert }),
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
