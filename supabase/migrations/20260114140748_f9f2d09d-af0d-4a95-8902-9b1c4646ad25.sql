-- Allow users to delete their own AI life entries
CREATE POLICY "Users can delete their AI life entries"
ON public.ai_life_entries
FOR DELETE
USING (auth.uid() = user_id);