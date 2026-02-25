import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Plus, MapPin, Sparkles, Trash2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is missing");
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
};

export default function Publish() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    workingHours: '',
    location: '',
    description: '',
    roles: [
      { id: '1', title: '', dressCode: '', reqMale: 0, reqFemale: 0, budgetMale: 0, budgetFemale: 0 }
    ]
  });

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const addRole = () => {
    setFormData(prev => ({
      ...prev,
      roles: [...prev.roles, { id: Date.now().toString(), title: '', dressCode: '', reqMale: 0, reqFemale: 0, budgetMale: 0, budgetFemale: 0 }]
    }));
  };

  const removeRole = (id: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.filter(r => r.id !== id)
    }));
  };

  const updateRole = (id: string, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  const searchLocation = async () => {
    if (!process.env.GEMINI_API_KEY) {
      alert("Gemini API Key missing. Please configure it in AI Studio.");
      return;
    }
    if (!formData.location) return;
    
    setIsSearchingLocation(true);
    try {
      const response = await getAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Find the exact address for: ${formData.location}`,
        config: {
          tools: [{ googleMaps: {} }],
        }
      });
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        const mapsChunk = chunks.find(c => c.web?.uri?.includes('google.com/maps') || c.web?.title);
        if (mapsChunk && mapsChunk.web) {
          setFormData(prev => ({ ...prev, location: mapsChunk.web!.title || formData.location }));
          if (mapsChunk.web.uri) {
            setMapUrl(mapsChunk.web.uri);
          }
        }
      }
    } catch (error) {
      console.error("Error searching location:", error);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const generateDescription = async () => {
    if (!process.env.GEMINI_API_KEY) {
      alert("Gemini API Key missing. Please configure it in AI Studio.");
      return;
    }
    setIsGenerating(true);
    try {
      const prompt = `Write a professional and engaging event description for a job posting. 
      Event Name: ${formData.name}
      Location: ${formData.location}
      Roles needed: ${formData.roles.map(r => r.title).join(', ')}.
      Keep it under 3 paragraphs.`;
      
      const response = await getAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      if (response.text) {
        setFormData(prev => ({ ...prev, description: response.text }));
      }
    } catch (error) {
      console.error("Error generating description:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const publishEvent = () => {
    // Mock publish
    alert("Event published successfully!");
    navigate('/organizer/posts');
  };

  return (
    <div className="pb-24 min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Publish Event</h1>
          <div className="text-sm font-medium text-gray-500">Step {step} of 4</div>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. Summer Music Festival"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={formData.startDate}
                      onChange={e => setFormData({...formData, startDate: e.target.value})}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input 
                      type="date" 
                      value={formData.endDate}
                      onChange={e => setFormData({...formData, endDate: e.target.value})}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input 
                      type="time" 
                      value={formData.startTime}
                      onChange={e => setFormData({...formData, startTime: e.target.value})}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input 
                      type="time" 
                      value={formData.endTime}
                      onChange={e => setFormData({...formData, endTime: e.target.value})}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Working Hours</label>
                  <input 
                    type="number" 
                    value={formData.workingHours}
                    onChange={e => setFormData({...formData, workingHours: e.target.value})}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. 8"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Job Roles</h2>
                <button 
                  onClick={addRole}
                  className="flex items-center text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Role
                </button>
              </div>

              {formData.roles.map((role, index) => (
                <div key={role.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 relative">
                  {formData.roles.length > 1 && (
                    <button 
                      onClick={() => removeRole(role.id)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  
                  <h3 className="font-medium text-gray-900 border-b border-gray-100 pb-2">Role {index + 1}</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Role Title</label>
                      <input 
                        type="text" 
                        value={role.title}
                        onChange={e => updateRole(role.id, 'title', e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="e.g. Runner, Usher"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Dress Code</label>
                      <input 
                        type="text" 
                        value={role.dressCode}
                        onChange={e => updateRole(role.id, 'dressCode', e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="e.g. Black T-Shirt, Jeans"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Gender Specific Requirements</label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Male Config */}
                      <div className="space-y-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                        <div className="font-medium text-sm text-blue-800 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div> Male
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Count Needed</label>
                          <input 
                            type="number" 
                            value={role.reqMale}
                            onChange={e => updateRole(role.id, 'reqMale', parseInt(e.target.value) || 0)}
                            className="w-full p-2 bg-white border border-blue-200 rounded-lg outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Budget (₹)</label>
                          <input 
                            type="number" 
                            value={role.budgetMale}
                            onChange={e => updateRole(role.id, 'budgetMale', parseInt(e.target.value) || 0)}
                            className="w-full p-2 bg-white border border-blue-200 rounded-lg outline-none text-sm"
                          />
                        </div>
                      </div>

                      {/* Female Config */}
                      <div className="space-y-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100/50">
                        <div className="font-medium text-sm text-pink-800 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-pink-500 mr-2"></div> Female
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Count Needed</label>
                          <input 
                            type="number" 
                            value={role.reqFemale}
                            onChange={e => updateRole(role.id, 'reqFemale', parseInt(e.target.value) || 0)}
                            className="w-full p-2 bg-white border border-pink-200 rounded-lg outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Budget (₹)</label>
                          <input 
                            type="number" 
                            value={role.budgetFemale}
                            onChange={e => updateRole(role.id, 'budgetFemale', parseInt(e.target.value) || 0)}
                            className="w-full p-2 bg-white border border-pink-200 rounded-lg outline-none text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-lg font-semibold text-gray-900">Location</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Address</label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        value={formData.location}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                        className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Search location..."
                      />
                    </div>
                    <button 
                      onClick={searchLocation}
                      disabled={isSearchingLocation || !formData.location}
                      className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isSearchingLocation ? 'Searching...' : 'Find on Map'}
                    </button>
                  </div>
                </div>
                
                <div className="w-full h-64 bg-gray-200 rounded-2xl overflow-hidden relative border border-gray-300">
                  {mapUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center flex-col bg-white p-4 text-center">
                      <MapPin className="w-12 h-12 text-indigo-500 mb-3" />
                      <h3 className="font-semibold text-gray-900 mb-1">Location Found</h3>
                      <p className="text-sm text-gray-500 mb-4">{formData.location}</p>
                      <a 
                        href={mapUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 font-medium hover:underline"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  ) : (
                    <>
                      <img 
                        src="https://picsum.photos/seed/map/800/600" 
                        alt="Map" 
                        className="w-full h-full object-cover opacity-50 grayscale"
                      />
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <MapPin className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm font-medium text-gray-500">Google Maps Integration</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-lg font-semibold text-gray-900">Description</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-sm font-medium text-gray-700">Event Description (Optional)</label>
                    <button 
                      onClick={generateDescription}
                      disabled={isGenerating}
                      className="flex items-center text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 mr-1" /> 
                      {isGenerating ? 'Generating...' : 'Auto-fill with AI'}
                    </button>
                  </div>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows={8}
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm leading-relaxed"
                    placeholder="Describe the event, expectations, and any other important details..."
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-100 max-w-md mx-auto">
        <div className="flex justify-between space-x-4">
          {step > 1 ? (
            <button 
              onClick={handlePrev}
              className="flex-1 py-3.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </button>
          ) : (
            <div className="flex-1"></div>
          )}
          
          {step < 4 ? (
            <button 
              onClick={handleNext}
              className="flex-1 py-3.5 px-4 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
            >
              Next <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button 
              onClick={publishEvent}
              className="flex-1 py-3.5 px-4 bg-gray-900 text-white rounded-xl font-medium flex items-center justify-center hover:bg-black transition-colors shadow-md"
            >
              Publish Job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
