import { useState } from 'react';
import { mockEvents } from '@/store/mockData';
import { Calendar, Clock, MapPin, Filter, IndianRupee } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export default function Posts() {
  const [filter, setFilter] = useState('all');
  const [appliedRoles, setAppliedRoles] = useState<string[]>([]);

  const handleApply = (roleId: string) => {
    setAppliedRoles([...appliedRoles, roleId]);
  };

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Find Events</h1>
          <button className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        
        {/* Horizontal Filters */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-2">
          {['All', 'Nearby', 'High Pay', 'This Weekend'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f.toLowerCase())}
              className={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                filter === f.toLowerCase() ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {mockEvents.map((event, i) => {
          const isClosed = event.status === 'closed';
          
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={event.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                isClosed ? 'opacity-60 border-gray-200 grayscale-[0.5]' : 'border-gray-100 hover:shadow-md transition-shadow'
              }`}
            >
              <div className="p-5 border-b border-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
                  {isClosed && (
                    <span className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-md uppercase tracking-wider">
                      Closed
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mt-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                    {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                    {event.startTime} - {event.endTime}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Available Roles</h3>
                {event.roles.map(role => {
                  const totalReq = role.reqMale + role.reqFemale;
                  const totalFilled = role.filledMale + role.filledFemale;
                  const isRoleFull = totalFilled >= totalReq;
                  const isApplied = appliedRoles.includes(role.id);
                  
                  return (
                    <div key={role.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">{role.title}</span>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-600 font-medium">
                          {role.dressCode}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-emerald-600 font-semibold">
                          <IndianRupee className="w-4 h-4 mr-1" />
                          {role.budgetMale} - {role.budgetFemale} <span className="text-xs text-gray-500 font-normal ml-1">/ shift</span>
                        </div>
                        
                        <button
                          disabled={isRoleFull || isClosed || isApplied}
                          onClick={() => handleApply(role.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
