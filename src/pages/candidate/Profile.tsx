import { useAuth } from '@/store/useAuth';
import { Settings, Edit3, ShieldCheck, ShieldAlert, Star, Briefcase, Mail, Phone, MapPin, GraduationCap, Ruler, Calendar, ArrowLeft, X, Upload, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

let ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is missing");
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
};

export default function Profile() {
  const { user, logout, checkUser } = useAuth();
  const { id: profileId } = useParams();
  const navigate = useNavigate();
  
  const [profileUser, setProfileUser] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(!!profileId);
  
  const [bio, setBio] = useState('Experienced event staff with a background in hospitality. Quick learner and great team player.');
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    phone: ''
  });
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const isOwnProfile = !profileId || profileId === user?.id;

  useEffect(() => {
    if (profileId) {
      fetchProfile();
    } else {
      setProfileUser(user);
      setVerifyForm({
        phone: user?.phone || ''
      });
    }
  }, [profileId, user]);

  // Auto-cleanup ID proof once verified
  useEffect(() => {
    const cleanupIdProof = async () => {
      if (isOwnProfile && user?.verification_status === 'verified' && user?.id_proof_url) {
        try {
          // Extract filename from URL
          const urlParts = user.id_proof_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `id_proofs/${fileName}`;

          // Delete from storage
          await supabase.storage.from('verifications').remove([filePath]);

          // Clear the URL from the profile
          await supabase.from('profiles').update({ id_proof_url: null }).eq('id', user.id);
          
          checkUser(); // Refresh local state
        } catch (error) {
          console.error('Error cleaning up ID proof:', error);
        }
      }
    };
    
    cleanupIdProof();
  }, [user?.verification_status, user?.id_proof_url, user?.id, isOwnProfile, checkUser]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
        
      if (error) throw error;
      setProfileUser(data);

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*, event:events(title)')
        .eq('candidate_id', profileId)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
      } else {
        setReviews(reviewsData || []);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const enhanceBio = async () => {
    if (!process.env.GEMINI_API_KEY) {
      alert("Gemini API Key missing. Please configure it in AI Studio.");
      return;
    }
    setIsEnhancing(true);
    try {
      const prompt = `Enhance this professional bio for an event staff candidate to make it sound more impressive and professional, but keep it concise (max 3 sentences): "${bio}"`;
      
      const response = await getAI().models.generateContent({
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

  const handleSubmitVerification = async () => {
    if (!user) return;
    if (!verifyForm.phone || !idProofFile) {
      alert('Please provide both phone number and upload an ID proof');
      return;
    }

    setSubmittingVerification(true);
    try {
      // 1. Compress image if it's an image file
      let fileToUpload = idProofFile;
      if (idProofFile.type.startsWith('image/')) {
        try {
          const options = {
            maxSizeMB: 0.5, // Compress to ~500KB
            maxWidthOrHeight: 1920,
            useWebWorker: true
          };
          fileToUpload = await imageCompression(idProofFile, options);
        } catch (error) {
          console.error('Error compressing image:', error);
          // Fallback to original file if compression fails
        }
      }

      // 2. Upload file to Supabase Storage
      const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `id_proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(filePath, fileToUpload);

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      // 3. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verifications')
        .getPublicUrl(filePath);

      // 3. Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: verifyForm.phone,
          id_proof_url: publicUrl,
          verification_status: 'pending'
        })
        .eq('id', user.id);

      if (error) throw error;
      
      await checkUser();
      setIsVerifying(false);
    } catch (error: any) {
      console.error('Error submitting verification:', error);
      alert(`Failed to submit verification request: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmittingVerification(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      {/* Header / Cover */}
      <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
        {!isOwnProfile && (
          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        {isOwnProfile && (
          <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition">
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 relative -mt-12">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div className="relative">
              <img 
                src={profileUser?.avatar_url || `https://picsum.photos/seed/${profileUser?.id || 'default'}/100`} 
                alt="Profile" 
                className="w-24 h-24 rounded-2xl border-4 border-white shadow-sm object-cover bg-gray-100"
              />
              {isOwnProfile && (
                <button className="absolute -bottom-2 -right-2 p-1.5 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700">
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {profileUser?.verification_status === 'verified' ? (
                <div className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Gov ID Verified</span>
                </div>
              ) : profileUser?.verification_status === 'pending' ? (
                <div className="flex items-center space-x-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-100">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-200">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Unverified</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900">{profileUser?.name || 'Candidate'}</h1>
            <p className="text-gray-500 text-sm mt-1">Event Staff • Runner • Usher</p>
          </div>

          <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">
                {reviews.length > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) : '0.0'}
              </span>
              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 mr-1" />
                {reviews.length} Reviews
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">{reviews.length}</span>
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
        {isOwnProfile && (!user?.verification_status || user.verification_status === 'unverified') && (
          <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-indigo-900 flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-indigo-600" />
                Get Verified
              </h3>
              <p className="text-sm text-indigo-700 mt-1">
                Verified candidates get hired 4x faster. Submit your ID to build trust.
              </p>
            </div>
            <button 
              onClick={() => setIsVerifying(true)}
              className="whitespace-nowrap px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm w-full sm:w-auto"
            >
              Verify Now
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Bio</h3>
            {isOwnProfile && (
              <button 
                onClick={enhanceBio}
                disabled={isEnhancing}
                className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100 disabled:opacity-50"
              >
                {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
              </button>
            )}
          </div>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={!isOwnProfile}
            className="w-full text-sm text-gray-600 leading-relaxed bg-transparent border-none outline-none resize-none disabled:bg-transparent"
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
            {profileUser?.email || 'Not provided'}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-4 h-4 mr-3 text-gray-400" />
            {profileUser?.phone || '+1 (555) 987-6543'}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-3 text-gray-400" />
            {profileUser?.location || 'San Francisco, CA'}
          </div>
        </div>

        {/* Experience / Reviews */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-4">Experience & Reviews</h3>
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No experience recorded yet.</div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review, idx) => (
                <div key={idx} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{review.event?.title || 'Unknown Event'}</h4>
                    <div className="flex items-center bg-amber-50 px-2 py-1 rounded-md">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mr-1" />
                      <span className="text-xs font-bold text-amber-700">{review.rating}.0</span>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <span className="bg-gray-100 px-2 py-1 rounded-md font-medium">
                      Performance: {
                        review.likert_scale === 1 ? 'Poor' :
                        review.likert_scale === 2 ? 'Fair' :
                        review.likert_scale === 3 ? 'Good' :
                        review.likert_scale === 4 ? 'Very Good' : 'Excellent'
                      }
                    </span>
                  </div>
                  {review.description && (
                    <p className="text-sm text-gray-600 italic">"{review.description}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {isOwnProfile && (
          <button 
            onClick={logout}
            className="w-full py-3.5 bg-white border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors shadow-sm"
          >
            Log Out
          </button>
        )}
      </div>

      {/* Verification Modal */}
      {isVerifying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900">Verify Identity</h3>
              <button 
                onClick={() => setIsVerifying(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-800">
                  To get the verified badge, please provide a contact number and a link to your official ID (e.g., Google Drive link to Govt ID).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input 
                  type="tel" 
                  value={verifyForm.phone}
                  onChange={(e) => setVerifyForm({...verifyForm, phone: e.target.value})}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Proof Document</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>Upload a file</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only" 
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setIdProofFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                    {idProofFile && (
                      <p className="text-sm font-medium text-emerald-600 mt-2">
                        Selected: {idProofFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0">
              <button 
                onClick={handleSubmitVerification}
                disabled={submittingVerification}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center justify-center"
              >
                {submittingVerification ? 'Submitting...' : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit for Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
