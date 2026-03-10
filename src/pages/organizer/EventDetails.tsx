import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { EventPost, Application } from '@/types';
import { ArrowLeft, Users, CheckCircle, XCircle, MessageSquare, User, Calendar, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { parseDescription } from '@/utils/descriptionParser';
import { format, isValid } from 'date-fns';

const safeFormatDate = (dateString: string | undefined, formatStr: string) => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return isValid(date) ? format(date, formatStr) : 'TBD';
};

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'applicants' | 'selected'>('overview');
  
  const [event, setEvent] = useState<EventPost | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      // Fetch event with roles
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*, roles:job_roles(*)')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch applications with candidate profiles
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select('*, candidate:profiles(*)')
        .eq('event_id', id);

      if (appsError) throw appsError;
      setApplicants(appsData || []);
    } catch (error) {
      console.error('Error fetching event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplication = async (appId: string, status: 'accepted' | 'declined') => {
    try {
      const app = applicants.find(a => a.id === appId);
      if (!app) return;

      const { error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', appId);
        
      if (error) throw error;
      
      if (status === 'accepted' && event) {
        const role = event.roles?.find(r => r.id === app.job_role_id);
        if (role) {
          const isMale = app.gender === 'male';
          const updateData = isMale 
            ? { filled_male: role.filled_male + 1 }
            : { filled_female: role.filled_female + 1 };
            
          const { error: roleError } = await supabase
            .from('job_roles')
            .update(updateData)
            .eq('id', role.id);
            
          if (roleError) throw roleError;
        }
      }
      
      // Update local state
      setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      
      // Refetch to get updated counts
      if (status === 'accepted') {
        fetchEventDetails();
      }
    } catch (error) {
      console.error('Error updating application:', error);
      alert('Failed to update application');
    }
  };

  const handleCancelEvent = async () => {
    if (!event) return;
    try {
      // Delete the event to make it disappear from everywhere
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);
        
      if (error) throw error;
      navigate('/organizer/posts');
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event');
    }
  };

  const handleFinishAndReview = async () => {
    if (!event) return;
    try {
      // Update status to closed
      const { error } = await supabase
        .from('events')
        .update({ status: 'closed' })
        .eq('id', event.id);
        
      if (error) throw error;
      navigate(`/organizer/review/${event.id}`);
    } catch (error) {
      console.error('Error finishing event:', error);
      alert('Failed to finish event');
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading event details...</div>;
  if (!event) return <div className="p-12 text-center text-gray-500">Event not found</div>;

  const totalReq = (event.roles || []).reduce((acc, r) => acc + r.req_male + r.req_female, 0);
  const totalFilled = (event.roles || []).reduce((acc, r) => acc + r.filled_male + r.filled_female, 0);

  return (
    <div className="pb-24">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-gray-100 px-4 py-3 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg truncate">{event.name}</h1>
      </div>

      <div className="p-4">
        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-100 pb-2 overflow-x-auto no-scrollbar">
          {['overview', 'analytics', 'applicants', 'selected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Event Details</h3>
              <div className="space-y-3 text-sm text-gray-600">
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
            </div>

            {(() => {
              const { text, facilities } = parseDescription(event.description);
              return (
                <>
                  {text && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">{text}</p>
                    </div>
                  )}

                  {facilities.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4">Facilities Provided</h3>
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
                </>
              );
            })()}
            
            {event.status === 'open' && (
              <button 
                onClick={() => setShowEndModal(true)}
                className="w-full py-3.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold mt-6 hover:bg-red-100 transition-colors"
              >
                End Event
              </button>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-medium text-gray-500 mb-4">Overall Progress</h3>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-gray-900">{totalFilled}</span>
                <span className="text-gray-500 mb-1">/ {totalReq} Seats Filled</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${(totalFilled / totalReq) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Role Breakdown</h3>
              {(event.roles || []).map(role => (
                <div key={role.id} className="bg-white p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-lg">{role.title}</span>
                    <div className="flex items-center space-x-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200 shadow-sm">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Dress Code:</span>
                      <span className="text-xs font-semibold">{role.dress_code}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Male Stats */}
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                      <div className="text-xs text-blue-600 font-medium mb-1">Male (₹{role.budget_male})</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">{role.filled_male} / {role.req_male}</span>
                        <div className="w-12 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${(role.filled_male / role.req_male) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                    {/* Female Stats */}
                    <div className="bg-pink-50/50 p-3 rounded-lg border border-pink-100/50">
                      <div className="text-xs text-pink-600 font-medium mb-1">Female (₹{role.budget_female})</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">{role.filled_female} / {role.req_female}</span>
                        <div className="w-12 h-1.5 bg-pink-100 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500" style={{ width: `${(role.filled_female / role.req_female) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {event.status === 'closed' && (
              <button 
                onClick={() => navigate(`/organizer/review/${event.id}`)}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium mt-4"
              >
                Review Candidates
              </button>
            )}
          </div>
        )}

        {activeTab === 'applicants' && (
          <div className="space-y-4">
            {applicants.filter(a => a.status === 'pending').length === 0 ? (
              <div className="text-center py-12 text-gray-500">No pending applications.</div>
            ) : (
              applicants.filter(a => a.status === 'pending').map(app => (
                <div key={app.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                      <img src={app.candidate?.avatar_url || `https://picsum.photos/seed/${app.candidate_id}/100`} alt="Avatar" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{app.candidate?.name || 'Candidate'}</div>
                      <div className="text-xs text-gray-500 capitalize">{app.gender} • {(event.roles || []).find(r => r.id === app.job_role_id)?.title}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleApplication(app.id, 'accepted')}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleApplication(app.id, 'declined')}
                      className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'selected' && (
          <div className="space-y-4">
            {applicants.filter(a => a.status === 'accepted').length === 0 ? (
              <div className="text-center py-12 text-gray-500">No candidates selected yet.</div>
            ) : (
              applicants.filter(a => a.status === 'accepted').map(app => (
                <div key={app.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                      <img src={app.candidate?.avatar_url || `https://picsum.photos/seed/${app.candidate_id}/100`} alt="Avatar" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{app.candidate?.name || 'Candidate'}</div>
                      <div className="text-xs text-gray-500">{(event.roles || []).find(r => r.id === app.job_role_id)?.title}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => navigate(`/organizer/inbox/${app.candidate_id}`)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => navigate(`/organizer/profile/${app.candidate_id}`)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                    >
                      <User className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* End Event Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">End Event</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to end this event? You can either cancel it completely or finish it to review your candidates.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={handleFinishAndReview}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Finish & Review Candidates
                </button>
                <button 
                  onClick={handleCancelEvent}
                  className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
                >
                  Cancel Event
                </button>
                <button 
                  onClick={() => setShowEndModal(false)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
