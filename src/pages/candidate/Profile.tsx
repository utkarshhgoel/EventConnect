import { useAuth } from '@/store/useAuth';
import { Settings, Edit3, ShieldCheck, ShieldAlert, Star, Briefcase, Mail, Phone, MapPin, GraduationCap, Ruler, Calendar, ArrowLeft, X, Upload, Clock, CheckCircle } from 'lucide-react';
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
  const [completedEvents, setCompletedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(!!profileId);
  
  const [bio, setBio] = useState('Experienced event staff with a background in hospitality. Quick learner and great team player.');
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    location: '',
    avatar_url: '',
    bio: '',
    gender: 'male' as 'male' | 'female',
    roles: '',
    age: '',
    height: '',
    education: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    phone: ''
  });
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const isOwnProfile = !profileId || profileId === user?.id;

  const getParsedSubtitle = (subtitleStr: string | undefined) => {
    if (!subtitleStr) return { roles: 'Event Staff • Runner • Usher', age: '24 Years Old', height: '5\'8" (173cm)', education: 'B.A. Hospitality', photos: [] };
    try {
      const parsed = JSON.parse(subtitleStr);
      return {
        roles: parsed.roles || 'Event Staff • Runner • Usher',
        age: parsed.age || '24 Years Old',
        height: parsed.height || '5\'8" (173cm)',
        education: parsed.education || 'B.A. Hospitality',
        photos: parsed.photos || []
      };
    } catch (e) {
      return { roles: subtitleStr, age: '24 Years Old', height: '5\'8" (173cm)', education: 'B.A. Hospitality', photos: [] };
    }
  };

  useEffect(() => {
    if (profileId) {
      fetchProfile(profileId);
    } else if (user) {
      setProfileUser(user);
      setVerifyForm({
        phone: user?.phone || ''
      });
      
      const parsedDetails = getParsedSubtitle(user?.subtitle);
      
      setEditForm({
        name: user?.name || '',
        phone: user?.phone || '',
        location: user?.location || '',
        avatar_url: user?.avatar_url || '',
        bio: user?.bio || '',
        gender: user?.gender || 'male',
        roles: parsedDetails.roles,
        age: parsedDetails.age,
        height: parsedDetails.height,
        education: parsedDetails.education
      });
      if (user?.bio) setBio(user.bio);
      fetchReviews(user.id);
    }
  }, [profileId, user]);

  const fetchReviews = async (id: string) => {
    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*, event:events(name)')
        .eq('candidate_id', id)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
      } else {
        setReviews(reviewsData || []);
      }

      // Fetch completed events (accepted applications for closed events)
      const { data: eventsData, error: eventsError } = await supabase
        .from('applications')
        .select('*, event:events(*)')
        .eq('candidate_id', id)
        .eq('status', 'accepted');

      if (eventsError) {
        console.error('Error fetching completed events:', eventsError);
      } else {
        const closedEvents = (eventsData || [])
          .filter(app => app.event && app.event.status === 'closed')
          .map(app => app.event);
        setCompletedEvents(closedEvents);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchProfile = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      setProfileUser(data);

      await fetchReviews(id);
    } catch (error) {
      console.error('Error fetching profile:', error);
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
        // Save the enhanced bio immediately
        if (user) {
          await supabase.from('profiles').update({ bio: response.text }).eq('id', user.id);
          checkUser();
        }
      }
    } catch (error) {
      console.error("Error enhancing bio:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState<number | null>(null);

  const handlePhotoUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhotoIndex(index);
    try {
      let fileToUpload = file;
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1080,
          useWebWorker: true
        };
        fileToUpload = await imageCompression(file, options);
      } catch (error) {
        console.error('Error compressing image:', error);
      }

      const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}-photo-${index}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const parsedDetails = getParsedSubtitle(user.subtitle);
      const currentPhotos = [...(parsedDetails.photos || [])];
      
      while (currentPhotos.length <= index) {
        currentPhotos.push('');
      }
      currentPhotos[index] = publicUrl;

      const newSubtitle = JSON.stringify({
        ...parsedDetails,
        photos: currentPhotos
      });

      const { error } = await supabase
        .from('profiles')
        .update({ subtitle: newSubtitle })
        .eq('id', user.id);

      if (error) throw error;
      
      await checkUser();
      if (profileId) {
        fetchProfile(profileId);
      } else {
        setProfileUser({ ...user, subtitle: newSubtitle });
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert(`Failed to upload photo: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingPhotoIndex(null);
    }
  };

  const handlePhotoDelete = async (index: number) => {
    if (!user) return;
    try {
      const parsedDetails = getParsedSubtitle(user.subtitle);
      const currentPhotos = [...(parsedDetails.photos || [])];
      
      if (index < currentPhotos.length) {
        currentPhotos[index] = '';
      }

      const newSubtitle = JSON.stringify({
        ...parsedDetails,
        photos: currentPhotos
      });

      const { error } = await supabase
        .from('profiles')
        .update({ subtitle: newSubtitle })
        .eq('id', user.id);

      if (error) throw error;
      
      await checkUser();
      if (profileId) {
        fetchProfile(profileId);
      } else {
        setProfileUser({ ...user, subtitle: newSubtitle });
      }
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      alert(`Failed to delete photo: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatarUrl = editForm.avatar_url;

      if (avatarFile) {
        // Compress image
        let fileToUpload = avatarFile;
        try {
          const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 800,
            useWebWorker: true
          };
          fileToUpload = await imageCompression(avatarFile, options);
        } catch (error) {
          console.error('Error compressing image:', error);
        }

        const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, fileToUpload);

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      const parsedDetails = getParsedSubtitle(user.subtitle);
      const newSubtitle = JSON.stringify({
        roles: editForm.roles,
        age: editForm.age,
        height: editForm.height,
        education: editForm.education,
        gender: editForm.gender,
        photos: parsedDetails.photos || []
      });

      let { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          phone: editForm.phone,
          location: editForm.location,
          avatar_url: avatarUrl,
          bio: editForm.bio,
          gender: editForm.gender,
          subtitle: newSubtitle
        })
        .eq('id', user.id);

      // Fallback if gender column doesn't exist in DB yet
      if (error && error.message?.includes('Could not find the \'gender\' column')) {
        const { error: retryError } = await supabase
          .from('profiles')
          .update({
            name: editForm.name,
            phone: editForm.phone,
            location: editForm.location,
            avatar_url: avatarUrl,
            bio: editForm.bio,
            subtitle: newSubtitle
          })
          .eq('id', user.id);
        error = retryError;
      }

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      
      setBio(editForm.bio);
      await checkUser(); // Refresh user data
      setIsEditing(false);
      setAvatarFile(null);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
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
          <button 
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition"
          >
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
                <button 
                  onClick={() => setIsEditing(true)}
                  className="absolute -bottom-2 -right-2 p-1.5 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700"
                >
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
            <p className="text-gray-500 text-sm mt-1">{getParsedSubtitle(profileUser?.subtitle).roles}</p>
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
              <span className="text-2xl font-bold text-gray-900">{completedEvents.length}</span>
              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                <Briefcase className="w-3 h-3 text-emerald-400 mr-1" />
                Events Worked
              </div>
            </div>
          </div>

          {completedEvents.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Completed Events</h4>
              <ul className="space-y-2">
                {completedEvents.map((event, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-center">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                    <span className="truncate">{event.name || 'Unknown Event'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
              {getParsedSubtitle(profileUser?.subtitle).age}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Ruler className="w-4 h-4 mr-3 text-gray-400" />
              {getParsedSubtitle(profileUser?.subtitle).height}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <GraduationCap className="w-4 h-4 mr-3 text-gray-400" />
              {getParsedSubtitle(profileUser?.subtitle).education}
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
            {profileUser?.phone || 'Not provided'}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-3 text-gray-400" />
            {profileUser?.location || 'Not provided'}
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-4">Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const photoUrl = getParsedSubtitle(profileUser?.subtitle).photos?.[index];
              return (
                <div key={index} className="aspect-square rounded-xl bg-gray-100 border-2 border-dashed border-gray-200 relative overflow-hidden group">
                  {photoUrl ? (
                    <>
                      <img src={photoUrl} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      {isOwnProfile && (
                        <button
                          onClick={() => handlePhotoDelete(index)}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  ) : (
                    isOwnProfile ? (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                        {uploadingPhotoIndex === index ? (
                          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Upload className="w-5 h-5 text-gray-400" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(index, e)}
                          disabled={uploadingPhotoIndex !== null}
                        />
                      </label>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-300 text-xs">Empty</span>
                      </div>
                    )
                  )}
                </div>
              );
            })}
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
                    <h4 className="font-medium text-gray-900">{review.event?.name || 'Unknown Event'}</h4>
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

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roles / Subtitle</label>
                <input 
                  type="text" 
                  value={editForm.roles}
                  onChange={(e) => setEditForm({...editForm, roles: e.target.value})}
                  placeholder="e.g. Event Staff • Runner • Usher"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea 
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({...editForm, gender: e.target.value as 'male' | 'female'})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor="avatar-upload"
                        className="relative cursor-pointer bg-transparent rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500"
                      >
                        <span>Upload a file</span>
                        <input 
                          id="avatar-upload" 
                          name="avatar-upload" 
                          type="file" 
                          className="sr-only" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setAvatarFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                    {avatarFile && (
                      <p className="text-sm font-medium text-emerald-600 mt-2">
                        Selected: {avatarFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input 
                  type="text" 
                  value={editForm.location}
                  onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Personal Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input 
                      type="text" 
                      value={editForm.age}
                      onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                      placeholder="e.g. 24 Years Old"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                    <input 
                      type="text" 
                      value={editForm.height}
                      onChange={(e) => setEditForm({...editForm, height: e.target.value})}
                      placeholder="e.g. 5'8&quot; (173cm)"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                    <input 
                      type="text" 
                      value={editForm.education}
                      onChange={(e) => setEditForm({...editForm, education: e.target.value})}
                      placeholder="e.g. B.A. Hospitality"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0">
              <button 
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
