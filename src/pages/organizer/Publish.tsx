import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Plus, MapPin, Sparkles, Trash2, Clock, Search, Navigation, Map } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { TimePickerModal } from '@/components/ui/TimePickerModal';

import { stringifyDescription } from '@/utils/descriptionParser';

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
  const [timePickerConfig, setTimePickerConfig] = useState<{
    isOpen: boolean;
    field: 'startTime' | 'endTime' | null;
    initialTime: string;
    title: string;
  }>({
    isOpen: false,
    field: null,
    initialTime: '',
    title: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    workingHours: '',
    location: '',
    description: '',
    facilities: [] as string[],
    roles: [
      { id: '1', title: '', dressCode: '', reqMale: '', reqFemale: '', budgetMale: '', budgetFemale: '' }
    ]
  });

  useEffect(() => {
    if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      // Calculate number of days (inclusive)
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Calculate daily hours
      const [startH, startM] = formData.startTime.split(':').map(Number);
      const [endH, endM] = formData.endTime.split(':').map(Number);
      
      let dailyHours = (endH + endM / 60) - (startH + startM / 60);
      
      // Handle cases where end time is past midnight
      if (dailyHours < 0) {
        dailyHours += 24;
      }

      if (diffDays > 0 && dailyHours > 0) {
        const totalHours = Math.round((dailyHours * diffDays) * 10) / 10;
        setFormData(prev => ({ ...prev, workingHours: totalHours.toString() }));
      } else {
        setFormData(prev => ({ ...prev, workingHours: '0' }));
      }
    }
  }, [formData.startDate, formData.endDate, formData.startTime, formData.endTime]);

  const handleNext = () => setStep(s => Math.min(s + 1, 5));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const addRole = () => {
    setFormData(prev => ({
      ...prev,
      roles: [...prev.roles, { id: Date.now().toString(), title: '', dressCode: '', reqMale: '', reqFemale: '', budgetMale: '', budgetFemale: '' }]
    }));
  };

  const removeRole = (id: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.filter(r => r.id !== id)
    }));
  };

  const formatTimeDisplay = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const updateRole = (id: string, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<{title: string, address: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!formData.location || formData.location.length < 3 || !showSuggestions) {
        setLocationSuggestions([]);
        return;
      }
      
      setIsSearchingSuggestions(true);
      try {
        const response = await getAI().models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Find 5 real places matching: "${formData.location}". Return a JSON array of objects with 'title' (main name) and 'address' (secondary text).`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  address: { type: Type.STRING }
                }
              }
            }
          }
        });
        
        if (response.text) {
          const suggestions = JSON.parse(response.text);
          setLocationSuggestions(suggestions);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setIsSearchingSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.location, showSuggestions]);

  const handleSelectLocation = async (suggestion: {title: string, address: string}) => {
    const fullAddress = `${suggestion.title}, ${suggestion.address}`;
    setFormData(prev => ({ ...prev, location: fullAddress }));
    setShowSuggestions(false);
    
    // Automatically search for the map URL
    setIsSearchingLocation(true);
    try {
      const response = await getAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Find the exact address for: ${fullAddress}`,
        config: {
          tools: [{ googleMaps: {} }],
        }
      });
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        const mapsChunk = chunks.find(c => c.web?.uri?.includes('google.com/maps') || c.web?.title);
        if (mapsChunk && mapsChunk.web && mapsChunk.web.uri) {
          setMapUrl(mapsChunk.web.uri);
        }
      }
    } catch (error) {
      console.error("Error searching location:", error);
    } finally {
      setIsSearchingLocation(false);
    }
  };

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

  const { user } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);

  const publishEvent = async () => {
    if (!user) return;
    setIsPublishing(true);
    try {
      // 1. Insert Event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          organizer_id: user.id,
          name: formData.name,
          start_date: formData.startDate,
          end_date: formData.endDate,
          start_time: formData.startTime,
          end_time: formData.endTime,
          working_hours: parseInt(formData.workingHours) || 0,
          location: formData.location,
          description: stringifyDescription(formData.description, formData.facilities),
          status: 'open'
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // 2. Insert Roles
      const rolesToInsert = formData.roles.map(role => ({
        event_id: eventData.id,
        title: role.title,
        dress_code: role.dressCode,
        req_male: parseInt(role.reqMale.toString()) || 0,
        req_female: parseInt(role.reqFemale.toString()) || 0,
        budget_male: parseInt(role.budgetMale.toString()) || 0,
        budget_female: parseInt(role.budgetFemale.toString()) || 0,
        filled_male: 0,
        filled_female: 0
      }));

      const { error: rolesError } = await supabase
        .from('job_roles')
        .insert(rolesToInsert);

      if (rolesError) throw rolesError;

      alert("Event published successfully!");
      navigate('/organizer/posts');
    } catch (error: any) {
      console.error("Error publishing event:", error);
      alert(error.message || "Failed to publish event");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="pb-24 min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Publish Event</h1>
          <div className="text-sm font-medium text-gray-500">Step {step} of 5</div>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${(step / 5) * 100}%` }}
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
                    <button
                      type="button"
                      onClick={() => setTimePickerConfig({
                        isOpen: true,
                        field: 'startTime',
                        initialTime: formData.startTime,
                        title: 'Select Start Time'
                      })}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-left flex items-center justify-between"
                    >
                      <span className={formData.startTime ? 'text-gray-900' : 'text-gray-400'}>
                        {formData.startTime ? formatTimeDisplay(formData.startTime) : 'Select time'}
                      </span>
                      <Clock className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <button
                      type="button"
                      onClick={() => setTimePickerConfig({
                        isOpen: true,
                        field: 'endTime',
                        initialTime: formData.endTime,
                        title: 'Select End Time'
                      })}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-left flex items-center justify-between"
                    >
                      <span className={formData.endTime ? 'text-gray-900' : 'text-gray-400'}>
                        {formData.endTime ? formatTimeDisplay(formData.endTime) : 'Select time'}
                      </span>
                      <Clock className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Working Hours</label>
                  <input 
                    type="number" 
                    value={formData.workingHours}
                    readOnly
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed outline-none"
                    placeholder="Auto-calculated"
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
                            onChange={e => updateRole(role.id, 'reqMale', e.target.value)}
                            className="w-full p-2 bg-white border border-blue-200 rounded-lg outline-none text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Budget per candidate (₹)</label>
                          <input 
                            type="number" 
                            value={role.budgetMale}
                            onChange={e => updateRole(role.id, 'budgetMale', e.target.value)}
                            className="w-full p-2 bg-white border border-blue-200 rounded-lg outline-none text-sm"
                            placeholder="0"
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
                            onChange={e => updateRole(role.id, 'reqFemale', e.target.value)}
                            className="w-full p-2 bg-white border border-pink-200 rounded-lg outline-none text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Budget per candidate (₹)</label>
                          <input 
                            type="number" 
                            value={role.budgetFemale}
                            onChange={e => updateRole(role.id, 'budgetFemale', e.target.value)}
                            className="w-full p-2 bg-white border border-pink-200 rounded-lg outline-none text-sm"
                            placeholder="0"
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
                  <div className="relative">
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          value={formData.location}
                          onChange={e => {
                            setFormData({...formData, location: e.target.value});
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Search location..."
                        />
                        {isSearchingSuggestions && (
                          <div className="absolute right-3 top-3.5 w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                      <button 
                        onClick={searchLocation}
                        disabled={isSearchingLocation || !formData.location}
                        className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 disabled:opacity-50 whitespace-nowrap"
                      >
                        {isSearchingLocation ? 'Searching...' : 'Find on Map'}
                      </button>
                    </div>

                    {/* Autocomplete Dropdown */}
                    <AnimatePresence>
                      {showSuggestions && locationSuggestions.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                        >
                          {locationSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectLocation(suggestion)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start space-x-3 border-b border-gray-50 last:border-0 transition-colors"
                            >
                              <div className="mt-0.5 bg-gray-100 p-2 rounded-full text-gray-500">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{suggestion.title}</div>
                                <div className="text-sm text-gray-500 truncate">{suggestion.address}</div>
                              </div>
                              <Navigation className="w-4 h-4 text-gray-300 mt-2 transform rotate-45" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
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

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-lg font-semibold text-gray-900">Facilities Provided</h2>
              <p className="text-sm text-gray-500">Select the amenities and facilities you will provide to the candidates during the event.</p>
              
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'food', label: 'Food & Beverages' },
                  { id: 'accommodation', label: 'Accommodation' },
                  { id: 'travel', label: 'Travel Expenses' },
                  { id: 'certificate', label: 'Certificate of Completion' },
                  { id: 'goodies', label: 'Event Goodies / Swag' },
                  { id: 'parking', label: 'Free Parking' },
                  { id: 'wifi', label: 'Free Wi-Fi' }
                ].map((facility) => (
                  <label 
                    key={facility.id}
                    className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${
                      formData.facilities.includes(facility.label) 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      checked={formData.facilities.includes(facility.label)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, facilities: [...prev.facilities, facility.label] }));
                        } else {
                          setFormData(prev => ({ ...prev, facilities: prev.facilities.filter(f => f !== facility.label) }));
                        }
                      }}
                    />
                    <span className={`ml-3 font-medium ${
                      formData.facilities.includes(facility.label) ? 'text-indigo-900' : 'text-gray-700'
                    }`}>
                      {facility.label}
                    </span>
                  </label>
                ))}
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
          
          {step < 5 ? (
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

      <TimePickerModal
        isOpen={timePickerConfig.isOpen}
        onClose={() => setTimePickerConfig(prev => ({ ...prev, isOpen: false }))}
        initialTime={timePickerConfig.initialTime}
        title={timePickerConfig.title}
        onSelect={(time) => {
          if (timePickerConfig.field) {
            setFormData(prev => ({ ...prev, [timePickerConfig.field!]: time }));
          }
        }}
      />
    </div>
  );
}
