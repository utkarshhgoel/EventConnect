import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { ArrowLeft, Send, User } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function Chat() {
  const { id: otherUserId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const broadcastChannelRef = useRef<any>(null);

  // Mock data fallback
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    if (user && otherUserId) {
      fetchOtherUser();
      fetchMessages();
      
      // Subscribe to new messages via database changes
      const dbChannel = supabase
        .channel('messages_db_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${otherUserId}`,
          },
          (payload) => {
            if (payload.new.receiver_id === user.id) {
              setMessages((prev) => [...prev, payload.new as Message]);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${otherUserId}`,
          },
          (payload) => {
            if (payload.new.sender_id === user.id) {
              setMessages((prev) => {
                // Check if message already exists (optimistic update)
                if (prev.some(m => m.id === payload.new.id)) return prev;
                return [...prev, payload.new as Message];
              });
            }
          }
        )
        .subscribe();

      // Subscribe to mock messages via broadcast
      const broadcastChannel = supabase.channel('mock_messages');
      broadcastChannelRef.current = broadcastChannel;
      
      broadcastChannel
        .on(
          'broadcast',
          { event: 'new_message' },
          (payload) => {
            const msg = payload.payload as Message;
            if (
              (msg.sender_id === otherUserId && msg.receiver_id === user.id) ||
              (msg.sender_id === user.id && msg.receiver_id === otherUserId)
            ) {
              setMessages((prev) => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(dbChannel);
        supabase.removeChannel(broadcastChannel);
      };
    }
  }, [user, otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOtherUser = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();
        
      if (error) throw error;
      setOtherUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
      // Mock fallback
      setOtherUser({ name: 'User', role: 'candidate' });
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') { // Table does not exist
          setUseMock(true);
          setMessages([
            { id: '1', sender_id: otherUserId!, receiver_id: user!.id, content: 'Hi there!', created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: '2', sender_id: user!.id, receiver_id: otherUserId!, content: 'Hello! How can I help you?', created_at: new Date(Date.now() - 3500000).toISOString() },
          ]);
        } else {
          throw error;
        }
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !otherUserId) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    if (useMock) {
      const mockMsg: Message = {
        id: Math.random().toString(),
        sender_id: user.id,
        receiver_id: otherUserId,
        content: messageContent,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, mockMsg]);
      
      // Broadcast the mock message
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: mockMsg,
        });
      }
      return;
    }

    try {
      // Optimistic update
      const tempId = Math.random().toString();
      const tempMsg: Message = {
        id: tempId,
        sender_id: user.id,
        receiver_id: otherUserId,
        content: messageContent,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          content: messageContent
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
      // Remove temp message on failure
      setMessages(prev => prev.filter(m => m.content !== messageContent));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading chat...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex items-center flex-1">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">{otherUser?.name || 'User'}</h2>
            <p className="text-xs text-gray-500 capitalize">{otherUser?.role || 'User'}</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {useMock && (
          <div className="bg-amber-50 text-amber-800 text-xs p-2 rounded-lg text-center mb-4 border border-amber-200">
            Using mock chat mode. Messages won't be saved to the database.
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
              <User className="w-8 h-8 text-gray-300" />
            </div>
            <p>No messages yet</p>
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;
            const showTime = idx === 0 || new Date(msg.created_at).getTime() - new Date(messages[idx-1].created_at).getTime() > 300000; // 5 mins
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showTime && (
                  <span className="text-[10px] text-gray-400 mb-2 mt-2 px-2">
                    {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                  </span>
                )}
                <div 
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-gray-100 text-gray-900 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-3 border-t border-gray-100">
        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 border-transparent rounded-full px-4 py-2.5 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
