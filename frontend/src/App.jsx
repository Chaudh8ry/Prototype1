import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Scanner from './components/Scanner';
import ProfileForm from './components/ProfileForm';
import ConfirmationView from './components/ConfirmationView';
import AnalysisReport from './components/AnalysisReport';
import ScanHistory from './components/ScanHistory';
import Insights from './components/Insights';
import CompareProducts from './components/CompareProducts';
import { getAuthToken, getUser, authAPI, profileAPI, clearAuthStorage, AUTH_EVENTS } from './services/api';

function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [compareData, setCompareData] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setUserProfile(null);
      setProfiles([]);
      setActiveProfileId(null);
      setAnalysisData(null);
      setCompareData(null);
      setCurrentView('login');
    };

    window.addEventListener(AUTH_EVENTS.AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EVENTS.AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const initializeApp = async () => {
    const token = getAuthToken();
    const savedUser = getUser();

    if (token && savedUser) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('Auth check timed out')), 12000);
        });

        // Verify token is still valid and get fresh user data
        const response = await Promise.race([authAPI.getCurrentUser(), timeoutPromise]);
        const userData = response.data.user;
        
        setUser(userData);

        try {
          const profileResponse = await profileAPI.getProfiles();
          setProfiles(profileResponse.data.profiles || []);
          setUserProfile(profileResponse.data.profile || null);
          setActiveProfileId(profileResponse.data.active_profile_id || userData.active_profile_id || null);
        } catch (profileError) {
          console.error('Error loading profile:', profileError);
        }
        
        setCurrentView('scanner');
      } catch (error) {
        console.error('Token validation failed:', error);
        clearAuthStorage();
        setCurrentView('login');
      }
    } else {
      setCurrentView('login');
    }
  };

  const handleLogin = async (userData) => {
    setUser(userData);
    setActiveProfileId(userData.active_profile_id || null);

    if (userData.hasProfile) {
      try {
        const profileResponse = await profileAPI.getProfiles();
        setProfiles(profileResponse.data.profiles || []);
        setUserProfile(profileResponse.data.profile || null);
        setActiveProfileId(profileResponse.data.active_profile_id || userData.active_profile_id || null);
      } catch (profileError) {
        console.error('Error loading profiles after login:', profileError);
      }
    }

    setCurrentView(userData.hasProfile ? 'scanner' : 'profile');
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setProfiles([]);
    setActiveProfileId(null);
    setCurrentView('profile'); // New users always need to create profile
  };

  const handleLogout = () => {
    setUser(null);
    setUserProfile(null);
    setProfiles([]);
    setActiveProfileId(null);
    setAnalysisData(null);
    setCurrentView('login');
  };

  const handleProfileSaved = (profile, allProfiles = [], nextActiveProfileId = null) => {
    setUserProfile(profile);
    setProfiles(allProfiles);
    setActiveProfileId(nextActiveProfileId || profile?._id || null);
    setUser(prev => ({ ...prev, hasProfile: true, active_profile_id: nextActiveProfileId || profile?._id || null, profileCount: allProfiles.length || 1 }));
    setCurrentView('scanner');
  };

  const handleActiveProfileChanged = async (profileId) => {
    const response = await profileAPI.setActiveProfile(profileId);
    const nextProfiles = response.data.profiles || profiles;
    setProfiles(nextProfiles);
    setActiveProfileId(response.data.active_profile_id || profileId);
    const active = nextProfiles.find((profile) => profile._id === (response.data.active_profile_id || profileId)) || null;
    setUserProfile(active);
    setUser((prev) => ({ ...prev, active_profile_id: response.data.active_profile_id || profileId }));
  };

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data);
    if (data.step === 'confirmation') {
      setCurrentView('confirmation');
    } else if (data.step === 'results') {
      setCurrentView('results');
    }
  };

  const handleBackToScanner = () => {
    setAnalysisData(null);
    setCompareData(null);
    setCurrentView('scanner');
  };

  const handleNewAnalysis = () => {
    setAnalysisData(null);
    setCurrentView('scanner');
  };

  const handleViewScan = (report) => {
    setAnalysisData({ report });
    setCurrentView('results');
  };

  const handleCompareScans = (leftReport, rightReport) => {
    setCompareData({ leftReport, rightReport });
    setCurrentView('compare');
  };

  const switchToRegister = () => {
    setCurrentView('register');
  };

  const switchToLogin = () => {
    setCurrentView('login');
  };

  const goToProfile = () => {
    setCurrentView('profile');
  };

  const goToScanHistory = () => {
    setCurrentView('history');
  };

  const goToInsights = () => {
    setCurrentView('insights');
  };

  if (currentView === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading InnerVerse...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'login') {
    return (
      <Login 
        onLogin={handleLogin}
        switchToRegister={switchToRegister}
      />
    );
  }

  if (currentView === 'register') {
    return (
      <Register 
        onRegister={handleRegister}
        switchToLogin={switchToLogin}
      />
    );
  }

  if (currentView === 'profile') {
    return (
      <ProfileForm 
        onBack={user?.hasProfile ? handleBackToScanner : null}
        onProfileSaved={handleProfileSaved}
        existingProfile={userProfile}
        profiles={profiles}
        activeProfileId={activeProfileId}
        canManageFamily={Boolean((profiles.find((profile) => profile._id === activeProfileId) || userProfile)?.is_primary)}
      />
    );
  }

  if (currentView === 'scanner') {
    return (
      <Scanner 
        user={user}
        profiles={profiles}
        activeProfile={profiles.find((profile) => profile._id === activeProfileId) || userProfile}
        canManageFamily={Boolean((profiles.find((profile) => profile._id === activeProfileId) || userProfile)?.is_primary)}
        onLogout={handleLogout}
        onProfileEdit={goToProfile}
        onActiveProfileChange={handleActiveProfileChanged}
        onAnalysisComplete={handleAnalysisComplete}
        onViewHistory={goToScanHistory}
        onViewInsights={goToInsights}
      />
    );
  }

  if (currentView === 'history') {
    return (
      <ScanHistory
        onBack={handleBackToScanner}
        onViewScan={handleViewScan}
        onCompareScans={handleCompareScans}
        activeProfileId={activeProfileId}
        activeProfile={profiles.find((profile) => profile._id === activeProfileId) || userProfile}
      />
    );
  }

  if (currentView === 'insights') {
    return (
        <Insights
          onBack={handleBackToScanner}
          activeProfileId={activeProfileId}
          activeProfile={profiles.find((profile) => profile._id === activeProfileId) || userProfile}
        />
    );
  }

  if (currentView === 'confirmation' && analysisData) {
    return (
      <ConfirmationView 
        data={analysisData}
        onBack={handleBackToScanner}
        onAnalysisComplete={handleAnalysisComplete}
        activeProfileId={activeProfileId}
      />
    );
  }

  if (currentView === 'results' && analysisData) {
    return (
      <AnalysisReport 
        report={analysisData.report}
        onBack={handleBackToScanner}
        onNewAnalysis={handleNewAnalysis}
        activeProfileId={activeProfileId}
      />
    );
  }

  if (currentView === 'compare' && compareData) {
    return (
      <CompareProducts
        leftReport={compareData.leftReport}
        rightReport={compareData.rightReport}
        onBack={handleBackToScanner}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Something went wrong. Please refresh the page.</p>
      </div>
    </div>
  );
}

export default App;
