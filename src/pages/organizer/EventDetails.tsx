import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { EventPost, Application } from '@/types';
import { ArrowLeft, Users, CheckCircle, XCircle, MessageSquare, User } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'analytics' | 'applicants' | 'selected'>('analytics');
  
  const [event, setEvent] = useState<EventPost | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

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
      const { error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', appId);
        
      if (error) throw error;
      
      // Update local state
      setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      
      // If accepted, we should ideally update the filled count in job_roles
      // For this prototype, we'll just refetch the event details
      if (status === 'accepted') {
        fetchEventDetails();
      }
    } catch (error) {
      console.error('Error updating application:', error);
      alert('Failed to update application');
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
          {['analytics', 'applicants', 'selected'].map((tab) => (
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
                    <span className="font-medium">{role.title}</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-600">
                      {role.dress_code}
                    </span>
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
              <button className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium mt-4">
                End Event & Review Candidates
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
                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full">
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full">
                      <User className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
