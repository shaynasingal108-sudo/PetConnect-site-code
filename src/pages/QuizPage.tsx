import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, AlertTriangle, Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const petTypes = ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Other'];
const challenges = ['Training', 'Health', 'Behavior', 'Nutrition', 'Socialization', 'Grooming'];
const experienceLevels = ['New Owner', 'Some Experience', 'Experienced Owner'];

export default function QuizPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    petType: profile?.pet_type || '',
    breed: profile?.pet_breed || '',
    challenge: '',
    experience: profile?.experience_level || '',
  });

  const [recommendations, setRecommendations] = useState<{
    groups: any[];
    tips: string[];
    businesses: any[];
    healthWarning?: string;
  }>({ groups: [], tips: [], businesses: [] });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-quiz-recommend', {
        body: formData
      });

      if (error) throw error;

      setRecommendations(data);
      setShowResults(true);
    } catch (error: any) {
      toast({
        title: 'Error getting recommendations',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string, requiresApproval: boolean) => {
    if (!user) return;
    
    const { error } = await supabase.from('group_memberships').insert({
      group_id: groupId,
      user_id: user.id,
      status: requiresApproval ? 'pending' : 'approved',
      role: 'member',
    });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already a member!', description: 'You have already joined this group.' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ 
        title: requiresApproval ? 'Request Sent!' : 'Joined!', 
        description: requiresApproval ? 'Waiting for approval' : 'Welcome to the group!' 
      });
      queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
    }
  };

  if (showResults) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-4">
          <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Your Recommendations
          </h1>
          <p className="text-muted-foreground">Based on your {formData.petType} and {formData.challenge.toLowerCase()} needs</p>
        </div>

        {recommendations.healthWarning && (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{recommendations.healthWarning}</p>
            </CardContent>
          </Card>
        )}

        {recommendations.groups.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Recommended Groups
            </h2>
            {recommendations.groups.map((group: any) => (
              <Card key={group.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{group.name}</h3>
                        {group.is_community && <Badge variant="secondary">Community</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                      {group.reason && (
                        <p className="text-xs text-primary mt-1">✨ {group.reason}</p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      className="gradient-primary"
                      onClick={() => handleJoinGroup(group.id, group.requires_approval)}
                    >
                      Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {recommendations.tips.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold">💡 Tips for You</h2>
            {recommendations.tips.map((tip, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <p className="text-sm">{tip}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {recommendations.businesses.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Store className="h-4 w-4" /> Recommended Businesses
            </h2>
            {recommendations.businesses.map((biz: any) => (
              <Card key={biz.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={biz.business_logo} />
                      <AvatarFallback>{biz.business_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{biz.business_name}</h3>
                      <Badge variant="outline">{biz.business_category}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowResults(false)} className="flex-1">
            Take Quiz Again
          </Button>
          <Button onClick={() => navigate('/groups')} className="flex-1 gradient-primary">
            Browse All Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> AI Quiz
        </h1>
        <p className="text-muted-foreground">Get personalized recommendations for you and your pet</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tell us about your pet</CardTitle>
          <CardDescription>Answer a few questions to get tailored recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pet Type</Label>
            <Select value={formData.petType} onValueChange={(v) => setFormData({ ...formData, petType: v })}>
              <SelectTrigger><SelectValue placeholder="Select pet type" /></SelectTrigger>
              <SelectContent>{petTypes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Main Challenge</Label>
            <Select value={formData.challenge} onValueChange={(v) => setFormData({ ...formData, challenge: v })}>
              <SelectTrigger><SelectValue placeholder="What do you need help with?" /></SelectTrigger>
              <SelectContent>{challenges.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Experience Level</Label>
            <Select value={formData.experience} onValueChange={(v) => setFormData({ ...formData, experience: v })}>
              <SelectTrigger><SelectValue placeholder="Your experience" /></SelectTrigger>
              <SelectContent>{experienceLevels.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={!formData.petType || !formData.challenge || !formData.experience || isLoading}
            className="w-full gradient-primary"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Get Recommendations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
