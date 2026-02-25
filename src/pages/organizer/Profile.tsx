import { useAuth } from '@/store/useAuth';
import { Settings, Edit3, ShieldCheck, Star, Calendar, Mail, Phone, MapPin } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      {/* Header / Cover */}
      <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
        <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Info */}
      <div className="px-4 relative -mt-12">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div className="relative">
              <img 
                src={user?.avatarUrl} 
                alt="Profile" 
                className="w-24 h-24 rounded-2xl border-4 border-white shadow-sm object-cover bg-gray-100"
              />
              <button className="absolute -bottom-2 -right-2 p-1.5 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified</span>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
            <p className="text-gray-500 text-sm mt-1">Premium Event Organizer</p>
          </div>

          <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">4.9</span>
              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 mr-1" />
                120 Reviews
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">45</span>
              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                <Calendar className="w-3 h-3 text-indigo-400 mr-1" />
                Events Completed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 mt-6 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">About</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            We are a premier event organizing company specializing in tech conferences and large-scale music festivals across the West Coast. Always looking for reliable and enthusiastic staff.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-2">Contact Info</h3>
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="w-4 h-4 mr-3 text-gray-400" />
            {user?.email}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-4 h-4 mr-3 text-gray-400" />
            +1 (555) 123-4567
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-3 text-gray-400" />
            San Francisco, CA
          </div>
        </div>

        <button 
          onClick={logout}
          className="w-full py-3.5 bg-white border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors shadow-sm"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
