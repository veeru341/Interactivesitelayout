import React from 'react';
import { BuildingIcon } from '../icons';

interface LandingProps {
  onSwitchToLogin: () => void;
  onSwitchToSignup: () => void;
}

const Landing: React.FC<LandingProps> = ({ onSwitchToLogin, onSwitchToSignup }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto text-center">
        <header className="mb-12">
          <div className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 rounded-full p-4 mb-6">
            <BuildingIcon className="w-16 h-16 text-blue-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100 mb-4">
            Interactive Site Layout Planner
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Visualize, manage, and edit property layouts with ease. From large-scale sites to individual plots.
          </p>
        </header>
        
        <main className="space-y-4">
          <button
            onClick={onSwitchToLogin}
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-transform transform active:scale-95"
          >
            Login
          </button>
          <button
            onClick={onSwitchToSignup}
            className="w-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-offset-slate-900 transition-transform transform active:scale-95"
          >
            Sign Up
          </button>
        </main>
        
        <footer className="mt-16 text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} SitePlanner Inc. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
