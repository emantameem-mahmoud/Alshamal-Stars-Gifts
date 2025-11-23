
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { CameraScanner } from './components/CameraScanner';
import { HistoryItem } from './components/HistoryItem';
import { Trophy, Star, Sparkles, Camera, Trash2, History, Medal, Award, Crown, Zap, LayoutGrid, Home as HomeIcon, Download, Info, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

enum AppState {
  HOME,
  CAMERA,
  ACHIEVEMENTS
}

interface RewardHistory {
  id: string;
  message: string;
  stars: number;
  timestamp: Date;
}

interface Badge {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  unlocked: boolean;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const APP_VERSION = "2.2.0";
  
  // Initialize history from localStorage
  const [history, setHistory] = useState<RewardHistory[]>(() => {
    try {
      const saved = localStorage.getItem('shamal-rewards-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
    return [];
  });

  // Persist history changes
  useEffect(() => {
    localStorage.setItem('shamal-rewards-history', JSON.stringify(history));
  }, [history]);

  // PWA Install Prompt & Update Listener
  useEffect(() => {
    const installHandler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', installHandler);

    // Check if service worker is waiting to take control (update available)
    if ('serviceWorker' in navigator) {
       navigator.serviceWorker.ready.then(registration => {
         if (registration.waiting) {
           setUpdateAvailable(true);
         }
         registration.addEventListener('updatefound', () => {
           const newWorker = registration.installing;
           if (newWorker) {
             newWorker.addEventListener('statechange', () => {
               if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                 setUpdateAvailable(true);
               }
             });
           }
         });
       });
    }

    return () => window.removeEventListener('beforeinstallprompt', installHandler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const reloadPage = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.update());
      });
    }
    window.location.reload();
  };

  const totalStars = history.reduce((acc, curr) => acc + curr.stars, 0);
  
  // Header Star Animation Logic
  const prevStarsRef = useRef(totalStars);
  const starCountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (totalStars > prevStarsRef.current) {
      if (starCountRef.current) {
        const rect = starCountRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        
        confetti({
          origin: { x, y },
          particleCount: 40,
          spread: 60,
          colors: ['#FFD700', '#FFA500', '#FFFFFF'],
          disableForReducedMotion: true,
          zIndex: 100,
        });
      }
    }
    prevStarsRef.current = totalStars;
  }, [totalStars]);

  const handleAddReward = (reward: Omit<RewardHistory, 'id'>) => {
    const newReward = { ...reward, id: Date.now().toString() };
    setHistory(prev => [newReward, ...prev]);
  };

  const handleClearHistory = () => {
    if (window.confirm('هل أنت متأكدة من مسح جميع السجلات؟')) {
      setHistory([]);
    }
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('حذف هذا السجل؟')) {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleEditItem = (id: string, newMessage: string) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, message: newMessage } : item));
  };

  // --- Achievements Logic ---
  const getBadges = (): Badge[] => {
    const rewardCount = history.length;
    return [
      {
        id: 'first_step',
        title: 'البداية',
        desc: 'أول مكافأة تم تسجيلها',
        icon: <Star size={24} className="text-white" />,
        color: 'bg-blue-400',
        unlocked: rewardCount >= 1
      },
      {
        id: 'star_student',
        title: 'نجمة 10',
        desc: 'جمع 10 نجوم',
        icon: <Zap size={24} className="text-white" />,
        color: 'bg-yellow-400',
        unlocked: totalStars >= 10
      },
      {
        id: 'consistent',
        title: 'المثابرة',
        desc: '10 مكافآت مسجلة',
        icon: <Award size={24} className="text-white" />,
        color: 'bg-green-400',
        unlocked: rewardCount >= 10
      },
      {
        id: 'super_star',
        title: 'سوبر ستار',
        desc: 'جمع 50 نجمة',
        icon: <Medal size={24} className="text-white" />,
        color: 'bg-purple-400',
        unlocked: totalStars >= 50
      },
      {
        id: 'centurion',
        title: 'مئوية التميز',
        desc: 'جمع 100 نجمة',
        icon: <Crown size={24} className="text-white" />,
        color: 'bg-pink-500',
        unlocked: totalStars >= 100
      },
      {
        id: 'high_five',
        title: 'التميز التام',
        desc: 'الحصول على 5 نجوم دفعة واحدة',
        icon: <Trophy size={24} className="text-white" />,
        color: 'bg-orange-500',
        unlocked: history.some(h => h.stars === 5)
      }
    ];
  };

  return (
    <div className="h-[100dvh] w-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-pink-100 via-purple-100 to-teal-50 font-tajawal text-gray-800">
      
      {/* Update Notification Toast */}
      {updateAvailable && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-pop w-[90%] max-w-sm">
          <button 
            onClick={reloadPage}
            className="w-full bg-black/80 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between backdrop-blur-md border border-white/20"
          >
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-sm font-bold">تحديث جديد متوفر</span>
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">تحديث الآن</span>
          </button>
        </div>
      )}

      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 px-3 py-3 shadow-sm shrink-0">
        <div className="relative flex items-center justify-between w-full">
          {/* Logo */}
          <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-2 rounded-full text-white shadow-md shrink-0 z-10">
            <Sparkles size={20} />
          </div>

          {/* Title */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <h1 className="font-black text-pink-900 text-lg sm:text-xl leading-tight text-center w-full px-12 truncate">
              مدرسة الشمال الابتدائية
            </h1>
          </div>

          {/* Star Counter */}
          <div 
            ref={starCountRef}
            className="flex items-center gap-1 bg-white/80 px-3 py-1 rounded-full border border-yellow-200 shadow-sm shrink-0 z-10"
          >
            <Star className="text-yellow-500 fill-yellow-500 drop-shadow-sm" size={18} />
            <span className="font-bold text-yellow-800 text-lg">{totalStars}</span>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-md mx-auto p-4 pb-28 no-scrollbar scroll-smooth">
        
        {appState === AppState.HOME && (
          <div className="flex flex-col items-center gap-5 min-h-full">
            
            {/* Hero Section */}
            <div className="relative w-full mt-2 shrink-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="relative bg-white/80 backdrop-blur-sm p-5 rounded-[2rem] shadow-lg flex flex-col items-center text-center gap-2 border border-white ring-4 ring-pink-100/50 animate-float">
                <div className="relative">
                  <Trophy size={60} className="text-yellow-500 drop-shadow-md" />
                  <Star size={24} className="text-pink-400 absolute -top-2 -right-4 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-1">
                    أهلاً بمبدعات الشمال
                  </h2>
                  <p className="text-gray-500 text-xs font-medium">
                    وجهي الكاميرا نحو الطالبة للحصول على النجوم
                  </p>
                </div>
              </div>
            </div>

            {/* Install Button */}
            {showInstallBtn && (
              <button
                onClick={handleInstallClick}
                className="w-full max-w-xs bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 animate-pop hover:bg-blue-700 transition-colors shrink-0"
              >
                <Download size={20} />
                <span>تحميل التطبيق على الجهاز</span>
              </button>
            )}

            {/* Action Button */}
            <button
              onClick={() => setAppState(AppState.CAMERA)}
              className="group relative w-full max-w-xs bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-5 px-6 rounded-2xl shadow-xl shadow-pink-500/20 transform transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden shrink-0"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <Camera size={32} className="relative z-10" />
              <span className="text-2xl relative z-10">بدء التعزيز</span>
            </button>

            {/* History Section */}
            {history.length > 0 && (
              <div className="w-full animate-pop mt-2">
                <div className="flex justify-between items-center mb-3 px-2">
                  <div className="flex items-center gap-2 text-pink-900 font-bold text-sm">
                    <History size={16} />
                    <h3>سجل التميز</h3>
                  </div>
                  <button 
                    onClick={handleClearHistory}
                    className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    مسح الكل
                  </button>
                </div>
                
                <div className="flex flex-col gap-2">
                  {history.map((item) => (
                    <HistoryItem 
                      key={item.id} 
                      item={item} 
                      onDelete={handleDeleteItem} 
                      onEdit={handleEditItem}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Footer Information */}
            <div className="w-full mt-auto pt-8 space-y-6 px-1">
              {/* Signatures */}
              <div className="flex justify-between items-end w-full">
                  <div className="text-right border-r-2 border-pink-500 pr-3 py-1">
                      <p className="text-pink-900 text-[10px] font-bold">مديرة المدرسة</p>
                      <p className="text-pink-900 font-black text-xs">مريم الحسيني</p>
                  </div>
                  <div className="text-right border-l-2 border-purple-500 pl-3 py-1">
                      <p className="text-purple-900 text-[10px] font-bold">النائبة الأكاديمية</p>
                      <p className="text-purple-900 font-black text-xs">لولوة السادة</p>
                  </div>
              </div>

              {/* Credits */}
              <div className="text-center space-y-2 pb-4">
                  <div className="inline-block px-3 py-1 bg-white/50 rounded-full border border-white/60">
                       <p className="text-pink-800 font-bold text-xs flex items-center gap-1">
                          <Sparkles size={10} className="text-pink-500"/>
                          متعلم ريادي تنمية مستدامة
                       </p>
                  </div>
                  <div className="text-[10px] text-gray-400 flex flex-col items-center gap-1">
                     <span>الإصدار {APP_VERSION}</span>
                     <span>إعداد: إيمان محمود</span>
                  </div>
              </div>
            </div>

          </div>
        )}

        {appState === AppState.ACHIEVEMENTS && (
          <div className="animate-fade-in py-2">
            <h2 className="text-xl font-black text-pink-900 mb-4 flex items-center gap-2">
              <LayoutGrid className="text-pink-600" size={20} />
              الإنجازات والأوسمة
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              {getBadges().map((badge) => (
                <div 
                  key={badge.id}
                  className={`relative p-3 rounded-xl border flex flex-col items-center text-center transition-all ${badge.unlocked ? 'bg-white border-white shadow-sm' : 'bg-white/40 border-white/20 grayscale opacity-70'}`}
                >
                   {!badge.unlocked && (
                     <div className="absolute inset-0 bg-gray-100/30 rounded-xl z-10 flex items-center justify-center">
                       <div className="bg-gray-800/10 px-2 py-1 rounded text-[10px] font-bold text-gray-500">مغلق</div>
                     </div>
                   )}
                   <div className={`w-10 h-10 rounded-full ${badge.color} flex items-center justify-center shadow-inner mb-2 ${badge.unlocked ? 'animate-float' : ''}`}>
                     {badge.icon}
                   </div>
                   <h3 className="font-bold text-gray-800 text-sm">{badge.title}</h3>
                   <p className="text-[10px] text-gray-500 mt-0.5">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-white/60 px-6 pt-2 pb-safe flex justify-around items-end z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] h-[85px]">
        <button 
          onClick={() => setAppState(AppState.HOME)}
          className={`flex flex-col items-center gap-1 pb-4 transition-all ${appState === AppState.HOME ? 'text-pink-600' : 'text-gray-400'}`}
        >
          <HomeIcon size={24} strokeWidth={appState === AppState.HOME ? 2.5 : 2} />
          <span className="text-[10px] font-bold">الرئيسية</span>
        </button>

        <div className="relative -top-6">
           <button 
             onClick={() => setAppState(AppState.CAMERA)}
             className="bg-gradient-to-tr from-pink-500 to-purple-600 text-white w-16 h-16 rounded-full shadow-lg shadow-pink-500/40 flex items-center justify-center transform transition-transform active:scale-95 border-4 border-white"
           >
             <Camera size={28} />
           </button>
        </div>

        <button 
          onClick={() => setAppState(AppState.ACHIEVEMENTS)}
          className={`flex flex-col items-center gap-1 pb-4 transition-all ${appState === AppState.ACHIEVEMENTS ? 'text-pink-600' : 'text-gray-400'}`}
        >
          <Award size={24} strokeWidth={appState === AppState.ACHIEVEMENTS ? 2.5 : 2} />
          <span className="text-[10px] font-bold">إنجازاتي</span>
        </button>
      </nav>
      
      {/* Global Overlay for Camera State (Fullscreen) */}
      {appState === AppState.CAMERA && (
        <div className="fixed inset-0 z-[60] bg-black">
          <CameraScanner 
            onClose={() => setAppState(AppState.HOME)} 
            onReward={handleAddReward} 
          />
        </div>
      )}

    </div>
  );
}