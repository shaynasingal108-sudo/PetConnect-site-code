import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Brain, Search, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function SuggestionsPage() {
  const { profile } = useAuth();
  const [question, setQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
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
    
    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setAiResponse(
      `Based on your question about "${question}" and your ${profile?.pet_type || 'pet'} (${profile?.pet_breed || 'breed not specified'}), here are some suggestions:\n\n` +
      `1. Consider consulting with a vet if this is a health concern.\n` +
      `2. Join our ${profile?.pet_type || 'pet'} training community for tips.\n` +
      `3. Check out posts from experienced owners in your area.\n\n` +
      `⚠️ Disclaimer: For urgent health symptoms, please consult a veterinary professional immediately.`
    );
    setIsAsking(false);
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
                placeholder="What would you like to know about your pet?"
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

          {aiResponse && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🤖</span>
                  <div className="whitespace-pre-wrap">{aiResponse}</div>
                </div>
              </CardContent>
            </Card>
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
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
