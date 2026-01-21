import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageCircle, Send, Ticket, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fetchFriendRows, fetchProfilesMapByUserIds, getOtherUserId } from '@/lib/social';
import { useToast } from '@/hooks/use-toast';

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

type Conversation = {
  partnerId: string;
  partner: any | null;
  isFriend: boolean;
  lastMessage: MessageRow | null;
  messages: MessageRow[];
};

// Discount tiers based on points
const discountTiers = [
  { points: 10, discount: '5%', label: 'Bronze Discount' },
  { points: 25, discount: '10%', label: 'Silver Discount' },
  { points: 50, discount: '15%', label: 'Gold Discount' },
  { points: 100, discount: '25%', label: 'Platinum Discount' },
];

export default function MessagesPage() {
  const { user, profile, refreshProfile } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [isRedeemingDiscount, setIsRedeemingDiscount] = useState(false);

  // Seed demo friends/messages once per user so the inbox is never empty.
  const seedQuery = useQuery({
    queryKey: ['seed-demo-social', user?.id],
    queryFn: async () => {
      await supabase.functions.invoke('seed-demo-social');
      return true;
    },
    enabled: !!user,
    staleTime: Infinity,
    retry: 1,
  });

  const inboxQuery = useQuery({
    queryKey: ['inbox', user?.id],
    queryFn: async () => {
      const userId = user!.id;

      const [{ data: messages, error: messagesError }, friendRows] = await Promise.all([
        supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false }),
        fetchFriendRows(userId),
      ]);

      if (messagesError) throw messagesError;

      const acceptedFriendRows = friendRows.filter((f) => f.status === 'accepted');
      const friendIds = acceptedFriendRows.map((f) => getOtherUserId(f, userId));

      const messagePartnerIds = (messages || []).map((m: any) =>
        m.sender_id === userId ? m.receiver_id : m.sender_id,
      );

      const allPartnerIds = Array.from(new Set([...friendIds, ...messagePartnerIds]));
      const profilesMap = await fetchProfilesMapByUserIds(allPartnerIds);

      const convMap = new Map<string, Conversation>();

      const ensure = (partnerId: string) => {
        if (!convMap.has(partnerId)) {
          convMap.set(partnerId, {
            partnerId,
            partner: profilesMap[partnerId] || null,
            isFriend: false,
            lastMessage: null,
            messages: [],
          });
        }
        return convMap.get(partnerId)!;
      };

      acceptedFriendRows.forEach((row) => {
        const partnerId = getOtherUserId(row, userId);
        ensure(partnerId).isFriend = true;
      });

      (messages || []).forEach((msg: any) => {
        const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        const conv = ensure(partnerId);
        // messages are returned newest-first; first one we see is the lastMessage
        if (!conv.lastMessage) conv.lastMessage = msg as MessageRow;
        conv.messages.push(msg as MessageRow);
      });

      const conversations = Array.from(convMap.values()).sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
        return bTime - aTime;
      });

      return { conversations, profilesMap };
    },
    enabled: !!user && !seedQuery.isLoading,
  });

  // Pre-select chat from navigation state or query params.
  useEffect(() => {
    const stateSelected = (location.state as any)?.selectedUserId as string | undefined;
    const querySelected = searchParams.get('user') || undefined;
    const target = stateSelected || querySelected;
    if (target) setSelectedChat(target);
  }, [location.state, searchParams]);

  const conversations = inboxQuery.data?.conversations || [];

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.partnerId === selectedChat) || null,
    [conversations, selectedChat],
  );

  const selectedPartnerQuery = useQuery({
    queryKey: ['profile-by-user-id', selectedChat],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, city, is_business, business_name')
        .eq('user_id', selectedChat)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!selectedChat && !selectedConversation?.partner,
  });

  const selectedPartner = selectedConversation?.partner || selectedPartnerQuery.data || null;

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim() || !selectedChat || !user) return;

      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedChat,
        content: newMessage.trim(),
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      setNewMessage('');
      await queryClient.invalidateQueries({ queryKey: ['inbox', user?.id] });
    },
  });

  const handleSend = async () => {
    await sendMutation.mutateAsync();
  };

  // Get available discounts based on user's points
  const userPoints = profile?.points || 0;
  const availableDiscounts = discountTiers.filter(tier => userPoints >= tier.points);
  const bestDiscount = availableDiscounts[availableDiscounts.length - 1];

  const handleRedeemDiscount = async (tier: typeof discountTiers[0]) => {
    if (!user || !profile || !selectedPartner) return;
    
    setIsRedeemingDiscount(true);
    try {
      // Deduct points
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ points: userPoints - tier.points })
        .eq('id', profile.id);
      
      if (profileError) throw profileError;

      // Send discount message in chat
      const businessName = selectedPartner.business_name || selectedPartner.username;
      const discountMessage = `🎟️ DISCOUNT REDEEMED!\n\n${tier.label}: ${tier.discount} OFF\nBusiness: ${businessName}\nPoints Used: ${tier.points}\n\nShow this message to redeem your discount!`;
      
      const { error: msgError } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedChat,
        content: discountMessage,
      });
      
      if (msgError) throw msgError;

      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ['inbox', user?.id] });
      setDiscountDialogOpen(false);
      
      toast({
        title: 'Discount Redeemed! 🎉',
        description: `You got ${tier.discount} off at ${businessName}!`,
      });
    } catch (error) {
      console.error('Error redeeming discount:', error);
      toast({
        title: 'Could not redeem discount',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRedeemingDiscount(false);
    }
  };

  if (seedQuery.isLoading || inboxQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <CardTitle className="text-lg">People</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No conversations yet.
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.partnerId}
                  onClick={() => setSelectedChat(conv.partnerId)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors overflow-hidden ${
                    selectedChat === conv.partnerId ? 'bg-muted' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={conv.partner?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(conv.partner?.username || conv.partnerId).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left font-medium text-sm truncate">
                    {conv.partner?.is_business
                      ? conv.partner?.business_name || conv.partner?.username
                      : conv.partner?.username || 'User'}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col">
          {selectedChat ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedPartner?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(selectedPartner?.username || selectedChat).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-lg">
                      {selectedPartner?.is_business
                        ? selectedPartner?.business_name || selectedPartner?.username
                        : selectedPartner?.username || 'Conversation'}
                    </CardTitle>
                  </div>
                  {/* Show discount button only for business chats and non-business users */}
                  {selectedPartner?.is_business && !profile?.is_business && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDiscountDialogOpen(true)}
                      className="gap-2"
                      disabled={availableDiscounts.length === 0}
                    >
                      <Ticket className="h-4 w-4" />
                      {availableDiscounts.length > 0 
                        ? `Use Discount (${bestDiscount?.discount})`
                        : 'Earn more points for discounts'}
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {(selectedConversation?.messages || [])
                  .slice()
                  .reverse()
                  .map((msg) => (
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

                {selectedConversation?.messages?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No messages yet — say hi!
                  </p>
                )}
              </CardContent>

              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button onClick={handleSend} className="gradient-primary" disabled={sendMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a friend or conversation to start messaging
            </div>
          )}
        </Card>
      </div>

      {/* Discount Redemption Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" /> Redeem Discount
            </DialogTitle>
            <DialogDescription>
              Use your points to get a discount at {selectedPartner?.business_name || selectedPartner?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 py-2 bg-primary/10 rounded-lg">
              <Star className="h-5 w-5 text-primary" />
              <span className="font-semibold">Your Points: {userPoints}</span>
            </div>

            <div className="space-y-2">
              {discountTiers.map((tier) => {
                const canAfford = userPoints >= tier.points;
                return (
                  <button
                    key={tier.points}
                    onClick={() => canAfford && handleRedeemDiscount(tier)}
                    disabled={!canAfford || isRedeemingDiscount}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      canAfford 
                        ? 'border-primary/30 hover:border-primary hover:bg-primary/5 cursor-pointer' 
                        : 'border-muted opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{tier.label}</p>
                        <p className="text-2xl font-bold text-primary">{tier.discount} OFF</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Cost</p>
                        <p className="font-semibold flex items-center gap-1">
                          {tier.points} <Star className="h-4 w-4 text-primary" />
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              After redeeming, a discount message will appear in the chat. Show it to the business to claim your discount!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
