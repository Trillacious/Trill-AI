import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TokenDashboard } from './components/TokenDashboard';
import { SettingsModal } from './components/SettingsModal';
import { HistoryDrawer } from './components/HistoryDrawer';

// Tabs
import { TextTab } from './components/tabs/TextTab';
import { VisionTab } from './components/tabs/VisionTab';
import { VideoTab } from './components/tabs/VideoTab';
import { VoiceTab } from './components/tabs/VoiceTab';
import { TranslateTab } from './components/tabs/TranslateTab';
import { MLTab } from './components/tabs/MLTab';
import { EducationTab } from './components/tabs/EducationTab';

import { AppSettings, HistoryItem, AggregatedMetrics, TokenUsageRecord } from './types';
import { DEFAULT_WORKER_URL } from './constants/models';
import { DEFAULT_APP_SETTINGS } from './constants/parameters';
import { getStoredHistory } from './utils/history';
import { getAggregatedMetrics, getStoredTokenRecords, clearTokenMetrics } from './utils/metrics';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('text');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('trill_ai_settings');
    if (saved) {
      try {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_APP_SETTINGS;
      }
    }
    return DEFAULT_APP_SETTINGS;
  });

  // History & Metrics
  const [history, setHistory] = useState<HistoryItem[]>(() => getStoredHistory());
  const [records, setRecords] = useState<TokenUsageRecord[]>(() => getStoredTokenRecords());
  const [metrics, setMetrics] = useState<AggregatedMetrics>(() => getAggregatedMetrics());

  // Prompt restoration from history drawer
  const [prefilledPrompt, setPrefilledPrompt] = useState<string | undefined>(undefined);

  // Sync settings
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('trill_ai_settings', JSON.stringify(newSettings));
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_APP_SETTINGS);
    localStorage.removeItem('trill_ai_settings');
  };

  // Poll / listen to storage and custom events for history and metrics
  useEffect(() => {
    const syncData = () => {
      setHistory(getStoredHistory());
      setRecords(getStoredTokenRecords());
      setMetrics(getAggregatedMetrics());
    };

    window.addEventListener('storage', syncData);
    window.addEventListener('trill_metrics_updated', syncData);
    const interval = setInterval(syncData, 2000);

    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('trill_metrics_updated', syncData);
      clearInterval(interval);
    };
  }, []);

  const handleRestoreItem = (item: HistoryItem) => {
    // Switch to category tab
    const cat = item.category as string;
    if (cat === 'text' || cat === 'reason') {
      setActiveTab('text');
    } else if (cat === 'vision') {
      setActiveTab('vision');
    } else if (cat === 'video') {
      setActiveTab('video');
    } else if (cat === 'voice') {
      setActiveTab('voice');
    } else if (cat === 'translate') {
      setActiveTab('translate');
    } else if (cat === 'ml') {
      setActiveTab('ml');
    } else if (cat === 'education') {
      setActiveTab('education');
    }

    setPrefilledPrompt(item.prompt);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        workerUrl={settings.baseUrl}
      />

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'text' && (
          <TextTab
            settings={settings}
            prefillPrompt={prefilledPrompt}
            onPreFillUsed={() => setPrefilledPrompt(undefined)}
          />
        )}

        {activeTab === 'vision' && <VisionTab settings={settings} />}

        {activeTab === 'video' && <VideoTab settings={settings} />}

        {activeTab === 'voice' && <VoiceTab settings={settings} />}

        {activeTab === 'translate' && <TranslateTab settings={settings} />}

        {activeTab === 'ml' && <MLTab settings={settings} />}

        {activeTab === 'education' && <EducationTab settings={settings} />}

        {activeTab === 'metrics' && (
          <TokenDashboard
            metrics={metrics}
            records={records}
            onRefresh={() => {
              setRecords(getStoredTokenRecords());
              setMetrics(getAggregatedMetrics());
            }}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onRestoreItem={handleRestoreItem}
      />
    </div>
  );
};

export default App;
