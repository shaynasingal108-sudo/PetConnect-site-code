import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Flag, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ReportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    description: '',
  });

  const submitReport = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user?.id,
        reported_type: formData.type,
        reported_name: formData.name,
        description: formData.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Report Submitted', description: 'Thank you for helping keep our community safe.' });
      setFormData({ type: '', name: '', description: '' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
          <Flag className="h-6 w-6" /> Report
        </h1>
        <p className="text-muted-foreground">Help keep our community safe</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit a Report</CardTitle>
          <CardDescription>
            Report users, groups, or communities that violate our guidelines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>What are you reporting?</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="group">Group</SelectItem>
                <SelectItem value="community">Community</SelectItem>
                <SelectItem value="post">Post</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Name of {formData.type || 'item'}</Label>
            <Input
              placeholder={`Enter the ${formData.type || 'item'} name or username`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe what happened and why you're reporting this..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <Button
            onClick={() => submitReport.mutate()}
            disabled={!formData.type || !formData.name || !formData.description || submitReport.isPending}
            className="w-full gradient-primary"
          >
            {submitReport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
