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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user already generated tasks today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: existingTasks, error: checkError } = await supabase
      .from('tasks')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing tasks:', checkError);
      throw checkError;
    }

    if (existingTasks && existingTasks.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'You already generated tasks today! Come back tomorrow for new tasks.',
          alreadyGenerated: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate social engagement tasks - 5 tasks worth 1 point each = 5 total
    const socialTasks = [
      { 
        title: 'Get 2 likes on your posts', 
        description: 'Share something fun about your ' + petType + ' to earn likes from the community',
        points: 1,
        task_type: 'likes',
        target_count: 2
      },
      { 
        title: 'Get 1 save on your posts', 
        description: 'Post something helpful that others want to save for later',
        points: 1,
        task_type: 'saves',
        target_count: 1
      },
      { 
        title: 'Get 1 helpful mark', 
        description: 'Share advice or tips that help fellow ' + petType + ' owners',
        points: 1,
        task_type: 'helpful',
        target_count: 1
      },
      { 
        title: 'Get 2 comments on your posts', 
        description: 'Start a conversation about ' + (petBreed || petType) + ' care',
        points: 1,
        task_type: 'comments',
        target_count: 2
      },
      { 
        title: 'Create a new post', 
        description: 'Share a moment, tip, or question with the community',
        points: 1,
        task_type: 'post',
        target_count: 1
      }
    ];

    // Insert tasks into database
    const tasksToInsert = socialTasks.map((task) => ({
      user_id: userId,
      title: task.title,
      description: task.description,
      points: task.points,
      completed: false,
    }));

    const { error: insertError } = await supabase.from('tasks').insert(tasksToInsert);
    
    if (insertError) {
      console.error('Error inserting tasks:', insertError);
      throw insertError;
    }

    console.log(`Generated ${tasksToInsert.length} tasks for user ${userId}`);

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
