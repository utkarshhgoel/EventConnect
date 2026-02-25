import { mockApplications, mockEvents } from '@/store/mockData';
import { CheckCircle, Clock, XCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function Applications() {
  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Applications</h1>
      </div>

      <div className="p-4 space-y-4">
        {mockApplications.map(app => {
          const event = mockEvents.find(e => e.id === app.eventId);
          const role = event?.roles.find(r => r.id === app.jobRoleId);
          
          if (!event || !role) return null;

          return (
            <div key={app.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-100 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{event.name}</h3>
                  <p className="text-sm text-gray-500 font-medium">{role.title}</p>
                </div>
                
                {app.status === 'pending' && (
                  <div className="flex items-center text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-100">
                    <Clock className="w-3.5 h-3.5 mr-1" /> Pending
                  </div>
                )}
                {app.status === 'accepted' && (
                  <div className="flex items-center text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Accepted
                  </div>
                )}
                {app.status === 'declined' && (
                  <div className="flex items-center text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-red-100">
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Declined
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
                <div className="text-xs text-gray-400">
                  Applied on {format(new Date(app.appliedAt), 'MMM d, yyyy')}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
