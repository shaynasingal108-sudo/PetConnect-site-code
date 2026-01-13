import { useState } from 'react';
import { Image, Video, Sparkles, Loader2, Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: string;
}

export function CreatePostDialog({ open, onOpenChange, groupId }: CreatePostDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl || null,
        city: profile?.city,
        group_id: groupId || null,
      });

      if (error) throw error;

      toast({
        title: 'Post created!',
        description: 'Your post is now live.',
      });

      setContent('');
      setImageUrl('');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRephrase = async () => {
    if (!content.trim()) return;

    setIsRephrasing(true);
    try {
      const response = await supabase.functions.invoke('ai-rephrase', {
        body: { content: content.trim() }
      });

      if (response.error) throw response.error;
      
      if (response.data?.rephrased) {
        setContent(response.data.rephrased);
        toast({
          title: 'Content rephrased!',
          description: 'Your post has been improved by AI.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Could not rephrase',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsRephrasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display">Create a Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="What's on your mind about your pet?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
          />
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const url = prompt('Enter image URL:');
                if (url) setImageUrl(url);
              }}
            >
              <Image className="h-4 w-4" />
              Add Image
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRephrase}
              disabled={isRephrasing || !content.trim()}
            >
              {isRephrasing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI Rephrase
            </Button>
          </div>

          {imageUrl && (
            <div className="relative">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setImageUrl('')}
              >
                Remove
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !content.trim()}
              className="gradient-primary"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
