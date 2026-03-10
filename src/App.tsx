import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { useAuth } from './store/useAuth';
import Login from './pages/Login';

// Organizer Pages
import OrgPosts from './pages/organizer/Posts';
import OrgPublish from './pages/organizer/Publish';
import OrgInbox from './pages/organizer/Inbox';
import OrgProfile from './pages/organizer/Profile';
import OrgEventDetails from './pages/organizer/EventDetails';
import OrgReview from './pages/organizer/Review';

// Candidate Pages
import CandPosts from './pages/candidate/Posts';
import CandApplications from './pages/candidate/Applications';
import CandInbox from './pages/candidate/Inbox';
import CandProfile from './pages/candidate/Profile';
import CandEventDetails from './pages/candidate/EventDetails';
import Chat from './pages/Chat';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-4 text-center border-t-4 border-red-500">
            <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
            <p className="text-gray-600 text-sm">
              An unexpected error occurred in the application.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg text-left text-xs font-mono text-red-600 overflow-x-auto">
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function App() {
  const { checkUser, isLoading } = useAuth();
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  let isValidUrl = false;
  try {
    if (supabaseUrl) {
      new URL(supabaseUrl);
      isValidUrl = true;
    }
  } catch (e) {
    // Invalid URL
  }

  const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && isValidUrl);

  useEffect(() => {
    if (isSupabaseConfigured) {
      checkUser();
    }
  }, [checkUser, isSupabaseConfigured]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-4 text-center border-t-4 border-red-500">
          <h1 className="text-2xl font-bold text-gray-900">Database Not Configured</h1>
          <p className="text-gray-600">
            The application is missing or has invalid Supabase environment variables.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg text-left text-sm font-mono text-gray-800 overflow-x-auto">
            VITE_SUPABASE_URL<br/>
            VITE_SUPABASE_ANON_KEY
          </div>
          <p className="text-sm text-gray-500">
            Please add valid credentials to your Vercel project settings and redeploy, or to your local .env file.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<AppLayout />}>
            {/* Organizer Routes */}
            <Route path="/organizer/posts" element={<OrgPosts />} />
            <Route path="/organizer/posts/:id" element={<OrgEventDetails />} />
            <Route path="/organizer/publish" element={<OrgPublish />} />
            <Route path="/organizer/inbox" element={<OrgInbox />} />
            <Route path="/organizer/inbox/:id" element={<Chat />} />
            <Route path="/organizer/profile" element={<OrgProfile />} />
            <Route path="/organizer/profile/:id" element={<CandProfile />} />
            <Route path="/organizer/review/:id" element={<OrgReview />} />
            
            {/* Candidate Routes */}
            <Route path="/candidate/posts" element={<CandPosts />} />
            <Route path="/candidate/event/:id" element={<CandEventDetails />} />
            <Route path="/candidate/applications" element={<CandApplications />} />
            <Route path="/candidate/inbox" element={<CandInbox />} />
            <Route path="/candidate/inbox/:id" element={<Chat />} />
            <Route path="/candidate/profile" element={<CandProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
