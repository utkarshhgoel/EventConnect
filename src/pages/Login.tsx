import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/useAuth';
import { Briefcase, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: 'organizer' | 'candidate') => {
    login(role);
    navigate(`/${role}/posts`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">EventConnect</h1>
          <p className="mt-2 text-gray-500">Choose your role to continue</p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={() => handleLogin('organizer')}
            className="flex items-center p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
          >
            <div className="bg-indigo-100 p-3 rounded-lg group-hover:bg-indigo-600 transition-colors">
              <Briefcase className="w-6 h-6 text-indigo-600 group-hover:text-white" />
            </div>
            <div className="ml-4 text-left">
              <h3 className="font-semibold text-gray-900">I am an Organizer</h3>
              <p className="text-sm text-gray-500">Post events and hire candidates</p>
            </div>
          </button>

          <button
            onClick={() => handleLogin('candidate')}
            className="flex items-center p-4 border-2 border-gray-100 rounded-xl hover:border-emerald-600 hover:bg-emerald-50 transition-all group"
          >
            <div className="bg-emerald-100 p-3 rounded-lg group-hover:bg-emerald-600 transition-colors">
              <User className="w-6 h-6 text-emerald-600 group-hover:text-white" />
            </div>
            <div className="ml-4 text-left">
              <h3 className="font-semibold text-gray-900">I am a Candidate</h3>
              <p className="text-sm text-gray-500">Find events and apply for roles</p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
