import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const petTypes = ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Other'];
const challenges = ['Training', 'Health', 'Behavior', 'Nutrition', 'Socialization', 'Grooming'];
const experienceLevels = ['New Owner', 'Some Experience', 'Experienced Owner'];

export default function QuizPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    petType: profile?.pet_type || '',
    breed: profile?.pet_breed || '',
    challenge: '',
    experience: profile?.experience_level || '',
  });

  const [recommendations, setRecommendations] = useState<any[]>([]);

  const handleSubmit = async () => {
    setIsLoading(true);
    // Simulate AI recommendations
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setRecommendations([
      { type: 'group', name: `${formData.petType} Lovers Community`, members: 1240, description: 'Connect with other pet owners' },
      { type: 'group', name: `${formData.challenge} Tips & Tricks`, members: 890, description: `Expert advice on ${formData.challenge.toLowerCase()}` },
      { type: 'tip', content: `As a ${formData.experience.toLowerCase()}, focus on consistent routines with your ${formData.petType.toLowerCase()}.` },
    ]);
    
    setIsLoading(false);
    setShowResults(true);
  };

  if (showResults) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-4">
          <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Your Recommendations
          </h1>
        </div>

        <div className="space-y-4">
          {recommendations.map((rec, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                {rec.type === 'group' ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{rec.name}</h3>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.members} members</p>
                    </div>
                    <Button size="sm" className="gradient-primary">Join</Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <p>{rec.content}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" onClick={() => setShowResults(false)} className="w-full">
          Take Quiz Again
        </Button>
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
