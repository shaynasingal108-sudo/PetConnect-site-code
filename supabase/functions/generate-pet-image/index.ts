import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { petType, petBreed, updates } = await req.json();
    
    if (!petType) {
      return new Response(
        JSON.stringify({ error: 'Pet type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build a description of the pet based on updates
    const updatesText = updates?.map((u: any) => `${u.entry_type}: ${u.content}`).join('. ') || '';
    
    const prompt = `Generate a cute, heartwarming image of a ${petType}${petBreed ? ` (${petBreed})` : ''} pet. 
${updatesText ? `The pet's recent status: ${updatesText}. Reflect this in the image if relevant.` : ''}
Make it a beautiful, professional quality pet portrait with a warm, happy atmosphere. Digital art style.`;

    console.log('Generating pet image with prompt:', prompt);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
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
          JSON.stringify({ error: 'AI credits are exhausted. Please add credits and try again.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const message = data.choices?.[0]?.message?.content || 'Here is your pet visualization!';

    return new Response(
      JSON.stringify({ imageUrl, message }),
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
