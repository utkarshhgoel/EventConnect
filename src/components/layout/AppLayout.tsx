import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/store/useAuth';

export function AppLayout() {
  const { user, role } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Ensure users stay in their role's area
  if (role === 'organizer' && location.pathname.startsWith('/candidate')) {
    return <Navigate to="/organizer/posts" replace />;
  }
  if (role === 'candidate' && location.pathname.startsWith('/organizer')) {
    return <Navigate to="/candidate/posts" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="max-w-md mx-auto min-h-screen bg-white shadow-sm">
        <Outlet />
      </main>
      <BottomNav role={role!} />
    </div>
  );
}
