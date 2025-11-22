import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { CameraScanner } from './components/CameraScanner';
import { HistoryItem } from './components/HistoryItem';
import { Trophy, Star, Sparkles, Camera, Trash2, History, Medal, Award, Crown, Zap, LayoutGrid, Home as HomeIcon } from 'lucide-react';
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

  const totalStars = history.reduce((acc, curr) => acc + curr.stars, 0);
  
  // Header Star Animation Logic
  const prevStarsRef = useRef(totalStars);
  const starCountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (totalStars > prevStarsRef.current) {
      // Trigger confetti from star icon position
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
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-pink-100 via-purple-100 to-teal-50 font-tajawal">
      
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-3 py-4 shadow-md transition-all duration-300">
        <div className="relative flex items-center justify-between w-full">
          {/* Logo (Right in RTL) */}
          <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-2 rounded-full text-white shadow-md shrink-0 z-10">
            <Sparkles size={24} />
          </div>

          {/* Title (Absolute Center) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <h1 className="font-black text-pink-900 text-2xl sm:text-4xl leading-tight text-center drop-shadow-sm w-full px-14">
              مدرسة الشمال الابتدائية بنات
            </h1>
          </div>

          {/* Star Counter (Left in RTL) */}
          <div 
            ref={starCountRef}
            className="flex items-center gap-1 bg-white/80 px-3 py-1 rounded-full border border-yellow-200 shadow-sm transition-transform active:scale-95 shrink-0 z-10"
          >
            <Star className="text-yellow-500 fill-yellow-500 drop-shadow-sm" size={20} />
            <span className="font-bold text-yellow-800 text-xl">{totalStars}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto p-4 gap-6 pb-24">
        
        {appState === AppState.HOME && (
          <div className="flex flex-col items-center gap-6 py-2 min-h-full">
            
            {/* Hero Section */}
            <div className="relative w-full mt-2">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="relative bg-white/90 backdrop-blur-sm p-6 rounded-[2rem] shadow-xl flex flex-col items-center text-center gap-3 border-2 border-white ring-4 ring-pink-100/50 animate-float">
                <div className="relative">
                  <Trophy size={72} className="text-yellow-500 drop-shadow-md" />
                  <Star size={32} className="text-pink-400 absolute -top-2 -right-4 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-1">
                    أهلاً بمبدعات الشمال
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed font-medium">
                    وجهي الكاميرا نحو الطالبة أو العمل المميز<br/>للحصول على نجوم التميز
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => setAppState(AppState.CAMERA)}
              className="group relative w-full max-w-xs bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-6 px-8 rounded-2xl shadow-[0_10px_20px_rgba(219,39,119,0.3)] transform transition-all hover:scale-105 hover:shadow-[0_15px_25px_rgba(219,39,119,0.4)] active:scale-95 flex items-center justify-center gap-4 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <Camera size={36} className="group-hover:rotate-12 transition-transform relative z-10" />
              <span className="text-3xl relative z-10">بدء التعزيز</span>
            </button>

            {/* History Section */}
            {history.length > 0 && (
              <div className="w-full animate-pop mt-4">
                <div className="flex justify-between items-center mb-3 px-2">
                  <div className="flex items-center gap-2 text-pink-900 font-bold">
                    <History size={20} />
                    <h3>سجل التميز</h3>
                  </div>
                  <button 
                    onClick={handleClearHistory}
                    className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={14} />
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

            {/* School Info Footer */}
            <div className="w-full mt-auto pt-12 space-y-6 px-2">
              {/* Signatures Section */}
              <div className="flex justify-between items-end w-full">
                  {/* Academic Deputy (Right in RTL) */}
                  <div className="text-right border-r-4 border-purple-500 pr-3 py-2 bg-white/40 backdrop-blur-sm rounded-l-2xl pl-4 shadow-sm animate-fade-in transform hover:scale-105 transition-transform">
                      <p className="text-purple-900 text-xs font-bold mb-1">النائبة الأكاديمية</p>
                      <p className="text-purple-900 font-black text-sm sm:text-base">لولوة السادة</p>
                  </div>

                  {/* Principal (Left in RTL) */}
                  <div className="text-right border-l-4 border-pink-600 pl-3 py-2 bg-white/40 backdrop-blur-sm rounded-r-2xl pr-4 shadow-sm animate-fade-in delay-100 transform hover:scale-105 transition-transform">
                      <p className="text-pink-900 text-xs font-bold mb-1">مديرة المدرسة</p>
                      <p className="text-pink-900 font-black text-sm sm:text-base">مريم مبارك الحسيني</p>
                  </div>
              </div>

              {/* Vision & Credits (Center) */}
              <div className="text-center space-y-3 animate-fade-in delay-100">
                  <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-md border border-white/60 inline-block w-full transform hover:-translate-y-1 transition-transform">
                       <p className="text-pink-800 font-black text-base sm:text-lg flex items-center justify-center gap-3">
                          <Sparkles size={16} className="text-pink-500 animate-pulse"/>
                          الرؤية : متعلم ريادي تنمية مستدامة
                          <Sparkles size={16} className="text-pink-500 animate-pulse"/>
                       </p>
                  </div>
                  <div className="inline-block px-4 py-1 bg-pink-100/50 rounded-full">
                    <p className="text-pink-700 text-xs font-bold">
                         إعداد وتطوير/ إيمان محمود
                    </p>
                  </div>
              </div>
            </div>

          </div>
        )}

        {appState === AppState.ACHIEVEMENTS && (
          <div className="animate-fade-in py-4">
            <h2 className="text-2xl font-black text-pink-900 mb-6 flex items-center gap-2">
              <LayoutGrid className="text-pink-600" />
              الإنجازات والأوسمة
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {getBadges().map((badge) => (
                <div 
                  key={badge.id}
                  className={`relative p-4 rounded-2xl border flex flex-col items-center text-center transition-all duration-300 ${badge.unlocked ? 'bg-white border-white shadow-lg scale-100' : 'bg-white/40 border-white/20 grayscale opacity-70 scale-95'}`}
                >
                   {!badge.unlocked && (
                     <div className="absolute inset-0 bg-gray-100/50 rounded-2xl z-10 flex items-center justify-center backdrop-blur-[1px]">
                       <div className="bg-gray-800/10 p-2 rounded-full"><span className="text-xs font-bold text-gray-500">مغلق</span></div>
                     </div>
                   )}
                   <div className={`w-12 h-12 rounded-full ${badge.color} flex items-center justify-center shadow-md mb-3 ${badge.unlocked ? 'animate-float' : ''}`}>
                     {badge.icon}
                   </div>
                   <h3 className="font-bold text-gray-800">{badge.title}</h3>
                   <p className="text-xs text-gray-500 mt-1">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-white/50 pb-safe px-6 py-3 flex justify-around items-center z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setAppState(AppState.HOME)}
          className={`flex flex-col items-center gap-1 transition-all ${appState === AppState.HOME ? 'text-pink-600 -translate-y-2 scale-110' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-full ${appState === AppState.HOME ? 'bg-pink-100' : ''}`}>
            <HomeIcon size={24} />
          </div>
          <span className="text-[10px] font-bold">الرئيسية</span>
        </button>

        <div className="relative -top-8">
           <button 
             onClick={() => setAppState(AppState.CAMERA)}
             className="bg-gradient-to-tr from-pink-500 to-purple-600 text-white p-4 rounded-full shadow-lg shadow-pink-500/40 transform transition-transform active:scale-95 border-4 border-pink-50"
           >
             <Camera size={32} />
           </button>
        </div>

        <button 
          onClick={() => setAppState(AppState.ACHIEVEMENTS)}
          className={`flex flex-col items-center gap-1 transition-all ${appState === AppState.ACHIEVEMENTS ? 'text-pink-600 -translate-y-2 scale-110' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-full ${appState === AppState.ACHIEVEMENTS ? 'bg-pink-100' : ''}`}>
            <Award size={24} />
          </div>
          <span className="text-[10px] font-bold">إنجازاتي</span>
        </button>
      </nav>
      
      {/* Global Overlay for Camera State */}
      {appState === AppState.CAMERA && (
        <CameraScanner 
          onClose={() => setAppState(AppState.HOME)} 
          onReward={handleAddReward} 
        />
      )}

    </div>
  );
}