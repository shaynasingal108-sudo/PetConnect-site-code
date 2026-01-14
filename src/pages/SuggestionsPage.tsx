import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Brain, Search, Send, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface AIResponse {
  suggestion: string;
  recommendedGroups: Array<{
    id: string;
    name: string;
    description: string;
    tags: string[];
  }>;
  recommendedBusinesses: Array<{
    business_name: string;
    business_category: string;
    business_description: string;
    city: string;
  }>;
}

export default function SuggestionsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-posts', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .ilike('content', `%${searchQuery}%`)
        .limit(10);
      return data || [];
    },
    enabled: searchQuery.length > 2,
  });

  const handleAskAI = async () => {
    if (!question.trim()) return;
    setIsAsking(true);
    setAiResponse(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-suggestions', {
        body: { 
          question: question.trim(),
          petType: profile?.pet_type,
          petBreed: profile?.pet_breed,
          city: profile?.city
        }
      });

      if (error) throw error;

      if (data?.error) {
        // Handle rate limit or credit errors
        toast({
          title: 'AI Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      setAiResponse(data);
    } catch (error: any) {
      console.error('AI error:', error);
      toast({
        title: 'Could not get suggestions',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
          <Brain className="h-6 w-6" /> AI Suggestions
        </h1>
        <p className="text-muted-foreground">Get help and find relevant content</p>
      </div>

      <Tabs defaultValue="ask">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ask">Ask AI</TabsTrigger>
          <TabsTrigger value="search">Search Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="ask" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ask your AI Friend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="What would you like to know about your pet? E.g., 'My dog is scratching a lot, what could it be?'"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAskAI}
                disabled={!question.trim() || isAsking}
                className="w-full gradient-primary"
              >
                {isAsking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Get Suggestions
              </Button>
            </CardContent>
          </Card>

          {isAsking && (
            <Card>
              <CardContent className="py-8 flex justify-center">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Thinking...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {aiResponse && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🤖</span>
                    <div className="whitespace-pre-wrap text-sm">{aiResponse.suggestion}</div>
                  </div>
                </CardContent>
              </Card>

              {aiResponse.recommendedGroups.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" /> Recommended Groups
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {aiResponse.recommendedGroups.map((group) => (
                      <div 
                        key={group.id}
                        className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => navigate(`/groups/${group.id}`)}
                      >
                        <div className="font-medium text-sm">{group.name}</div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{group.description}</p>
                        {group.tags && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {group.tags.slice(0, 3).map((tag) => (
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

              {aiResponse.recommendedBusinesses.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Local Pet Businesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {aiResponse.recommendedBusinesses.map((business, idx) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                        <div className="font-medium text-sm">{business.business_name}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {business.business_category}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {business.business_description}
                        </p>
                        {business.city && (
                          <p className="text-xs text-muted-foreground mt-1">📍 {business.city}</p>
                        )}
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
              placeholder="Search for advice, lost and found, training tips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isSearching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : searchResults?.length === 0 && searchQuery.length > 2 ? (
            <Card className="text-center py-8 text-muted-foreground">
              <p>No posts found matching "{searchQuery}"</p>
            </Card>
          ) : (
            searchResults?.map((post: any) => (
              <Card key={post.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">{post.profiles?.username}</span>
                    {post.profiles?.city && (
                      <span className="text-xs text-muted-foreground">📍 {post.profiles.city}</span>
                    )}
                  </div>
                  <p className="text-sm">{post.content}</p>
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="mt-2 rounded-lg w-full h-40 object-cover"
                    />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
