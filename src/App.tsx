import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import Login from './pages/Login';

// Organizer Pages
import OrgPosts from './pages/organizer/Posts';
import OrgPublish from './pages/organizer/Publish';
import OrgInbox from './pages/organizer/Inbox';
import OrgProfile from './pages/organizer/Profile';
import OrgEventDetails from './pages/organizer/EventDetails';

// Candidate Pages
import CandPosts from './pages/candidate/Posts';
import CandApplications from './pages/candidate/Applications';
import CandInbox from './pages/candidate/Inbox';
import CandProfile from './pages/candidate/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<AppLayout />}>
          {/* Organizer Routes */}
          <Route path="/organizer/posts" element={<OrgPosts />} />
          <Route path="/organizer/posts/:id" element={<OrgEventDetails />} />
          <Route path="/organizer/publish" element={<OrgPublish />} />
          <Route path="/organizer/inbox" element={<OrgInbox />} />
          <Route path="/organizer/profile" element={<OrgProfile />} />
          
          {/* Candidate Routes */}
          <Route path="/candidate/posts" element={<CandPosts />} />
          <Route path="/candidate/applications" element={<CandApplications />} />
          <Route path="/candidate/inbox" element={<CandInbox />} />
          <Route path="/candidate/profile" element={<CandProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
