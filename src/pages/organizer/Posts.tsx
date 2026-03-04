import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { EventPost } from '@/types';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export default function Posts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [events, setEvents] = useState<EventPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, roles:job_roles(*)')
        .eq('organizer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(e => e.status === activeTab);

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Events</h1>
      </div>

      <div className="flex space-x-2 mb-6 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'open' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'closed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          Closed
        </button>
      </div>

      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {activeTab} events found.
          </div>
        ) : (
          filteredEvents.map((event, i) => {
            const roles = event.roles || [];
            const totalReq = roles.reduce((acc, r) => acc + r.req_male + r.req_female, 0);
            const totalFilled = roles.reduce((acc, r) => acc + r.filled_male + r.filled_female, 0);
            const isFull = totalReq > 0 && totalReq === totalFilled;

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={event.id}
                onClick={() => navigate(`/organizer/posts/${event.id}`)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isFull && activeTab === 'open' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg text-gray-900">{event.name}</h3>
                  {isFull && activeTab === 'open' && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-md">
                      Full
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                    {format(new Date(event.startDate), 'MMM d, yyyy')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                    {event.startTime} - {event.endTime} ({event.workingHours}h)
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center text-sm font-medium text-gray-900">
                    <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                    {totalFilled} / {totalReq} Filled
                  </div>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isFull ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${(totalFilled / totalReq) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
