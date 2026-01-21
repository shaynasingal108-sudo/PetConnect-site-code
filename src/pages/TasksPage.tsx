import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, Circle, Star, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function TasksPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const completeTask = useMutation({
    mutationFn: async ({ taskId, points }: { taskId: string; points: number }) => {
      // Mark task as completed
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ completed: true })
        .eq('id', taskId);
      if (taskError) throw taskError;

      // Add points to profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ points: (profile?.points || 0) + points })
        .eq('id', profile?.id);
      if (profileError) throw profileError;
    },
    onSuccess: async (_, { points }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await refreshProfile();
      toast({ title: 'Task Completed!', description: `You earned ${points} points! 🎉` });
    },
  });

  // Check if tasks were already generated today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysTasks = tasks?.filter((t: any) => new Date(t.created_at) >= today) || [];
  const hasGeneratedToday = todaysTasks.length > 0;

  const generateNewTasks = async () => {
    if (!user || !profile?.pet_type) {
      toast({
        title: 'Pet info needed',
        description: 'Please set your pet type in your profile first.',
        variant: 'destructive',
      });
      return;
    }

    if (hasGeneratedToday) {
      toast({
        title: 'Already generated today!',
        description: 'Come back tomorrow for new daily tasks.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tasks', {
        body: {
          userId: user.id,
          petType: profile.pet_type,
          petBreed: profile.pet_breed,
        },
      });

      if (error) throw error;
      
      // Check for already generated error from backend
      if (data?.alreadyGenerated) {
        toast({
          title: 'Already generated today!',
          description: 'Come back tomorrow for new daily tasks.',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: '5 Daily Tasks Generated!', description: 'Complete them to earn 5 points!' });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      console.error('Error generating tasks:', error);
      toast({
        title: 'Could not generate tasks',
        description: error?.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingTasks = tasks?.filter((t: any) => !t.completed) || [];
  const completedTasks = tasks?.filter((t: any) => t.completed) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold">Daily Tasks</h1>
        <p className="text-muted-foreground">Complete tasks to earn points!</p>
        <div className="mt-2 inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
          <Star className="h-5 w-5 text-primary" />
          <span className="font-semibold">{profile?.points || 0} points</span>
        </div>
      </div>

      {/* Points Explanation */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="pt-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" /> How to Earn Points
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Complete daily tasks (1-5 points each)</li>
            <li>✓ Get likes on your posts (+1 point each)</li>
            <li>✓ Get comments on your posts (+1 point each)</li>
            <li>✓ Get "Helpful" marks on posts (+2 points each)</li>
            <li>✓ Have your posts saved by others (+1 point each)</li>
            <li>✓ Update your AI Life (+2 points each entry)</li>
          </ul>
          {profile?.is_business ? (
            <p className="text-xs text-primary mt-2">💼 As a business, use points to boost your posts!</p>
          ) : (
            <p className="text-xs text-primary mt-2">🎁 Earn points for discounts at pet businesses!</p>
          )}
        </CardContent>
      </Card>

      {/* Generate Tasks Button */}
      <Button
        onClick={generateNewTasks}
        disabled={isGenerating || hasGeneratedToday}
        variant="outline"
        className="w-full gap-2"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasGeneratedToday ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {hasGeneratedToday
          ? 'Tasks Generated Today ✓'
          : `Generate AI Tasks for My ${profile?.pet_type || 'Pet'}`}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
          <CardDescription>
            AI-generated tasks based on your {profile?.pet_type || 'pet'} care needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No pending tasks! Generate new ones with AI.</p>
            </div>
          ) : (
            pendingTasks.map((task: any) => (
              <button
                key={task.id}
                onClick={() => completeTask.mutate({ taskId: task.id, points: task.points || 2 })}
                disabled={completeTask.isPending}
                className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              >
                <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-primary font-semibold flex-shrink-0">
                  +{task.points || 2} <Star className="h-4 w-4" />
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedTasks.slice(0, 10).map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30 opacity-60"
              >
                <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold line-through truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground font-semibold flex-shrink-0">
                  +{task.points || 2} <Star className="h-4 w-4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
