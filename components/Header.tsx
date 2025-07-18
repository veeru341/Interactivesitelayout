import React from 'react';
import { Role } from '../types';
import { BuildingIcon, LogoutIcon } from './icons';

interface HeaderProps {
  role: Role;
  onRoleChange: (role: Role) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ role, onRoleChange, onLogout }) => {
  return (
    <header className="flex-shrink-0 bg-white dark:bg-slate-900/70 backdrop-blur-md shadow-md z-10 p-4 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        <div className="flex items-center space-x-3">
          <BuildingIcon className="w-8 h-8 text-blue-500" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Interactive Site Layout Planner
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            View Mode:
          </span>
          <div className="flex items-center space-x-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-full">
            <button
              onClick={() => onRoleChange(Role.Client)}
              className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors duration-200 ${
                role === Role.Client ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow' : 'text-slate-500 dark:text-slate-300'
              }`}
            >
              Client
            </button>
            <button
              onClick={() => onRoleChange(Role.Admin)}
              className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors duration-200 ${
                role === Role.Admin ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow' : 'text-slate-500 dark:text-slate-300'
              }`}
            >
              Admin
            </button>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <LogoutIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
