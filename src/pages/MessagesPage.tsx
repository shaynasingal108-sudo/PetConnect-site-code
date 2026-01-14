import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data: messages } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*), receiver:profiles!messages_receiver_id_fkey(*)')
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });
      
      // Group by conversation partner
      const convMap = new Map();
      messages?.forEach((msg: any) => {
        const partnerId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
        const partner = msg.sender_id === user?.id ? msg.receiver : msg.sender;
        if (!convMap.has(partnerId)) {
          convMap.set(partnerId, { partner, lastMessage: msg, messages: [] });
        }
        convMap.get(partnerId).messages.push(msg);
      });
      
      return Array.from(convMap.values());
    },
    enabled: !!user,
  });

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    await supabase.from('messages').insert({
      sender_id: user?.id,
      receiver_id: selectedChat,
      content: newMessage,
    });
    
    setNewMessage('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedConversation = conversations?.find((c: any) => c.partner?.user_id === selectedChat);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
          <MessageCircle className="h-6 w-6" /> Messages
        </h1>
      </div>

      <div className="grid md:grid-cols-3 gap-4 min-h-[60vh]">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-2">
            {conversations?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
            ) : (
              conversations?.map((conv: any) => (
                <button
                  key={conv.partner?.user_id}
                  onClick={() => setSelectedChat(conv.partner?.user_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors ${
                    selectedChat === conv.partner?.user_id ? 'bg-muted' : ''
                  }`}
                >
                  <Avatar>
                    <AvatarImage src={conv.partner?.avatar_url} />
                    <AvatarFallback>{conv.partner?.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{conv.partner?.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage?.content}</p>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col">
          {selectedChat && selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedConversation.partner?.avatar_url} />
                    <AvatarFallback>{selectedConversation.partner?.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-lg">{selectedConversation.partner?.username}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConversation.messages?.reverse().map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button onClick={handleSend} className="gradient-primary">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to start messaging
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
