import { useState, useRef } from 'react';
import { Image, Sparkles, Loader2, X } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('post-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast({
        title: 'Image uploaded!',
        description: 'Your image is ready to post.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setImagePreview('');
      toast({
        title: 'Upload failed',
        description: error.message || 'Could not upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl('');
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      setImagePreview('');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (groupId) queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not create post.',
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
        description: error.message || 'Please try again later.',
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Image className="h-4 w-4" />
              )}
              {isUploading ? 'Uploading...' : 'Add Image'}
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

          {(imagePreview || imageUrl) && (
            <div className="relative">
              <img 
                src={imagePreview || imageUrl} 
                alt="Preview" 
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !content.trim() || isUploading}
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
