import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'India', 'Brazil', 'Japan', 'Mexico', 'Spain', 'Italy', 'Netherlands', 'Singapore', 'South Africa', 'Other'];
const petTypes = ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Other'];
const experienceLevels = ['new', 'intermediate', 'experienced'];

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    country: '', city: '', neighborhood: '', pet_type: '', pet_breed: '', experience_level: 'new'
  });

  const handleSubmit = async () => {
    if (!user) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ ...formData, onboarding_completed: true })
      .eq('user_id', user.id);

    setIsLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await refreshProfile();
      toast({ title: 'Welcome to PetsConnect!', description: 'Your profile is ready.' });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background paw-pattern p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-xl">Tell us about yourself 🐾</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={formData.country} onValueChange={(v) => setFormData({...formData, country: v})}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Neighborhood (optional)</Label>
                <Input value={formData.neighborhood} onChange={(e) => setFormData({...formData, neighborhood: e.target.value})} />
              </div>
              <Button className="w-full gradient-primary" onClick={() => setStep(2)}>Next</Button>
            </>
          )}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Pet Type</Label>
                <Select value={formData.pet_type} onValueChange={(v) => setFormData({...formData, pet_type: v})}>
                  <SelectTrigger><SelectValue placeholder="Select pet type" /></SelectTrigger>
                  <SelectContent>{petTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Breed</Label>
                <Input value={formData.pet_breed} onChange={(e) => setFormData({...formData, pet_breed: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select value={formData.experience_level} onValueChange={(v) => setFormData({...formData, experience_level: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{experienceLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1 gradient-primary" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
