import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Briefcase, PlusCircle, MessageSquare, User, FileText } from 'lucide-react';

interface BottomNavProps {
  role: 'organizer' | 'candidate';
}

export function BottomNav({ role }: BottomNavProps) {
  const location = useLocation();

  const organizerTabs = [
    { name: 'Posts', href: '/organizer/posts', icon: Briefcase },
    { name: 'Publish', href: '/organizer/publish', icon: PlusCircle },
    { name: 'Inbox', href: '/organizer/inbox', icon: MessageSquare },
    { name: 'Profile', href: '/organizer/profile', icon: User },
  ];

  const candidateTabs = [
    { name: 'Posts', href: '/candidate/posts', icon: Briefcase },
    { name: 'Applications', href: '/candidate/applications', icon: FileText },
    { name: 'Inbox', href: '/candidate/inbox', icon: MessageSquare },
    { name: 'Profile', href: '/candidate/profile', icon: User },
  ];

  const tabs = role === 'organizer' ? organizerTabs : candidateTabs;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.name}
              to={tab.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "fill-indigo-50")} />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
