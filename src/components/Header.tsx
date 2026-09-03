import React from 'react';
import {
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Mic,
  Languages,
  Cpu,
  GraduationCap,
  Camera,
  Activity,
  History,
  Settings,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { EndpointCategory } from '../types';

interface HeaderProps {
  activeTab: EndpointCategory;
  setActiveTab: (tab: EndpointCategory) => void;
  isDark: boolean;
  toggleTheme: () => void;
  totalTokensSession: number;
  openSettings: () => void;
  openHistory: () => void;
  networkStatus: { ok: boolean; latencyMs: number; checking: boolean };
  recheckNetwork: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  toggleTheme,
  totalTokensSession,
  openSettings,
  openHistory,
  networkStatus,
  recheckNetwork,
}) => {
  const navTabs: { id: EndpointCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'text', label: 'Chat & Text', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'vision', label: 'Vision Studio', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'video', label: 'Video Lab', icon: <Video className="w-4 h-4" /> },
    { id: 'voice', label: 'Voice & Speech', icon: <Mic className="w-4 h-4" /> },
    { id: 'translate', label: 'Translate', icon: <Languages className="w-4 h-4" /> },
    { id: 'ml', label: 'Machine Learning', icon: <Cpu className="w-4 h-4" /> },
    { id: 'education', label: 'Tutor & Edu', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'camera', label: 'Live Camera', icon: <Camera className="w-4 h-4" /> },
    { id: 'metrics', label: 'Token Metrics', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md transition-colors">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Worker Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    Trill <span className="text-emerald-500 font-extrabold">AI</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/50">
                    v5.0 Ultimate
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:block">
                  Universal Multi-Modal Inference Suite
                </p>
              </div>
            </div>

            {/* Worker Live Ping Pill */}
            <div className="ml-2 hidden lg:flex items-center">
              <button
                onClick={recheckNetwork}
                disabled={networkStatus.checking}
                title="Click to ping worker"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80"
              >
                {networkStatus.checking ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                ) : networkStatus.ok ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span className="font-mono text-[11px]">
                  {networkStatus.checking
                    ? 'Pinging...'
                    : networkStatus.ok
                    ? `${networkStatus.latencyMs}ms`
                    : 'Offline'}
                </span>
              </button>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Token Quick Pill */}
            <button
              onClick={() => setActiveTab('metrics')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition border border-emerald-200 dark:border-emerald-800/60"
              title="View Token Dashboard"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="font-mono font-semibold">
                {totalTokensSession.toLocaleString()} <span className="font-normal opacity-80">tokens</span>
              </span>
            </button>

            {/* Local History Drawer Toggle */}
            <button
              onClick={openHistory}
              id="history-btn"
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Recent Prompts & History"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Application Settings Modal Toggle */}
            <button
              onClick={openSettings}
              id="settings-btn"
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Inference & Model Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              id="theme-toggle-btn"
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none border-t border-neutral-100 dark:border-neutral-800/80 pt-1">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                id={`nav-tab-${tab.id}`}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
