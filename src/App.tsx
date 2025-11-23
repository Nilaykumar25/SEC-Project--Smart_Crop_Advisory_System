import { useState, useEffect } from 'react';
import LoginSignup from './components/LoginSignup';
import WelcomeHome from './components/WelcomeHome';
import CropPhaseSelection from './components/CropPhaseSelection';
import CropDetails from './components/CropDetails';
import HomePage from './components/HomePage';
import { supabase } from './lib/supabase';
import { getOrUpdateUserLocation } from './lib/user-location';
import { getOrUpdateSoilData } from './lib/soil-db';

type AppScreen = 'login' | 'welcome' | 'phase-selection' | 'crop-details' | 'home' | 'loading';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('loading');
  const [selectedPhase, setSelectedPhase] = useState<string>('growth'); // Default phase for existing crops
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [cropName, setCropName] = useState<string>('');
  const [plantingDate, setPlantingDate] = useState<string>('');

  // Check for existing session on mount
  useEffect(() => {
    checkSession();

    // Listen for auth state changes (but don't update location here to avoid duplicates)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // User is logged in
        if (currentScreen === 'login') {
          // Only navigate, location will be updated by checkSession
          setCurrentScreen('home');
        }
      } else {
        // User is logged out
        setCurrentScreen('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User has an active session, go to home
        setCurrentScreen('home');
        // Update location ONCE in background (don't block UI)
        updateLocationOnce();
      } else {
        // No session, show login
        setCurrentScreen('login');
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setCurrentScreen('login');
    }
  };

  // Track if location update was already called
  let locationUpdateCalled = false;

  const updateLocationOnce = async () => {
    // Prevent multiple calls
    if (locationUpdateCalled) return;
    locationUpdateCalled = true;

    try {
      // Update location first
      const location = await getOrUpdateUserLocation();
      
      // If location is available, fetch soil data
      if (location) {
        console.log('📍 Location available, fetching soil data...');
        await getOrUpdateSoilData();
      }
    } catch (error) {
      // Silently fail - don't block app
      console.error('Error updating location/soil data:', error);
    }
  };

  const handleLoginSuccess = () => {
    setCurrentScreen('welcome');
  };

  const handleNewCrop = () => {
    setCurrentScreen('phase-selection');
  };

  const handleContinueExisting = () => {
    // Skip phase selection and go straight to home with default phase
    setCurrentScreen('home');
  };

  const handlePhaseSelection = (phase: string) => {
    setSelectedPhase(phase);
    
    // If pre-planting, skip crop details and go straight to home
    if (phase === 'pre-planting') {
      setCurrentScreen('home');
    } else {
      // For all other phases, ask for crop details
      setCurrentScreen('crop-details');
    }
  };

  const handleCropDetailsSubmit = (name: string, date: string) => {
    setCropName(name);
    setPlantingDate(date);
    setCurrentScreen('home');
  };

  const handlePhaseChange = (phase: string) => {
    setSelectedPhase(phase);
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
  };

  const handleLogoClick = () => {
    setCurrentScreen('welcome');
  };

  const handleAddCrop = () => {
    setCurrentScreen('phase-selection');
  };

  // Show loading screen while checking session
  if (currentScreen === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {currentScreen === 'login' && (
        <LoginSignup onLoginSuccess={handleLoginSuccess} />
      )}
      {currentScreen === 'welcome' && (
        <WelcomeHome 
          onNewCrop={handleNewCrop}
          onContinueExisting={handleContinueExisting}
        />
      )}
      {currentScreen === 'phase-selection' && (
        <CropPhaseSelection onPhaseSelect={handlePhaseSelection} />
      )}
      {currentScreen === 'crop-details' && (
        <CropDetails 
          selectedPhase={selectedPhase}
          onSubmit={handleCropDetailsSubmit}
        />
      )}
      {currentScreen === 'home' && (
        <HomePage 
          selectedPhase={selectedPhase}
          selectedLanguage={selectedLanguage}
          onPhaseChange={handlePhaseChange}
          onLanguageChange={handleLanguageChange}
          onLogoClick={handleLogoClick}
          onAddCrop={handleAddCrop}
        />
      )}
    </div>
  );
}