import { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Inbox() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Mock chats
  const chats = [
    { id: 1, name: 'Jane Doe', role: 'Runner', lastMessage: 'I will be there 15 mins early.', time: '10:30 AM', unread: 2 },
    { id: 2, name: 'John Smith', role: 'Usher', lastMessage: 'What is the exact dress code?', time: 'Yesterday', unread: 0 },
    { id: 3, name: 'Alice Johnson', role: 'Bartender', lastMessage: 'Thanks for the opportunity!', time: 'Mon', unread: 0 },
  ];

  return (
    <div className="pb-24 min-h-screen bg-white">
      <div className="px-4 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search messages..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
          />
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {chats.map(chat => (
          <div 
            key={chat.id} 
            onClick={() => navigate(`/organizer/inbox/${chat.id}`)}
            className="p-4 flex items-center hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="relative">
              <img 
                src={`https://picsum.photos/seed/chat${chat.id}/100`} 
                alt={chat.name} 
                className="w-12 h-12 rounded-full object-cover"
              />
              {chat.unread > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">{chat.unread}</span>
                </div>
              )}
            </div>
            
            <div className="ml-4 flex-1 overflow-hidden">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{chat.time}</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-indigo-600 font-medium mr-2 text-xs bg-indigo-50 px-1.5 py-0.5 rounded">{chat.role}</span>
                <p className={`truncate ${chat.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  {chat.lastMessage}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
