import React, { useState, useEffect } from 'react';
import Landing from './components/auth/Landing';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import PlannerApp from './components/PlannerApp';

type View = 'landing' | 'login' | 'signup';

function App(): React.ReactNode {
  // Check for a saved auth state in localStorage to persist login
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isAuthenticated') === 'true';
    } catch {
      return false;
    }
  });
  
  const [view, setView] = useState<View>('landing');

  useEffect(() => {
    try {
      localStorage.setItem('isAuthenticated', String(isAuthenticated));
    } catch (error) {
      console.error("Failed to save auth state to localStorage", error);
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleSignupSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('landing'); // Go back to landing page on logout
  };

  if (isAuthenticated) {
    return <PlannerApp onLogout={handleLogout} />;
  }

  switch (view) {
    case 'login':
      return <Login onLoginSuccess={handleLoginSuccess} onSwitchToSignup={() => setView('signup')} />;
    case 'signup':
      return <Signup onSignupSuccess={handleSignupSuccess} onSwitchToLogin={() => setView('login')} />;
    default:
      return <Landing onSwitchToLogin={() => setView('login')} onSwitchToSignup={() => setView('signup')} />;
  }
}

export default App;
