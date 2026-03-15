import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/useAuth';
import { supabase } from '@/lib/supabase';
import { Briefcase, User as UserIcon } from 'lucide-react';

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<'organizer' | 'candidate'>('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (authError) throw authError;
        
        if (authData.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email,
              name,
              role,
              gender: role === 'candidate' ? gender : undefined,
              avatar_url: `https://picsum.photos/seed/${authData.user.id}/200`
            })
            .select()
            .single();
            
          if (profileError) throw profileError;
          
          setUser(profileData);
          navigate(`/${role}/posts`);
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (authError) throw authError;
        
        if (authData.user) {
          let { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();
            
          if (!profileData) {
            // Profile missing, create it
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: authData.user.id,
                email,
                name: email.split('@')[0], // Fallback name
                role, // Use the selected role
                gender: role === 'candidate' ? 'male' : undefined,
                avatar_url: `https://picsum.photos/seed/${authData.user.id}/200`
              })
              .select()
              .single();
              
            if (insertError) throw insertError;
            profileData = newProfile;
          } else if (profileError) {
            throw profileError;
          }
          
          setUser(profileData);
          navigate(`/${profileData.role}/posts`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">EventConnect</h1>
          <p className="mt-2 text-gray-500">{isSignUp ? 'Create an account' : 'Sign in to your account'}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setRole('organizer')}
                  className={`flex flex-col items-center p-3 border-2 rounded-xl transition-all ${
                    role === 'organizer' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <Briefcase className="w-5 h-5 mb-1" />
                  <span className="text-sm font-medium">Organizer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('candidate')}
                  className={`flex flex-col items-center p-3 border-2 rounded-xl transition-all ${
                    role === 'candidate' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <UserIcon className="w-5 h-5 mb-1" />
                  <span className="text-sm font-medium">Candidate</span>
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="John Doe"
                />
              </div>
              
              {role === 'candidate' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-600 font-medium hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
