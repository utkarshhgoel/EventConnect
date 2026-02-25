import { useParams, useNavigate } from 'react-router-dom';
import { mockEvents, mockApplications } from '@/store/mockData';
import { ArrowLeft, Users, CheckCircle, XCircle, MessageSquare, User } from 'lucide-react';
import { useState } from 'react';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'analytics' | 'applicants' | 'selected'>('analytics');
  
  const event = mockEvents.find(e => e.id === id);
  if (!event) return <div>Event not found</div>;

  const totalReq = event.roles.reduce((acc, r) => acc + r.reqMale + r.reqFemale, 0);
  const totalFilled = event.roles.reduce((acc, r) => acc + r.filledMale + r.filledFemale, 0);

  // Mock applicants for this event
  const applicants = mockApplications.filter(a => a.eventId === id);

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
              {event.roles.map(role => (
                <div key={role.id} className="bg-white p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium">{role.title}</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-600">
                      {role.dressCode}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Male Stats */}
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                      <div className="text-xs text-blue-600 font-medium mb-1">Male (₹{role.budgetMale})</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">{role.filledMale} / {role.reqMale}</span>
                        <div className="w-12 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${(role.filledMale / role.reqMale) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                    {/* Female Stats */}
                    <div className="bg-pink-50/50 p-3 rounded-lg border border-pink-100/50">
                      <div className="text-xs text-pink-600 font-medium mb-1">Female (₹{role.budgetFemale})</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">{role.filledFemale} / {role.reqFemale}</span>
                        <div className="w-12 h-1.5 bg-pink-100 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500" style={{ width: `${(role.filledFemale / role.reqFemale) * 100}%` }} />
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
                      <img src={`https://picsum.photos/seed/${app.candidateId}/100`} alt="Avatar" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Candidate {app.candidateId}</div>
                      <div className="text-xs text-gray-500 capitalize">{app.gender} • {event.roles.find(r => r.id === app.jobRoleId)?.title}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100">
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100">
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
            {/* Mock selected candidates */}
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                    <img src={`https://picsum.photos/seed/sel${i}/100`} alt="Avatar" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Selected Candidate {i}</div>
                    <div className="text-xs text-gray-500">Runner</div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
