import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FocusModeProvider } from './context/FocusModeContext';
import { ScreenTimeProvider } from './context/ScreenTimeContext';

// Layout
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import BottomNav from './components/layout/BottomNav';
import RightSidebar from './components/layout/RightSidebar';

// Overlays & Modals
import TimeAlertNotification from './components/common/TimeAlertNotification';
import KidsLockScreen from './components/common/KidsLockScreen';
import KidsModeToggleModal from './components/common/KidsModeToggleModal';
import CreatePostModal from './components/create/CreatePostModal';
import CreateStoryModal from './components/feed/CreateStoryModal';

// Pages
import HomePage from './pages/HomePage';
import ReelsPage from './pages/ReelsPage';
import ExplorePage from './pages/ExplorePage';
import InterestsPage from './pages/InterestsPage';
import FocusModePage from './pages/FocusModePage';
import CommunitiesPage from './pages/CommunitiesPage';
import StitchPage from './pages/StitchPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ModerationPage from './pages/ModerationPage';
import NotificationsPage from './pages/NotificationsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AgeGatePage from './pages/AgeGatePage';

function ProtectedLayout() {
  const { user, loading, isKidsMode } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-verity-dark flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-verity-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`min-h-screen md:h-[100dvh] md:overflow-hidden w-full transition-colors duration-300 ${
      isKidsMode ? 'kids-mode-active bg-kids-bg text-kids-text font-kids' : 'bg-verity-dark text-[#F4F5FF] font-sans'
    }`}>
      {/* Mobile / Small-Tablet Top Header (hidden on md+ so all 3 desktop columns align at top) */}
      <div className="md:hidden">
        <Navbar onOpenSearch={() => {}} />
      </div>

      {/* Unified Three-Column Full-Viewport Shell */}
      <div className="w-full px-3 sm:px-4 lg:px-5 md:py-4 md:h-full flex flex-col md:flex-row md:items-stretch md:gap-4 lg:gap-5">
        {/* Left Navigation Sidebar */}
        <Sidebar onOpenCreate={() => setShowCreateModal(true)} />

        {/* Center Main Content Area (scrolls cleanly inside viewport on desktop) */}
        <main className="flex-1 min-w-0 w-full md:h-full md:overflow-y-auto md:pr-1 pb-24 md:pb-4">
          <Routes>
            <Route 
              path="/" 
              element={
                <HomePage 
                  onOpenCreate={() => setShowCreateModal(true)} 
                  onOpenCreateStory={() => setShowStoryModal(true)} 
                />
              } 
            />
            <Route path="/reels" element={<ReelsPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/interests" element={<InterestsPage />} />
            <Route path="/focus" element={<FocusModePage />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/stitch" element={<StitchPage />} />
            <Route path="/profile/:username?" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/moderation" element={<ModerationPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Stacked Smart Activity Panel on Mobile & Narrow Tablets (< lg) */}
          <RightSidebar variant="stacked" />
        </main>

        {/* Right Desktop Smart Activity Panel */}
        <RightSidebar variant="sidebar" />
      </div>

      {/* Floating Bottom Nav on Mobile */}
      <BottomNav onOpenCreate={() => setShowCreateModal(true)} />

      {/* Global Modals & Overlays */}
      <TimeAlertNotification />
      <KidsLockScreen />
      <KidsModeToggleModal />

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={() => window.location.reload()}
        />
      )}

      {showStoryModal && (
        <CreateStoryModal
          onClose={() => setShowStoryModal(false)}
          onStoryCreated={() => window.location.reload()}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <FocusModeProvider>
          <ScreenTimeProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/age-gate" element={<AgeGatePage />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </ScreenTimeProvider>
        </FocusModeProvider>
      </AuthProvider>
    </Router>
  );
}
