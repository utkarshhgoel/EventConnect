import { useAuth } from '@/store/useAuth';
import { Settings, Edit3, ShieldCheck, ShieldAlert, Star, Calendar, Mail, Phone, MapPin, CheckCircle, X, Upload, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { EventPost } from '@/types';
import imageCompression from 'browser-image-compression';

export default function Profile() {
  const { user, logout, checkUser } = useAuth();
  const [publishedEvents, setPublishedEvents] = useState<EventPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    subtitle: '',
    bio: '',
    phone: '',
    location: '',
    avatar_url: '',
    gender: 'male' as 'male' | 'female'
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

  const getParsedSubtitle = (subtitleStr: string | undefined) => {
    if (!subtitleStr) return { roles: 'Event Organizer' };
    try {
      const parsed = JSON.parse(subtitleStr);
      return {
        roles: parsed.roles || 'Event Organizer',
        gender: parsed.gender
      };
    } catch (e) {
      return { roles: subtitleStr };
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchPublishedEvents();
      const parsedDetails = getParsedSubtitle(user.subtitle);
      setEditForm({
        name: user.name || '',
        subtitle: parsedDetails.roles,
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
        avatar_url: user.avatar_url || '',
        gender: user.gender || parsedDetails.gender || 'male'
      });
      setVerifyForm({
        phone: user.phone || ''
      });
    }
  }, [user]);

  // Auto-cleanup ID proof once verified
  useEffect(() => {
    const cleanupIdProof = async () => {
      if (user?.verification_status === 'verified' && user?.id_proof_url) {
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
  }, [user?.verification_status, user?.id_proof_url, user?.id, checkUser]);

  const fetchPublishedEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user?.id)
        .eq('status', 'closed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublishedEvents(data || []);
    } catch (error) {
      console.error('Error fetching published events:', error);
    } finally {
      setLoading(false);
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

      const newSubtitle = JSON.stringify({
        roles: editForm.subtitle,
        gender: editForm.gender
      });

      let { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          subtitle: newSubtitle,
          bio: editForm.bio,
          phone: editForm.phone,
          location: editForm.location,
          avatar_url: avatarUrl,
          gender: editForm.gender
        })
        .eq('id', user.id);

      // Fallback if gender column doesn't exist in DB yet
      if (error && error.message?.includes('Could not find the \'gender\' column')) {
        const { error: retryError } = await supabase
          .from('profiles')
          .update({
            name: editForm.name,
            subtitle: newSubtitle,
            bio: editForm.bio,
            phone: editForm.phone,
            location: editForm.location,
            avatar_url: avatarUrl
          })
          .eq('id', user.id);
        error = retryError;
      }

      if (error) throw error;
      
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

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      {/* Header / Cover */}
      <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
        <button 
          onClick={() => setIsEditing(true)}
          className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Info */}
      <div className="px-4 relative -mt-12">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div className="relative">
              <img 
                src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`} 
                alt="Profile" 
                className="w-24 h-24 rounded-2xl border-4 border-white shadow-sm object-cover bg-gray-100"
              />
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute -bottom-2 -right-2 p-1.5 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center space-x-1">
              {user?.verification_status === 'verified' ? (
                <div className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </div>
              ) : user?.verification_status === 'pending' ? (
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
            <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{getParsedSubtitle(user?.subtitle).roles}</p>
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
              <span className="text-2xl font-bold text-gray-900">{publishedEvents.length}</span>
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
        {(!user?.verification_status || user.verification_status === 'unverified') && (
          <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-indigo-900 flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-indigo-600" />
                Get Verified
              </h3>
              <p className="text-sm text-indigo-700 mt-1">
                Verified organizers attract 3x more top talent. Submit your ID to build trust.
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
            <h3 className="font-semibold text-gray-900">About</h3>
            <button onClick={() => setIsEditing(true)} className="text-indigo-600 text-sm font-medium hover:text-indigo-700">Edit</button>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {user?.bio || 'No bio provided yet. Click edit to add one.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-900">Contact Info</h3>
            <button onClick={() => setIsEditing(true)} className="text-indigo-600 text-sm font-medium hover:text-indigo-700">Edit</button>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="w-4 h-4 mr-3 text-gray-400" />
            {user?.email}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-4 h-4 mr-3 text-gray-400" />
            {user?.phone || 'Not provided'}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-3 text-gray-400" />
            {user?.location || 'Not provided'}
          </div>
        </div>

        {/* Events Published */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-4">Events Published (Completed)</h3>
          {loading ? (
            <div className="text-center py-4 text-gray-500 text-sm">Loading events...</div>
          ) : publishedEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No completed events yet.</div>
          ) : (
            <div className="space-y-4">
              {publishedEvents.map((event) => (
                <div key={event.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{event.name}</h4>
                    <div className="flex items-center bg-emerald-50 px-2 py-1 rounded-md">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mr-1" />
                      <span className="text-xs font-bold text-emerald-700">Completed</span>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mb-2 space-x-3">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(event.start_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {event.location}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={logout}
          className="w-full py-3.5 bg-white border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors shadow-sm"
        >
          Log Out
        </button>
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
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle / Tagline</label>
                <input 
                  type="text" 
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm({...editForm, subtitle: e.target.value})}
                  placeholder="e.g. Premium Event Organizer"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea 
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({...editForm, gender: e.target.value as 'male' | 'female'})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
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
                        className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
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
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input 
                  type="text" 
                  value={editForm.location}
                  onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About (Bio)</label>
                <textarea 
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0">
              <button 
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-70"
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
                  To get the verified badge, please provide a contact number and a link to your official ID (e.g., Google Drive link to Company Registration or Govt ID).
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
