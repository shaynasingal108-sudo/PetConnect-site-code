import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, AlertTriangle, Store, Users, Brain, Lightbulb, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PostCard } from '@/components/feed/PostCard';
import { fetchHydratedHelpfulPosts, fetchHydratedPostsSearch } from '@/lib/posts';

const petTypes = ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Other'];
const challenges = ['Training', 'Health', 'Behavior', 'Nutrition', 'Socialization', 'Grooming'];
const experienceLevels = ['New Owner', 'Some Experience', 'Experienced Owner'];

export default function SuggestionsPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'assistant' | 'search'>('assistant');
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [formData, setFormData] = useState({
    petType: profile?.pet_type || '',
    breed: profile?.pet_breed || '',
    challenge: '',
    experience: profile?.experience_level || '',
  });

  const [question, setQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [suggestionResult, setSuggestionResult] = useState<{
    suggestion: string;
    recommendedGroups?: any[];
    recommendedBusinesses?: any[];
  } | null>(null);

  const [recommendations, setRecommendations] = useState<{
    groups: any[];
    tips: string[];
    businesses: any[];
    healthWarning?: string;
  }>({ groups: [], tips: [], businesses: [] });

  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useQuery({
    queryKey: ['search-posts-hydrated', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return await fetchHydratedHelpfulPosts({ limit: 5 });
      return await fetchHydratedPostsSearch({ query: searchQuery, limit: 20 });
    },
    enabled: true,
  });

  const handleQuizSubmit = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-quiz-recommend', {
        body: formData,
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      setRecommendations(data);
      setShowResults(true);
    } catch (error: any) {
      console.error('Quiz error:', error);
      toast({
        title: 'Error getting recommendations',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionSubmit = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setSuggestionResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-suggestions', {
        body: {
          question,
          petType: profile?.pet_type,
          petBreed: profile?.pet_breed,
          city: profile?.city,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      setSuggestionResult(data);
    } catch (error: any) {
      console.error('Suggestions error:', error);
      toast({
        title: 'Error getting suggestions',
        description: error.message || 'Please try again later.',
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
        description: requiresApproval ? 'Waiting for approval' : 'Welcome to the group!',
      });
      queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> AI Assistant
        </h1>
        <p className="text-muted-foreground">Get personalized recommendations and answers</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'assistant' | 'search')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assistant" className="flex items-center gap-1 text-xs sm:text-sm">
            <Brain className="h-4 w-4" /> Quiz + Ask
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-1 text-xs sm:text-sm">
            <Search className="h-4 w-4" /> Search Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tell us about your pet</CardTitle>
              <CardDescription>Answer a few questions to get tailored recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pet Type</Label>
                <Select value={formData.petType} onValueChange={(v) => setFormData({ ...formData, petType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pet type" />
                  </SelectTrigger>
                  <SelectContent>
                    {petTypes.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Main Challenge</Label>
                <Select value={formData.challenge} onValueChange={(v) => setFormData({ ...formData, challenge: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="What do you need help with?" />
                  </SelectTrigger>
                  <SelectContent>
                    {challenges.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select value={formData.experience} onValueChange={(v) => setFormData({ ...formData, experience: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Your experience" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleQuizSubmit}
                disabled={!formData.petType || !formData.challenge || !formData.experience || isLoading}
                className="w-full gradient-primary"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Get Recommendations
              </Button>
            </CardContent>
          </Card>

          {showResults && (
            <div className="space-y-4 animate-fade-in">
              {recommendations.healthWarning && (
                <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                  <CardContent className="pt-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{recommendations.healthWarning}</p>
                  </CardContent>
                </Card>
              )}

              {recommendations.groups && recommendations.groups.length > 0 && (
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
                            {group.reason && <p className="text-xs text-primary mt-1">✨ {group.reason}</p>}
                          </div>
                          <Button size="sm" className="gradient-primary" onClick={() => handleJoinGroup(group.id, group.requires_approval)}>
                            Join
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {recommendations.tips && recommendations.tips.length > 0 && (
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

              {recommendations.businesses && recommendations.businesses.length > 0 && (
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
          )}

          <Card>
            <CardHeader>
              <CardTitle>Ask anything about your pet</CardTitle>
              <CardDescription>Get personalized advice, tips, and community recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="E.g., How do I train my puppy to stop biting? What food is best for senior cats?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
              />
              <Button onClick={handleSuggestionSubmit} disabled={!question.trim() || isLoading} className="w-full gradient-primary">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lightbulb className="h-4 w-4 mr-2" />}
                Get AI Suggestions
              </Button>
            </CardContent>
          </Card>

          {isLoading && (
            <Card>
              <CardContent className="py-8 flex justify-center">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Thinking...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {suggestionResult && (
            <div className="space-y-4 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">🤖</span> AI Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{suggestionResult.suggestion}</p>
                </CardContent>
              </Card>

              {suggestionResult.recommendedGroups && suggestionResult.recommendedGroups.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" /> Related Groups
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {suggestionResult.recommendedGroups.map((group: any) => (
                      <div
                        key={group.id || group.name}
                        className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => group.id && navigate(`/groups/${group.id}`)}
                      >
                        <div className="font-medium text-sm">{group.name}</div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{group.description}</p>
                        {group.tags && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {group.tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {suggestionResult.recommendedBusinesses && suggestionResult.recommendedBusinesses.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Store className="h-4 w-4" /> Local Pet Businesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {suggestionResult.recommendedBusinesses.map((business: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => navigate('/businesses')}
                      >
                        <div className="font-medium text-sm">{business.business_name}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {business.business_category}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{business.business_description}</p>
                        {business.city && <p className="text-xs text-muted-foreground mt-1">📍 {business.city}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts (training, lost pet, grooming...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {!searchQuery.trim() && (
            <p className="text-sm text-muted-foreground text-center mb-2">💡 Try searching: "training", "cat", "grooming", "health"</p>
          )}

          {isSearching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : searchError ? (
            <Card className="text-center py-8 text-muted-foreground">
              <CardContent>
                <p>Could not load posts. Please try again.</p>
              </CardContent>
            </Card>
          ) : (searchResults?.length || 0) === 0 ? (
            <Card className="text-center py-8 text-muted-foreground">
              <CardContent>
                <p>No posts found{searchQuery.trim() ? ` matching \"${searchQuery}\"` : ''}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(searchResults || []).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
