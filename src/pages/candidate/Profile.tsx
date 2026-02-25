import { useAuth } from '@/store/useAuth';
import { Settings, Edit3, ShieldCheck, Star, Briefcase, Mail, Phone, MapPin, GraduationCap, Ruler, Calendar } from 'lucide-react';
import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function Profile() {
  const { user, logout } = useAuth();
  const [bio, setBio] = useState('Experienced event staff with a background in hospitality. Quick learner and great team player.');
  const [isEnhancing, setIsEnhancing] = useState(false);

  const enhanceBio = async () => {
    if (!process.env.GEMINI_API_KEY) {
      alert("Gemini API Key missing. Please configure it in AI Studio.");
      return;
    }
    setIsEnhancing(true);
    try {
      const prompt = `Enhance this professional bio for an event staff candidate to make it sound more impressive and professional, but keep it concise (max 3 sentences): "${bio}"`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      if (response.text) {
        setBio(response.text);
      }
    } catch (error) {
      console.error("Error enhancing bio:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      {/* Header / Cover */}
      <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
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
              <button className="absolute -bottom-2 -right-2 p-1.5 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center space-x-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-indigo-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Gov ID Verified</span>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
            <p className="text-gray-500 text-sm mt-1">Event Staff • Runner • Usher</p>
          </div>

          <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">4.8</span>
              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 mr-1" />
                15 Reviews
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">12</span>
              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                <Briefcase className="w-3 h-3 text-emerald-400 mr-1" />
                Events Worked
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 mt-6 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Bio</h3>
            <button 
              onClick={enhanceBio}
              disabled={isEnhancing}
              className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100 disabled:opacity-50"
            >
              {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
            </button>
          </div>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full text-sm text-gray-600 leading-relaxed bg-transparent border-none outline-none resize-none"
            rows={3}
          />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-2">Personal Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-3 text-gray-400" />
              24 Years Old
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Ruler className="w-4 h-4 mr-3 text-gray-400" />
              5'8" (173cm)
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <GraduationCap className="w-4 h-4 mr-3 text-gray-400" />
              B.A. Hospitality
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-2">Contact Info</h3>
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="w-4 h-4 mr-3 text-gray-400" />
            {user?.email}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-4 h-4 mr-3 text-gray-400" />
            +1 (555) 987-6543
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
