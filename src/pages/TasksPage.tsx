import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, Circle, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function TasksPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingTasks = tasks?.filter((t: any) => !t.completed) || [];
  const completedTasks = tasks?.filter((t: any) => t.completed) || [];

  // Show sample tasks if none exist
  const sampleTasks = [
    { id: 'sample1', title: `Walk your ${profile?.pet_type || 'pet'}`, description: 'Take a 15-minute walk', points: 2, completed: false },
    { id: 'sample2', title: 'Share a photo', description: 'Post a cute photo of your pet', points: 3, completed: false },
    { id: 'sample3', title: 'Help someone', description: 'Comment helpful advice on a post', points: 5, completed: false },
  ];

  const displayTasks = pendingTasks.length > 0 ? pendingTasks : sampleTasks;

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

      <Card>
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
          <CardDescription>
            Earn points by caring for your pet and helping the community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayTasks.map((task: any) => (
            <button
              key={task.id}
              onClick={() => !task.id.startsWith('sample') && completeTask.mutate({ taskId: task.id, points: task.points })}
              className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <Circle className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-semibold">{task.title}</p>
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 text-primary font-semibold">
                +{task.points} <Star className="h-4 w-4" />
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30 opacity-60"
              >
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <div className="flex-1">
                  <p className="font-semibold line-through">{task.title}</p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground font-semibold">
                  +{task.points} <Star className="h-4 w-4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
