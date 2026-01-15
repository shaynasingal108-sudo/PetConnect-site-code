import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Eye, Sparkles, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function AILifePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEntry, setNewEntry] = useState('');
  const [entryType, setEntryType] = useState('update');
  const [showConsent, setShowConsent] = useState(!localStorage.getItem('ai-life-consent'));
  const [consentChecked, setConsentChecked] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['ai-life-entries', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_life_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ai_life_entries').insert({
        user_id: user?.id,
        content: newEntry,
        entry_type: entryType,
        pet_name: profile?.username + "'s pet",
        pet_type: profile?.pet_type,
        pet_breed: profile?.pet_breed,
      });
      if (error) throw error;

      // Award points for AI Life update
      const newPoints = (profile?.points || 0) + 2;
      await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', profile?.id);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['ai-life-entries'] });
      await refreshProfile();
      setNewEntry('');
      toast({ 
        title: 'Entry added! +2 points 🎉', 
        description: 'Your pet update has been recorded.' 
      });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('ai_life_entries').delete().eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-life-entries'] });
      toast({ title: 'Entry deleted!' });
    },
  });

  const handleConsent = () => {
    if (consentChecked) {
      localStorage.setItem('ai-life-consent', 'true');
      setShowConsent(false);
    }
  };

  const generatePetImage = async () => {
    if (!profile?.pet_type) {
      toast({
        title: 'Pet info needed',
        description: 'Please set your pet type in your profile first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const recentUpdates = entries?.slice(0, 5) || [];
      
      const { data, error } = await supabase.functions.invoke('generate-pet-image', {
        body: {
          petType: profile.pet_type,
          petBreed: profile.pet_breed,
          updates: recentUpdates,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast({ title: 'Image generated!', description: 'Here is your pet visualization.' });
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast({
        title: 'Could not generate image',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Consent Dialog */}
      <Dialog open={showConsent} onOpenChange={setShowConsent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> AI Life Consent
            </DialogTitle>
            <DialogDescription>
              Before using AI Life features, please read and accept our terms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>By using AI Life, you agree to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Share pet health and behavior updates with our AI system</li>
                <li>Receive AI-generated insights and recommendations</li>
                <li>Allow AI to generate visualizations of your pet</li>
                <li>Understand that AI suggestions are not veterinary advice</li>
              </ul>
              <p className="text-amber-600 font-medium mt-4">
                ⚠️ For urgent health concerns, always consult a licensed veterinarian.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="consent" 
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked === true)}
              />
              <Label htmlFor="consent" className="text-sm">
                I understand and agree to these terms
              </Label>
            </div>
            <Button 
              onClick={handleConsent} 
              disabled={!consentChecked}
              className="w-full gradient-primary"
            >
              <Check className="h-4 w-4 mr-2" /> Accept & Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
          <span>🤖</span> AI Pet Life
        </h1>
        <p className="text-muted-foreground">Track your pet's life and get AI-powered insights</p>
        <p className="text-xs text-primary mt-1">+2 points for each update!</p>
      </div>

      {/* Generate Pet Image */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Pet Visualization
          </CardTitle>
          <CardDescription>
            Generate an AI image of your pet based on your updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {generatedImage && (
            <div className="relative">
              <img 
                src={generatedImage} 
                alt="AI Generated Pet" 
                className="w-full rounded-lg max-h-96 object-contain bg-muted"
                loading="eager"
              />
            </div>
          )}
          <Button
            onClick={generatePetImage}
            disabled={isGeneratingImage}
            className="w-full gradient-primary"
          >
            {isGeneratingImage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Generate Pet Visual
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Add New Update */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Update</CardTitle>
          <CardDescription>Share updates about your pet's health, behavior, or milestones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['update', 'health', 'milestone', 'concern'].map((type) => (
              <Button
                key={type}
                variant={entryType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEntryType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder="How is your pet doing today? Any health updates, milestones, or concerns?"
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            rows={3}
          />
          <Button
            onClick={() => addEntry.mutate()}
            disabled={!newEntry.trim() || addEntry.isPending}
            className="gradient-primary"
          >
            {addEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Entry (+2 points)
          </Button>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Your Pet's Timeline</h2>
        {entries?.length === 0 ? (
          <Card className="text-center py-8 text-muted-foreground">
            <CardContent>
              <p>No entries yet. Start tracking your pet's life!</p>
            </CardContent>
          </Card>
        ) : (
          entries?.map((entry: any) => (
            <Card key={entry.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full mb-2 ${
                      entry.entry_type === 'health' ? 'bg-red-100 text-red-700' :
                      entry.entry_type === 'concern' ? 'bg-amber-100 text-amber-700' :
                      entry.entry_type === 'milestone' ? 'bg-green-100 text-green-700' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {entry.entry_type}
                    </span>
                    <p>{entry.content}</p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => deleteEntry.mutate(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
