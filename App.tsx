
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserX, 
  RefreshCcw, 
  Download, 
  Upload,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Globe,
  Instagram
} from 'lucide-react';
import { InstagramUser, ScanStats, Config } from './types';
import * as instaService from './services/instagramService';
import UserRow from './components/UserRow';

// Hata düzeltmesi: Chrome eklenti API'sini TypeScript'e tanıtıyoruz
declare const chrome: any;

const App: React.FC = () => {
  const [config, setConfig] = useState<Config>({
    userId: '',
    csrfToken: '',
    delayMs: 1500,
  });

  const [stats, setStats] = useState<ScanStats>({
    totalFollowed: 0,
    processedCount: 0,
    nonFollowersCount: 0,
    progress: 0,
    status: 'idle',
  });
  
  const [nonFollowers, setNonFollowers] = useState<InstagramUser[]>([]);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with background storage
  useEffect(() => {
    const isChromeAvailable = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
    
    const syncWithStorage = async () => {
      if (!isChromeAvailable) return;
      
      const data = await chrome.storage.local.get(['currentStats', 'currentNonFollowers', 'lastError', 'isDownloaded']);
      if (data.currentStats) setStats(data.currentStats);
      if (data.currentNonFollowers) setNonFollowers(data.currentNonFollowers);
      if (data.lastError && data.currentStats?.status === 'error') setError(data.lastError);
      if (data.isDownloaded !== undefined) setIsDownloaded(data.isDownloaded);
    };

    syncWithStorage();

    if (!isChromeAvailable || !chrome.storage.onChanged) return;

    const listener = (changes: any) => {
      if (changes.currentStats) setStats(changes.currentStats.newValue);
      if (changes.currentNonFollowers) setNonFollowers(changes.currentNonFollowers.newValue);
      if (changes.lastError) setError(changes.lastError.newValue);
      if (changes.isDownloaded) setIsDownloaded(changes.isDownloaded.newValue);
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Auto-download only on completed SCAN (not import) and only if not downloaded yet
  useEffect(() => {
    const shouldDownload = 
      stats.status === 'completed' && 
      stats.source === 'scan' && 
      nonFollowers.length > 0 && 
      !isDownloaded;

    if (shouldDownload) {
      exportToJson();
      // Persist the download state so reopening the popup doesn't trigger it again
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ isDownloaded: true });
      }
      setIsDownloaded(true);
    }
  }, [stats.status, stats.source, nonFollowers.length, isDownloaded]);

  useEffect(() => {
    const detectSession = async () => {
      try {
        const ds_user_id = await instaService.getCookie('ds_user_id');
        const csrftoken = await instaService.getCookie('csrftoken');

        if (ds_user_id && csrftoken) {
          setConfig(prev => ({ ...prev, userId: ds_user_id, csrfToken: csrftoken }));
          setIsReady(true);
        } else {
          setError("Instagram oturumu bulunamadı. Lütfen giriş yapın.");
        }
      } catch (err) {
        setError("Çerez erişim hatası. İzinleri kontrol edin.");
      }
    };
    detectSession();
  }, []);

  const handleStartScan = () => {
    if (!config.userId || !config.csrfToken) {
      setError("Bağlantı hatası. Sayfayı yenileyip tekrar deneyin.");
      return;
    }
    setError(null);
    
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'START_SCAN', config });
    } else {
      setError("Eklenti API'si ulaşılamaz durumda. Lütfen eklentiyi yükleyin.");
    }
  };

  const handleStopScan = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'STOP_SCAN' });
    }
  };

  const exportToJson = () => {
    if (nonFollowers.length === 0) return;
    const dataStr = JSON.stringify({
      scanDate: new Date().toISOString(),
      userId: config.userId,
      count: nonFollowers.length,
      users: nonFollowers
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const exportFileDefaultName = `instatrack_results_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    URL.revokeObjectURL(url);
  };

  const importFromJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.users && Array.isArray(json.users)) {
          const importedStats: ScanStats = {
            status: 'completed',
            source: 'import',
            nonFollowersCount: json.users.length,
            processedCount: json.users.length,
            totalFollowed: json.users.length,
            progress: 100
          };
          
          setNonFollowers(json.users);
          setStats(importedStats);
          setError(null);
          
          // Save to storage as well
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({
              currentStats: importedStats,
              currentNonFollowers: json.users,
              isDownloaded: true // Don't auto-download imported data
            });
          }
        }
      } catch (err) {
        setError("Dosya okuma hatası. Geçerli bir JSON dosyası seçin.");
      }
    };
    reader.readAsText(file);
  };

  const isScanning = stats.status === 'scanning';

  return (
    <div className="w-[450px] min-h-[600px] bg-slate-950 flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[30%] bg-pink-600/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full" />

      <header className="px-6 py-5 border-b border-slate-800/60 glass sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center p-0.5 shadow-xl shadow-pink-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <img src="/icon.png" alt="InstaTrack" className="w-7 h-7 object-contain" onError={(e) => {
                // Fallback to lucide icon if file not found
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-instagram text-white"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>';
              }} />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight leading-none">InstaTrack <span className="text-pink-500">Pro</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} /> 
              {isScanning ? 'Tarama Arka Planda Sürüyor' : 'Eklenti Hazır'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {nonFollowers.length > 0 && (
            <button 
              onClick={exportToJson}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700/50"
              title="JSON Dışa Aktar"
            >
              <Download size={18} />
            </button>
          )}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700/50"
            title="JSON İçe Aktar"
          >
            <Upload size={18} />
          </button>
          <input type="file" ref={fileInputRef} onChange={importFromJson} accept=".json" className="hidden" />
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar relative z-10">
        <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${isReady ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              <Globe size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter leading-none">Bağlantı</p>
              <p className="text-xs font-semibold text-slate-200 mt-1">{isReady ? `Hesap: ${config.userId}` : 'Giriş Bekleniyor...'}</p>
            </div>
          </div>
          {isReady && <CheckCircle2 size={16} className="text-emerald-500" />}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-xs leading-relaxed font-medium">{error}</p>
          </div>
        )}

        {isReady && (
          <div className="flex flex-col gap-4">
            {!isScanning ? (
              <button 
                onClick={handleStartScan}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 active:scale-[0.98]"
              >
                <RefreshCcw size={18} />
                {stats.status === 'completed' ? 'Tekrar Tara' : 'Taramayı Başlat'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Tarama Devam Ediyor</p>
                    <p className="text-lg font-black text-white">%{stats.progress}</p>
                  </div>
                  <button onClick={handleStopScan} className="px-4 py-1.5 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">Durdur</button>
                </div>
                <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50 p-0.5">
                  <div className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-instagram-blue via-instagram-pink to-instagram-orange" style={{ width: `${stats.progress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="glass p-4 rounded-2xl border-l-4 border-l-blue-500/50">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Kontrol Edilen</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-white">{stats.processedCount}</span>
              <span className="text-[10px] text-slate-600">/ {stats.totalFollowed || '?'}</span>
            </div>
          </div>
          <div className="glass p-4 rounded-2xl border-l-4 border-l-pink-500/50">
            <p className="text-[10px] text-pink-500 font-bold uppercase tracking-widest">Geri Takip Yok</p>
            <div className="mt-1">
              <span className="text-2xl font-black text-white">{stats.nonFollowersCount}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 min-h-[300px]">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sonuç Listesi</h3>
            {nonFollowers.length > 0 && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-bold">{nonFollowers.length} Kişi</span>}
          </div>
          
          <div className="flex-1 space-y-2.5 pb-20">
            {nonFollowers.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-center opacity-30">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800"><UserX size={32} /></div>
                <p className="text-sm font-medium">Henüz liste boş</p>
                <p className="text-[10px] mt-1 max-w-[200px]">Taramayı başlatın veya bir JSON dosyası yükleyin.</p>
              </div>
            ) : (
              nonFollowers.map((user, idx) => (
                <div key={user.id} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}>
                  <UserRow user={user} />
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-slate-800/60 glass bg-slate-950/80">
        <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
          <ShieldAlert size={16} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-amber-200/60 leading-tight">
            Tarama arka planda devam eder, popup'ı <span className="text-amber-400 font-bold">kapatabilirsiniz</span>. İşlem Instagram limitlerine uygun yavaşlıkta yapılır.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
