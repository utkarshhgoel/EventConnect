import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { EventPost, Application } from '@/types';
import { ArrowLeft, Calendar, Clock, MapPin, IndianRupee, CheckCircle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { parseDescription } from '@/utils/descriptionParser';
import { format, isValid } from 'date-fns';

const safeFormatDate = (dateString: string | undefined, formatStr: string) => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return isValid(date) ? format(date, formatStr) : 'TBD';
};

const getParsedSubtitle = (subtitleStr: string | undefined) => {
  if (!subtitleStr) return {};
  try {
    return JSON.parse(subtitleStr);
  } catch {
    return { roles: subtitleStr };
  }
};

export default function CandidateEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<EventPost | null>(null);
  const [appliedRoles, setAppliedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id, user]);

  const fetchEventDetails = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*, roles:job_roles(*)')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      if (user) {
        const { data: appsData, error: appsError } = await supabase
          .from('applications')
          .select('job_role_id')
          .eq('candidate_id', user.id)
          .eq('event_id', id);

        if (appsError) throw appsError;
        setAppliedRoles(appsData?.map(a => a.job_role_id) || []);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (roleId: string) => {
    if (!user || !event) return;
    
    try {
      const parsedSubtitle = getParsedSubtitle(user.subtitle);
      const userGender = (user.gender || parsedSubtitle.gender || 'male').toLowerCase();

      const { error } = await supabase
        .from('applications')
        .insert({
          event_id: event.id,
          job_role_id: roleId,
          candidate_id: user.id,
          status: 'pending',
          gender: userGender
        });

      if (error) throw error;
      
      setAppliedRoles([...appliedRoles, roleId]);
      alert('Application submitted successfully!');
    } catch (error: any) {
      console.error('Error applying:', error);
      alert(error.message || 'Failed to apply');
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading event details...</div>;
  if (!event) return <div className="p-12 text-center text-gray-500">Event not found</div>;

  const { text: descriptionText, facilities } = parseDescription(event.description);
  const isClosed = event.status === 'closed';

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-gray-100 px-4 py-3 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1">Event Details</h1>
      </div>

      <div className="bg-white px-5 py-6 border-b border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{event.name}</h2>
          {isClosed && (
            <span className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-md uppercase tracking-wider">
              Closed
            </span>
          )}
        </div>
        
        <div className="space-y-3 text-sm text-gray-600 mb-6">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 mr-3 text-indigo-500" />
            <span className="font-medium text-gray-900">{safeFormatDate(event.start_date, 'MMM d')} - {safeFormatDate(event.end_date, 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-3 text-indigo-500" />
            <span className="font-medium text-gray-900">{event.start_time} - {event.end_time}</span>
            <span className="ml-2 text-gray-500">({event.working_hours} hrs total)</span>
          </div>
          <div className="flex items-start">
            <MapPin className="w-5 h-5 mr-3 text-indigo-500 mt-0.5 shrink-0" />
            <span className="font-medium text-gray-900 leading-snug">{event.location}</span>
          </div>
        </div>

        {descriptionText && (
          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">About this event</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{descriptionText}</p>
          </div>
        )}
      </div>

      {facilities.length > 0 && (
        <div className="bg-white mt-2 px-5 py-6 border-y border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What this event offers</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            {facilities.map((facility, idx) => (
              <div key={idx} className="flex items-center text-gray-700">
                <CheckCircle className="w-5 h-5 mr-3 text-emerald-500 shrink-0" />
                <span className="text-sm font-medium">{facility}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white mt-2 px-5 py-6 border-y border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Roles</h3>
        <div className="space-y-4">
          {(event.roles || []).map(role => {
            const parsedSubtitle = getParsedSubtitle(user?.subtitle);
            const userGender = (user?.gender || parsedSubtitle.gender || 'male').toLowerCase();
            const isRoleFull = userGender === 'male' 
              ? role.req_male > 0 && role.filled_male >= role.req_male
              : role.req_female > 0 && role.filled_female >= role.req_female;
            const isApplied = appliedRoles.includes(role.id);
            
            // Hide role if it doesn't need this gender at all
            if (userGender === 'male' && role.req_male === 0) return null;
            if (userGender === 'female' && role.req_female === 0) return null;
            
            return (
              <div key={role.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-900 text-lg">{role.title}</span>
                  <div className="flex items-center space-x-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200 shadow-sm">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Dress Code:</span>
                    <span className="text-xs font-semibold">{role.dress_code}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center text-emerald-600 font-bold text-lg">
                    <IndianRupee className="w-5 h-5 mr-1" />
                    {userGender === 'male' ? role.budget_male : role.budget_female} <span className="text-xs text-gray-500 font-normal ml-1">/ shift</span>
                  </div>
                  
                  <button
                    disabled={isRoleFull || isClosed || isApplied}
                    onClick={() => handleApply(role.id)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isApplied 
                        ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                        : isRoleFull || isClosed
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
                    }`}
                  >
                    {isApplied ? 'Request Sent' : isRoleFull ? 'Requirement Full' : 'Apply Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
