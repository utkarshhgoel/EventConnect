import { useState, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, X } from 'lucide-react';

export function VerificationPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if user is unverified and hasn't dismissed it this session
    const hasDismissed = sessionStorage.getItem('verificationPromptDismissed');
    
    // Check if user is unverified (using either the old boolean or new status)
    const isUnverified = user && !user.is_verified && (!user.verification_status || user.verification_status === 'unverified');
    
    // Don't show on the profile page itself
    const isProfilePage = location.pathname.includes('/profile');

    if (isUnverified && !hasDismissed && !isProfilePage) {
      // Add a small delay so it doesn't pop up instantly on login
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, location.pathname]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('verificationPromptDismissed', 'true');
  };

  const handleGetVerified = () => {
    handleDismiss();
    navigate(`/${user?.role}/profile`);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center relative">
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">Get Verified Today!</h3>
          <p className="text-gray-600 mb-6">
            Verified {user?.role === 'organizer' ? 'organizers attract 3x more top talent' : 'candidates get hired 4x faster'}. Build trust and stand out from the crowd by verifying your identity.
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={handleGetVerified}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Get Verified Now
            </button>
            <button 
              onClick={handleDismiss}
              className="w-full py-3 bg-gray-50 text-gray-600 rounded-xl font-medium hover:bg-gray-100 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
