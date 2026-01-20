import { useState } from 'react';
import { Loader2, Rocket, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface BoostPostDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const boostOptions = [
  { points: 10, hours: 2, level: 1, reach: '2 Hours', description: 'Top post for 2 hours' },
  { points: 25, hours: 6, level: 2, reach: '6 Hours', description: 'Top post for 6 hours' },
  { points: 50, hours: 24, level: 3, reach: '24 Hours', description: 'Top post for a full day' },
];

export function BoostPostDialog({ postId, open, onOpenChange }: BoostPostDialogProps) {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBoost, setSelectedBoost] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const currentPoints = profile?.points || 0;
  const selectedOption = boostOptions[selectedBoost];

  const handleBoost = async () => {
    if (!profile || currentPoints < selectedOption.points) {
      toast({
        title: 'Not enough points',
        description: `You need ${selectedOption.points} points to use this boost.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Calculate boost end time
      const boostUntil = new Date();
      boostUntil.setHours(boostUntil.getHours() + selectedOption.hours);

      // Update post with boost info
      const { error: postError } = await supabase
        .from('posts')
        .update({ 
          boost_until: boostUntil.toISOString(),
          boost_level: selectedOption.level 
        })
        .eq('id', postId);

      if (postError) throw postError;

      // Deduct points
      const newPoints = currentPoints - selectedOption.points;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', profile.id);

      if (profileError) throw profileError;
      
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
      
      toast({
        title: 'Post Boosted! 🚀',
        description: `Your post will be at the top for ${selectedOption.hours} hours. ${selectedOption.points} points used.`,
      });
      
      onOpenChange(false);
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
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" /> Boost Your Post
          </DialogTitle>
          <DialogDescription>
            Use your points to increase your post's visibility
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Your Points</p>
            <p className="text-3xl font-bold text-primary">{currentPoints}</p>
          </div>

          <div className="space-y-4">
            {boostOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => setSelectedBoost(index)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedBoost === index
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${currentPoints < option.points ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${selectedBoost === index ? 'bg-primary/20' : 'bg-muted'}`}>
                      <Sparkles className={`h-4 w-4 ${selectedBoost === index ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-semibold">{option.reach} Reach</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{option.points}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleBoost}
            disabled={isLoading || currentPoints < selectedOption.points}
            className="w-full gradient-primary"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            Boost for {selectedOption.points} Points
          </Button>

          {currentPoints < selectedOption.points && (
            <p className="text-xs text-center text-destructive">
              You need {selectedOption.points - currentPoints} more points for this boost
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}