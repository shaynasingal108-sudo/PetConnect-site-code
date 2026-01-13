import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isCommunity, setIsCommunity] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !name.trim()) return;

    setIsLoading(true);
    try {
      const { data: group, error } = await supabase.from('groups').insert({
        owner_id: user.id,
        name: name.trim(),
        description: description.trim(),
        city: profile?.city,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        is_community: isCommunity,
        requires_approval: requiresApproval,
      }).select().single();

      if (error) throw error;

      // Auto-join as owner
      await supabase.from('group_memberships').insert({
        user_id: user.id,
        group_id: group.id,
        status: 'approved',
        role: 'owner',
      });

      toast({
        title: 'Group created!',
        description: `${isCommunity ? 'Community' : 'Group'} "${name}" is now live.`,
      });

      setName('');
      setDescription('');
      setTags('');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display">Create a Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="e.g., Golden Retriever Lovers NYC"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., dogs, training, NYC"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Community</Label>
              <p className="text-sm text-muted-foreground">
                Make this a public community
              </p>
            </div>
            <Switch checked={isCommunity} onCheckedChange={setIsCommunity} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Approval</Label>
              <p className="text-sm text-muted-foreground">
                Approve members before they can join
              </p>
            </div>
            <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !name.trim()}
              className="gradient-primary"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
