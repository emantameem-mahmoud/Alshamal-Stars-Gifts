
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, SwitchCamera, AlertCircle, Sparkles, Settings2, Star, Zap, Wand2, Crown, Cat, Flower2, Glasses, Rabbit, Brain, Rocket, Heart, Sliders, Timer, Smile, Eye, Sun, Feather, Rainbow } from 'lucide-react';
import { analyzeStudentImage } from '../services/geminiService';
import { AnalysisStatus, RewardResponse, GradeLevel, TaskType } from '../types';
import { RewardCard } from './RewardCard';

interface CameraScannerProps {
  onClose: () => void;
  onReward: (reward: { message: string; stars: number; timestamp: Date }) => void;
}

// --- Audio Utilities (Shared Singleton) ---
let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(console.error);
  }
  return sharedAudioCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 0.1) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const start = ctx.currentTime + startTime;
    osc.start(start);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.stop(start + duration);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

// Polyphonic chord player
const playChord = (freqs: number[], type: OscillatorType, duration: number, stagger: number = 0.05) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const gain = ctx.createGain();
    gain.gain.value = 0.2 / freqs.length; 
    gain.connect(ctx.destination);

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f;
      osc.connect(gain);
      const start = ctx.currentTime + (i * stagger);
      osc.start(start);
      osc.stop(start + duration);
    });

    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration + (freqs.length * stagger));
  } catch (e) { console.error(e); }
};

const playCaptureSound = () => {
  playTone(800, 'sine', 0.1);
  setTimeout(() => playTone(1200, 'triangle', 0.1), 50);
};

const playCountdownTick = () => {
  playTone(600, 'sine', 0.05);
};

const playErrorSound = () => {
  playTone(150, 'sawtooth', 0.4);
};

const playDetectSound = () => {
  playChord([523.25, 659.25, 783.99], 'sine', 0.4);
};

// --- Distinct Filter Sounds ---
const playFilterSound = (filterId: FilterType) => {
  try {
    if (navigator.vibrate) navigator.vibrate(50); // Haptic tick
    
    switch (filterId) {
      case 'cat':
        playTone(800, 'sine', 0.3, 0, 0.1);
        setTimeout(() => playTone(600, 'sine', 0.4, 0, 0.1), 100);
        break;
      case 'bunny':
        {
           const ctx = getAudioContext();
           if (ctx) {
               const osc = ctx.createOscillator();
               const gain = ctx.createGain();
               osc.frequency.setValueAtTime(200, ctx.currentTime);
               osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
               gain.gain.setValueAtTime(0.1, ctx.currentTime);
               gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
               osc.connect(gain);
               gain.connect(ctx.destination);
               osc.start();
               osc.stop(ctx.currentTime + 0.2);
           }
        }
        break;
      case 'princess':
      case 'butterfly':
      case 'flowers':
        playChord([1046.5, 1318.5, 1568.0, 2093.0], 'sine', 0.3, 0.03);
        break;
      case 'hero':
        playChord([261.63, 329.63, 392.00], 'square', 0.3, 0);
        break;
      case 'bee':
        playTone(180, 'sawtooth', 0.4, 0, 0.15);
        setTimeout(() => playTone(220, 'sawtooth', 0.3, 0, 0.15), 150);
        break;
      case 'galaxy':
      case 'smart':
        playChord([440, 445, 880], 'sawtooth', 0.5, 0.1);
        break;
      case 'eyes':
        playTone(300, 'triangle', 0.1);
        setTimeout(() => playTone(450, 'triangle', 0.2), 100);
        break;
      case 'sun':
        playChord([329.63, 415.30, 493.88, 659.25], 'sine', 0.8, 0.1); // Warm E Major
        break;
      case 'wings':
        playChord([523.25, 783.99, 1046.50, 1567.98], 'sine', 0.8, 0.2); // Ethereal C Major
        break;
      case 'rainbow':
        playChord([523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77], 'sine', 0.2, 0.05); // C Major scale run
        break;
      default:
        playTone(400 + Math.random() * 200, 'sine', 0.1);
    }
  } catch (e) {}
};

// --- Filter Definitions ---
type FilterType = 'none' | 'cat' | 'bunny' | 'princess' | 'butterfly' | 'flowers' | 'glasses' | 'smart' | 'bee' | 'hero' | 'galaxy' | 'love' | 'eyes' | 'sun' | 'wings' | 'rainbow';

const FILTERS: { id: FilterType; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'none', name: 'بدون', icon: <X size={14} />, color: 'bg-gray-600' },
  { id: 'rainbow', name: 'قوس قزح', icon: <Rainbow size={14} />, color: 'bg-indigo-400' },
  { id: 'wings', name: 'ملاك', icon: <Feather size={14} />, color: 'bg-cyan-400' },
  { id: 'sun', name: 'شمس', icon: <Sun size={14} />, color: 'bg-yellow-500' },
  { id: 'princess', name: 'أميرة', icon: <Crown size={14} />, color: 'bg-pink-600' },
  { id: 'cat', name: 'قطة', icon: <Cat size={14} />, color: 'bg-orange-500' },
  { id: 'bunny', name: 'أرنب', icon: <Rabbit size={14} />, color: 'bg-pink-400' },
  { id: 'butterfly', name: 'فراشة', icon: <Flower2 size={14} />, color: 'bg-purple-500' },
  { id: 'love', name: 'قلوب', icon: <Heart size={14} />, color: 'bg-red-500' },
  { id: 'glasses', name: 'نظارة', icon: <Glasses size={14} />, color: 'bg-blue-500' },
  { id: 'eyes', name: 'عيون', icon: <Eye size={14} />, color: 'bg-cyan-500' },
  { id: 'smart', name: 'عبقرية', icon: <Brain size={14} />, color: 'bg-indigo-500' },
  { id: 'galaxy', name: 'فضاء', icon: <Rocket size={14} />, color: 'bg-violet-600' },
  { id: 'flowers', name: 'زهور', icon: <Flower2 size={14} />, color: 'bg-green-500' },
  { id: 'bee', name: 'نحلة', icon: <Sparkles size={14} />, color: 'bg-yellow-500' },
  { id: 'hero', name: 'بطلة', icon: <Zap size={14} />, color: 'bg-red-500' },
];

// Enhanced Face Guide
const FaceGuide = () => (
  <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 pointer-events-none flex flex-col items-center justify-center z-10 opacity-50 transition-opacity duration-500">
      {/* Dashed Oval */}
      <div className="w-full h-full border-4 border-white/40 rounded-[48%] border-dashed relative shadow-[0_0_15px_rgba(0,0,0,0.2)]">
         {/* Crosshairs */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-white/60"></div>
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-white/60"></div>
         <div className="absolute top-1/2 left-0 -translate-y-1/2 w-4 h-0.5 bg-white/60"></div>
         <div className="absolute top-1/2 right-0 -translate-y-1/2 w-4 h-0.5 bg-white/60"></div>
         
         {/* Eyes Guide */}
         <div className="absolute top-[35%] left-[25%] w-8 h-1 bg-white/20 rounded-full"></div>
         <div className="absolute top-[35%] right-[25%] w-8 h-1 bg-white/20 rounded-full"></div>

         {/* Mouth Guide */}
         <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 w-12 h-4 border-b-2 border-white/20 rounded-b-full"></div>
      </div>
      
      <div className="absolute -bottom-10 text-xs text-white font-bold bg-black/30 px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow-lg">
         <Smile size={12} />
         ضعي الوجه هنا
      </div>
  </div>
);

export const CameraScanner: React.FC<CameraScannerProps> = ({ onClose, onReward }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [rewardData, setRewardData] = useState<RewardResponse | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flash, setFlash] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Filter State
  const [activeFilter, setActiveFilter] = useState<FilterType>('none');
  const [showFilters, setShowFilters] = useState(false);
  const [filterOpacity, setFilterOpacity] = useState(0.9);

  // Countdown State
  const [countdown, setCountdown] = useState<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Low Light Detection
  const [isLowLight, setIsLowLight] = useState(false);

  // Settings
  const [grade, setGrade] = useState<GradeLevel>('1-3');
  const [taskType, setTaskType] = useState<TaskType>('general');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [starRange, setStarRange] = useState<{min: number, max: number}>({ min: 2, max: 4 });
  const [showSettings, setShowSettings] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Ensure AudioContext is active on mount
  useEffect(() => {
    const triggerAudio = () => getAudioContext();
    window.addEventListener('click', triggerAudio, { once: true });
    window.addEventListener('touchstart', triggerAudio, { once: true });
    return () => {
      window.removeEventListener('click', triggerAudio);
      window.removeEventListener('touchstart', triggerAudio);
    };
  }, []);

  // Update star range based on difficulty
  useEffect(() => {
    switch (difficulty) {
      case 'easy': setStarRange({ min: 1, max: 2 }); break;
      case 'medium': setStarRange({ min: 2, max: 4 }); break;
      case 'hard': setStarRange({ min: 4, max: 5 }); break;
    }
  }, [difficulty]);

  // Low Light Detection Loop
  useEffect(() => {
    const checkLighting = () => {
      if (videoRef.current && videoRef.current.readyState === 4 && !capturedImage && isMounted.current) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = 64; // Small size for performance
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 64, 64);
          const imageData = ctx.getImageData(0, 0, 64, 64);
          const data = imageData.data;
          let totalBrightness = 0;
          for (let i = 0; i < data.length; i += 4) {
            totalBrightness += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          }
          const avgBrightness = totalBrightness / (data.length / 4);
          if (isMounted.current) setIsLowLight(avgBrightness < 60);
        }
      }
    };
    const interval = setInterval(checkLighting, 1000);
    return () => clearInterval(interval);
  }, [capturedImage]);

  // Ambient Sound Effect for specific filters
  useEffect(() => {
    let osc: OscillatorNode | null = null;
    let gain: GainNode | null = null;

    if (activeFilter === 'galaxy' && !capturedImage) {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        osc = ctx.createOscillator();
        gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 100;
        gain.gain.value = 0.02;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
      } catch(e) { console.error("Ambient sound failed", e); }
    }

    return () => {
      if (osc && gain && sharedAudioCtx) {
        try {
          gain.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + 0.1);
          osc.stop(sharedAudioCtx.currentTime + 0.2);
          setTimeout(() => { osc?.disconnect(); gain?.disconnect(); }, 250);
        } catch(e) {}
      }
    };
  }, [activeFilter, capturedImage]);

  // Robust Camera Initialization
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      if (capturedImage) return;

      setStatus(AnalysisStatus.IDLE);
      setErrorMsg("");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted.current) {
          setErrorMsg("المتصفح لا يدعم تشغيل الكاميرا.");
          setStatus(AnalysisStatus.ERROR);
        }
        return;
      }

      try {
        if (videoRef.current && videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false
        });

        if (!isMounted.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        currentStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playError) {
            console.error("Video play failed:", playError);
          }
        }
      } catch (err: any) {
        console.error("Camera Error:", err);
        if (isMounted.current) {
          setStatus(AnalysisStatus.ERROR);
          setErrorMsg("تعذر الوصول للكاميرا. تأكدي من الإعدادات.");
        }
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, capturedImage]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    playCaptureSound();
    if (navigator.vibrate) navigator.vibrate(100);

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    setStatus(AnalysisStatus.ANALYZING);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0) return;

    // --- HIGH QUALITY CAPTURE: 1080px ---
    const MAX_DIMENSION = 1080;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
    }

    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // High quality (0.8) for better visuals
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(base64Image);

      try {
        const result = await analyzeStudentImage(base64Image, grade, taskType, starRange);
        
        if (!isMounted.current) return;

        if (result.detected) {
          let effectiveStars = result.stars;
          if (effectiveStars < starRange.min) effectiveStars = starRange.min;
          if (effectiveStars > starRange.max) effectiveStars = starRange.max;

          setRewardData({ ...result, stars: effectiveStars });
          
          setStatus(AnalysisStatus.DETECTED); 
          playDetectSound();
          
          if (navigator.vibrate) navigator.vibrate([50, 50, 200]);

          setTimeout(() => {
             if (isMounted.current) setStatus(prev => prev === AnalysisStatus.DETECTED ? AnalysisStatus.SUCCESS : prev);
          }, 1500);
        } else {
          // Soft failure
          playErrorSound();
          setStatus(AnalysisStatus.ERROR);
          setErrorMsg(result.message || "لم يتم اكتشاف طالبة أو عمل بوضوح.");
        }
      } catch (e) {
        if (isMounted.current) {
          console.error(e);
          playErrorSound();
          setStatus(AnalysisStatus.ERROR);
          setErrorMsg("خطأ في النظام، يرجى المحاولة مرة أخرى");
        }
      }
    }
  }, [facingMode, grade, taskType, starRange]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      playCountdownTick();
      const timer = setTimeout(() => setCountdown(c => c! - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleCapture();
      setCountdown(null);
    }
  }, [countdown, handleCapture]);

  const handlePressStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setCountdown(3);
      if (navigator.vibrate) navigator.vibrate(50);
      longPressTimerRef.current = null;
    }, 600);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      if (countdown === null) {
        handleCapture();
      }
    }
  };

  const handleConfirmReward = (finalStars: number, finalMessage: string) => {
    if (rewardData) {
      onReward({
        message: finalMessage,
        stars: finalStars,
        timestamp: new Date()
      });
      resetScanner();
    }
  };

  const resetScanner = () => {
    setRewardData(null);
    setCapturedImage(null);
    setStatus(AnalysisStatus.IDLE);
    setErrorMsg("");
  };

  const handleFilterSelect = (id: FilterType) => {
    setActiveFilter(id);
    if (id !== 'none') {
      playFilterSound(id);
    }
  };

  const getBoundingBoxStyle = () => {
    if (!rewardData?.boundingBox) return {};
    const [ymin, xmin, ymax, xmax] = rewardData.boundingBox;
    return {
      top: `${ymin / 10}%`,
      left: `${xmin / 10}%`,
      height: `${(ymax - ymin) / 10}%`,
      width: `${(xmax - xmin) / 10}%`,
    };
  };

  // --- AR Filter Rendering ---
  const renderFilterOverlay = () => {
    if (activeFilter === 'none' || capturedImage) return null;

    const opacityStyle = { opacity: filterOpacity };

    return (
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden" style={opacityStyle}>
        
        {activeFilter === 'sun' && (
          <>
            <FaceGuide />
            {/* Sunburst Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] opacity-60 animate-spin-slow duration-[30s]">
               <svg viewBox="0 0 200 200" className="w-full h-full text-yellow-300/20 fill-current">
                  {Array.from({length: 12}).map((_, i) => (
                    <path key={i} d="M100 100 L90 0 L110 0 Z" transform={`rotate(${i * 30} 100 100)`} />
                  ))}
               </svg>
            </div>
            {/* Warm Glow Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-orange-400/20 via-transparent to-yellow-200/10 mix-blend-overlay"></div>
            
            {/* Lens Flares */}
            <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-yellow-100 rounded-full blur-[60px] opacity-40 animate-pulse-slow"></div>
            <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-orange-300 rounded-full blur-[50px] opacity-30 animate-pulse-slow delay-700"></div>
            
            <div className="absolute bottom-24 w-full text-center">
               <span className="bg-yellow-400/90 text-yellow-900 px-6 py-2 rounded-full font-black text-xl shadow-xl border-2 border-white/50">إشراقة الصباح!</span>
            </div>
          </>
        )}

        {activeFilter === 'rainbow' && (
          <>
            <FaceGuide />
            {/* Rainbow Arc */}
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[140%] h-[50vh] opacity-70 pointer-events-none z-0 animate-pulse-slow">
              <svg viewBox="0 0 300 150" className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                <defs>
                  <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="rgba(255,0,0,0.5)" />
                     <stop offset="16%" stopColor="rgba(255,165,0,0.5)" />
                     <stop offset="32%" stopColor="rgba(255,255,0,0.5)" />
                     <stop offset="48%" stopColor="rgba(0,128,0,0.5)" />
                     <stop offset="64%" stopColor="rgba(0,0,255,0.5)" />
                     <stop offset="80%" stopColor="rgba(75,0,130,0.5)" />
                     <stop offset="100%" stopColor="rgba(238,130,238,0.5)" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path d="M 20 150 A 130 130 0 0 1 280 150" fill="none" stroke="url(#rainbowGrad)" strokeWidth="30" strokeLinecap="round" filter="url(#glow)" />
              </svg>
            </div>
            
            {/* Shimmering particles */}
            {[...Array(15)].map((_, i) => (
               <div 
                 key={i}
                 className="absolute text-white/80 animate-twinkle"
                 style={{
                   left: `${Math.random() * 100}%`,
                   top: `${Math.random() * 60}%`,
                   animationDuration: `${2 + Math.random() * 3}s`,
                   animationDelay: `${Math.random() * 2}s`,
                   fontSize: `${0.5 + Math.random()}rem`
                 }}
               >
                 ✨
               </div>
             ))}

            <div className="absolute bottom-24 w-full text-center">
               <span className="bg-indigo-500/80 text-white px-6 py-2 rounded-full font-black text-xl shadow-xl border-2 border-white/30">ألوان الفرح</span>
            </div>
          </>
        )}

        {activeFilter === 'wings' && (
          <>
            <FaceGuide />
            {/* Angel Wings */}
            <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-64 flex justify-between pointer-events-none z-0">
               {/* Left Wing */}
               <div className="w-1/2 h-full relative -translate-x-4 origin-right animate-wing-flap-left opacity-80">
                  <svg viewBox="0 0 100 100" className="w-full h-full fill-white/80 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                     <path d="M95,50 Q60,10 20,20 Q0,40 10,70 Q30,90 60,80 Q90,70 95,50 Z" />
                     <path d="M90,55 Q65,25 30,35 Q15,50 25,70 Q45,85 70,75 Z" className="fill-cyan-50/50" />
                  </svg>
               </div>
               {/* Right Wing */}
               <div className="w-1/2 h-full relative translate-x-4 origin-left animate-wing-flap-right opacity-80">
                  <svg viewBox="0 0 100 100" className="w-full h-full fill-white/80 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{transform: 'scaleX(-1)'}}>
                     <path d="M95,50 Q60,10 20,20 Q0,40 10,70 Q30,90 60,80 Q90,70 95,50 Z" />
                     <path d="M90,55 Q65,25 30,35 Q15,50 25,70 Q45,85 70,75 Z" className="fill-cyan-50/50" />
                  </svg>
               </div>
            </div>
            
            {/* Floating Feathers */}
             {[...Array(6)].map((_, i) => (
               <div 
                 key={i}
                 className="absolute text-white/60 animate-float-down"
                 style={{
                   left: `${10 + Math.random() * 80}%`,
                   top: `-10%`,
                   animationDuration: `${4 + Math.random() * 3}s`,
                   animationDelay: `${Math.random() * 5}s`,
                 }}
               >
                 <Feather size={16 + Math.random() * 12} />
               </div>
             ))}
             
             {/* Halo Glow */}
             <div className="absolute top-[28%] left-1/2 -translate-x-1/2 w-32 h-10 bg-yellow-100/30 rounded-[100%] blur-xl animate-pulse"></div>
             <div className="absolute bottom-24 w-full text-center z-20">
               <span className="bg-white/80 text-cyan-700 px-6 py-2 rounded-full font-black text-xl shadow-xl backdrop-blur-sm">ملاك المدرسة</span>
            </div>
          </>
        )}

        {activeFilter === 'cat' && (
          <>
            <FaceGuide />
            <div className="absolute top-[15%] left-[20%] text-6xl animate-bounce-slow opacity-90">🐱</div>
            <div className="absolute top-[15%] right-[20%] text-6xl animate-bounce-slow opacity-90 delay-100">🐱</div>
             <div className="absolute top-[45%] left-1/2 -translate-x-1/2 w-40 h-20 flex justify-between items-center px-2 opacity-60">
                 <div className="w-12 h-0.5 bg-white rotate-12"></div>
                 <div className="w-12 h-0.5 bg-white -rotate-12"></div>
            </div>
            <div className="absolute bottom-24 left-0 w-full flex justify-center pb-4">
              <span className="text-white text-xl font-bold drop-shadow-lg bg-orange-500/50 px-4 py-1 rounded-full">أجمل قطة!</span>
            </div>
          </>
        )}

        {activeFilter === 'bunny' && (
          <>
            <FaceGuide />
            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 text-[8rem] filter drop-shadow-lg animate-bounce-slow leading-none">🐰</div>
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 w-40 h-20 flex justify-between items-center px-4 opacity-60">
                 <div className="flex flex-col gap-2">
                    <div className="w-16 h-0.5 bg-pink-200 rotate-6 shadow-sm"></div>
                    <div className="w-16 h-0.5 bg-pink-200 -rotate-6 shadow-sm"></div>
                 </div>
                 <div className="flex flex-col gap-2">
                    <div className="w-16 h-0.5 bg-pink-200 -rotate-6 shadow-sm"></div>
                    <div className="w-16 h-0.5 bg-pink-200 rotate-6 shadow-sm"></div>
                 </div>
            </div>
            <div className="absolute bottom-24 left-0 w-full flex justify-center pb-4">
              <span className="text-white text-xl font-bold drop-shadow-lg bg-pink-500/50 px-4 py-1 rounded-full">أرنوبة شطورة!</span>
            </div>
          </>
        )}
        
        {activeFilter === 'princess' && (
          <>
            <FaceGuide />
            {/* Enhanced Shimmer over crown area */}
            <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-40 h-40 radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%) opacity-50 animate-pulse"></div>

            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 text-[6rem] filter drop-shadow-[0_0_25px_rgba(236,72,153,0.8)] animate-float leading-none relative group">
              <span className="relative z-10">👑</span>
              {/* Dynamic shimmer across the crown */}
              <div className="absolute inset-0 z-20 overflow-hidden rounded-full opacity-60 mask-image: linear-gradient(black, black);">
                 <div className="absolute top-0 left-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full animate-shimmer-fast"></div>
              </div>
            </div>
            
            {/* Background Sparkles */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse-slow mix-blend-screen"></div>
            
            {/* Dynamic Floating Particles */}
            {[...Array(8)].map((_, i) => (
               <div 
                 key={i}
                 className="absolute text-yellow-200 animate-float-up drop-shadow-[0_0_5px_rgba(255,255,0,0.8)]"
                 style={{
                   left: `${Math.random() * 100}%`,
                   bottom: '-20px',
                   fontSize: `${Math.random() * 1.5 + 0.5}rem`,
                   animationDuration: `${2 + Math.random() * 4}s`,
                   animationDelay: `${Math.random() * 2}s`,
                   opacity: Math.random() * 0.7 + 0.3
                 }}
               >
                 {Math.random() > 0.5 ? '✨' : '★'}
               </div>
             ))}
             
            <div className="absolute bottom-24 w-full text-center">
               <span className="bg-pink-500/80 text-white px-6 py-2 rounded-full font-black text-xl shadow-xl border-2 border-pink-200/50">أميرة الفصل</span>
            </div>
          </>
        )}

        {activeFilter === 'butterfly' && (
          <>
             <FaceGuide />
             <div className="absolute top-[25%] left-[5%] text-[8rem] transform -scale-x-100 animate-wiggle origin-right opacity-90 drop-shadow-lg">🦋</div>
             <div className="absolute top-[25%] right-[5%] text-[8rem] animate-wiggle origin-left opacity-90 drop-shadow-lg">🦋</div>
             <div className="absolute top-[15%] left-1/2 -translate-x-1/2 flex gap-8">
                <div className="w-1 h-12 bg-purple-300/80 rotate-[-15deg] rounded-full"></div>
                <div className="w-1 h-12 bg-purple-300/80 rotate-[15deg] rounded-full"></div>
             </div>
          </>
        )}

        {activeFilter === 'love' && (
          <>
             <FaceGuide />
             <div className="absolute top-[12%] left-1/2 -translate-x-1/2 flex gap-1 items-end">
                <Heart className="text-red-500 fill-red-500 animate-bounce drop-shadow-md" size={36} />
                <Heart className="text-pink-500 fill-pink-500 animate-bounce delay-100 drop-shadow-md" size={48} />
                <Heart className="text-red-500 fill-red-500 animate-bounce delay-200 drop-shadow-md" size={36} />
             </div>
             
             {[...Array(8)].map((_, i) => (
               <div 
                 key={i}
                 className="absolute animate-float-up text-pink-500/60"
                 style={{
                   left: `${Math.random() * 100}%`,
                   bottom: '0',
                   animationDuration: `${3 + Math.random() * 4}s`,
                   animationDelay: `${Math.random() * 2}s`
                 }}
               >
                 <Heart size={16 + Math.random() * 20} fill="currentColor" />
               </div>
             ))}

             <div className="absolute top-[35%] left-[15%] text-4xl animate-float delay-75 opacity-80">💖</div>
             <div className="absolute top-[35%] right-[15%] text-4xl animate-float delay-150 opacity-80">💖</div>
          </>
        )}

        {activeFilter === 'glasses' && (
          <>
             <FaceGuide />
             <div className="absolute top-[32%] left-1/2 -translate-x-1/2 text-[10rem] leading-none opacity-95 filter drop-shadow-2xl animate-pulse-slow scale-125" style={{transform: 'translate(-50%, 0) scale(1.4)'}}>🕶️</div>
             <div className="absolute bottom-28 left-0 right-0 text-center">
                <span className="bg-black/60 backdrop-blur text-white px-6 py-2 rounded-full text-2xl font-black">رائعة!</span>
             </div>
          </>
        )}

        {activeFilter === 'eyes' && (
          <>
            <FaceGuide />
            <div className="absolute top-[35%] left-[30%] w-16 h-16 bg-white rounded-full border-4 border-black flex items-center justify-center overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <div className="w-5 h-5 bg-black rounded-full animate-pupil-move">
                <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
            <div className="absolute top-[35%] right-[30%] w-16 h-16 bg-white rounded-full border-4 border-black flex items-center justify-center overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <div className="w-5 h-5 bg-black rounded-full animate-pupil-move">
                <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
            <div className="absolute bottom-28 left-0 w-full text-center">
               <span className="bg-cyan-500/90 text-white px-6 py-1.5 rounded-full font-bold text-lg shadow-xl border-2 border-white/30">أراكِ بوضوح!</span>
            </div>
          </>
        )}

        {activeFilter === 'smart' && (
          <>
             <FaceGuide />
             <div className="absolute top-[15%] left-[15%] text-3xl animate-float font-black text-white drop-shadow-md bg-blue-600/40 p-1 rounded-lg">E=mc²</div>
             <div className="absolute top-[20%] right-[15%] text-4xl animate-bounce-slow delay-75 text-yellow-300 font-black drop-shadow-md">A+</div>
             <div className="absolute top-[50%] left-[10%] text-4xl animate-spin-slow duration-[8s] text-blue-300 font-bold">∑</div>
             <div className="absolute top-[50%] right-[10%] text-4xl animate-pulse text-green-300 font-bold">√</div>
          </>
        )}

        {activeFilter === 'galaxy' && (
          <>
             <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/40 to-transparent mix-blend-overlay"></div>
             <FaceGuide />
             {/* Rotating Nebula Background Effect */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-indigo-900/10 to-transparent rounded-full animate-spin-slow duration-[20s] pointer-events-none"></div>

             <div className="absolute top-[10%] left-1/2 -translate-x-1/2 text-6xl animate-spin-slow duration-[20s]">🪐</div>
             <div className="absolute top-[25%] left-[10%] text-2xl animate-twinkle text-yellow-100">✨</div>
             <div className="absolute top-[55%] right-[20%] text-3xl animate-twinkle delay-300 text-blue-200">✨</div>
             <div className="absolute top-[15%] right-[15%] text-5xl animate-float delay-500">🚀</div>
             <div className="absolute top-[5%] left-[20%] text-2xl animate-pulse text-yellow-200">⭐</div>
             
             {[...Array(8)].map((_, i) => (
               <div 
                 key={i}
                 className="absolute text-white/80 animate-float-up"
                 style={{
                   left: `${10 + Math.random() * 80}%`,
                   top: `${40 + Math.random() * 50}%`,
                   animationDuration: `${4 + Math.random() * 4}s`,
                   animationDelay: `${Math.random() * 3}s`,
                   fontSize: Math.random() > 0.5 ? '1.2rem' : '0.8rem'
                 }}
               >
                 {i % 2 === 0 ? '★' : '✦'}
               </div>
             ))}
          </>
        )}

        {activeFilter === 'flowers' && (
          <div className="absolute inset-0 border-[20px] border-pink-200/50 rounded-3xl flex flex-col justify-between p-2">
            <div className="flex justify-between">
              <span className="text-5xl animate-spin-slow">🌸</span>
              <span className="text-5xl animate-spin-slow delay-100">🌺</span>
            </div>
            <div className="flex justify-between">
              <span className="text-5xl animate-spin-slow delay-200">🌷</span>
              <span className="text-5xl animate-spin-slow delay-300">🌻</span>
            </div>
          </div>
        )}

        {activeFilter === 'bee' && (
          <>
            <FaceGuide />
             <div className="absolute inset-0 border-[12px] border-yellow-400/40 m-2 rounded-[3rem] border-dashed opacity-60"></div>
            <div className="absolute top-1/4 left-1/4 text-7xl animate-wiggle drop-shadow-lg">🐝</div>
            <div className="absolute bottom-1/3 right-1/4 text-5xl animate-wiggle delay-75 drop-shadow-lg">🐝</div>
            <div className="absolute top-20 right-10 text-5xl animate-spin-slow drop-shadow-md">🍯</div>
            <div className="absolute bottom-32 left-10 text-5xl animate-bounce-slow delay-150 drop-shadow-md">🌻</div>
          </>
        )}

        {activeFilter === 'hero' && (
          <>
             <FaceGuide />
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(59,130,246,0.15)_0deg,transparent_20deg,rgba(239,68,68,0.15)_40deg,transparent_60deg,rgba(59,130,246,0.15)_80deg,transparent_100deg,rgba(239,68,68,0.15)_120deg,transparent_140deg,rgba(59,130,246,0.15)_160deg,transparent_180deg,rgba(239,68,68,0.15)_200deg,transparent_220deg,rgba(59,130,246,0.15)_240deg,transparent_260deg,rgba(239,68,68,0.15)_280deg,transparent_300deg,rgba(59,130,246,0.15)_320deg,transparent_340deg,rgba(239,68,68,0.15)_360deg)] animate-spin-slow duration-[20s] mix-blend-screen"></div>
            
            <div className="absolute top-10 left-5 bg-blue-600 text-white font-black text-3xl px-6 py-2 rounded-full -rotate-12 shadow-[4px_4px_0px_rgba(0,0,0,1)] border-2 border-white animate-pop delay-100">WOW!</div>
            <div className="absolute bottom-32 right-5 bg-red-600 text-white font-black text-4xl px-6 py-3 rounded-full rotate-12 shadow-[4px_4px_0px_rgba(0,0,0,1)] border-2 border-white animate-pop delay-300">SUPER!</div>
            
            <div className="absolute inset-0 border-[10px] border-blue-500/30 mix-blend-overlay rounded-xl"></div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-tajawal select-none">
      <canvas ref={canvasRef} className="hidden" />
      <div className={`absolute inset-0 bg-white z-[60] pointer-events-none transition-opacity duration-200 ${flash ? 'opacity-80' : 'opacity-0'}`} />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30">
          <X size={24} />
        </button>
        
        {status === AnalysisStatus.IDLE && (
          <div className="flex gap-2">
             <button 
               onClick={() => {
                 setShowSettings(!showSettings);
                 setShowFilters(false);
               }}
               className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md border transition-all ${showSettings ? 'bg-pink-600 border-pink-400 text-white' : 'bg-black/40 border-white/20 text-gray-200'}`}
             >
               <Settings2 size={16} />
               <span className="hidden sm:inline">الإعدادات</span>
             </button>
          </div>
        )}

        <button onClick={toggleCamera} className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30">
          <SwitchCamera size={24} />
        </button>
      </div>
      
      {/* Low Light Warning */}
      {isLowLight && !capturedImage && status === AnalysisStatus.IDLE && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-white px-5 py-2 rounded-full flex items-center gap-2 shadow-lg z-40 animate-bounce backdrop-blur-md border border-white/20">
            <Sun size={20} className="animate-pulse" />
            <span className="text-sm font-bold">الإضاءة منخفضة</span>
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/30 backdrop-blur-sm">
          <div className="text-white text-[12rem] font-black drop-shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-pop leading-none">
            {countdown}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <div className={`absolute top-20 left-0 right-0 px-4 z-20 transition-all duration-300 ${showSettings && status === AnalysisStatus.IDLE ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="bg-black/85 backdrop-blur-xl rounded-2xl p-5 border border-white/10 text-white space-y-5 shadow-2xl">
          
          <div>
            <label className="text-xs text-gray-400 mb-2 block font-bold">المرحلة الدراسية</label>
            <div className="flex gap-2">
              <button onClick={() => setGrade('1-3')} className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${grade === '1-3' ? 'bg-pink-600 border-pink-400' : 'bg-white/5 border-white/10'}`}>صفوف 1-3</button>
              <button onClick={() => setGrade('4-6')} className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${grade === '4-6' ? 'bg-purple-600 border-purple-400' : 'bg-white/5 border-white/10'}`}>صفوف 4-6</button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-2 block font-bold">نوع النشاط</label>
            <div className="flex gap-2">
              <button onClick={() => setTaskType('general')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${taskType === 'general' ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/10'}`}>سلوك</button>
              <button onClick={() => setTaskType('academic')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${taskType === 'academic' ? 'bg-teal-600 border-teal-400' : 'bg-white/5 border-white/10'}`}>أكاديمي</button>
              <button onClick={() => setTaskType('creative')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${taskType === 'creative' ? 'bg-orange-600 border-orange-400' : 'bg-white/5 border-white/10'}`}>إبداع</button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-2 block font-bold">مستوى النجوم الافتراضي</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setDifficulty('easy')}
                className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${difficulty === 'easy' ? 'bg-green-600/80 border-green-400' : 'bg-white/5 border-white/10'}`}
              >
                <Star size={14} className="fill-white" />
                <span className="text-[10px] font-bold">1-2 نجوم</span>
              </button>
              <button 
                onClick={() => setDifficulty('medium')}
                className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${difficulty === 'medium' ? 'bg-yellow-600/80 border-yellow-400' : 'bg-white/5 border-white/10'}`}
              >
                <div className="flex"><Star size={12} className="fill-white"/><Star size={12} className="fill-white"/></div>
                <span className="text-[10px] font-bold">2-4 نجوم</span>
              </button>
              <button 
                onClick={() => setDifficulty('hard')}
                className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${difficulty === 'hard' ? 'bg-red-600/80 border-red-400' : 'bg-white/5 border-white/10'}`}
              >
                <div className="flex"><Star size={10} className="fill-white"/><Star size={10} className="fill-white"/><Star size={10} className="fill-white"/></div>
                <span className="text-[10px] font-bold">4-5 نجوم</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-900">
        
        {!capturedImage && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            {renderFilterOverlay()}
          </>
        )}

        {capturedImage && (
          <div className="relative w-full h-full">
            <img src={capturedImage} className="w-full h-full object-cover" alt="captured" />
            
            {(status === AnalysisStatus.SUCCESS || status === AnalysisStatus.DETECTED) && rewardData?.boundingBox && (
               <div 
                 className={`absolute border-4 rounded-xl transition-all duration-700 ease-cubic ${
                    status === AnalysisStatus.DETECTED 
                      ? 'border-green-400 scale-105 shadow-[0_0_50px_rgba(74,222,128,0.6)] opacity-100' 
                      : 'border-yellow-400 scale-100 shadow-[0_0_20px_rgba(250,204,21,0.5)] opacity-90'
                 }`}
                 style={getBoundingBoxStyle()}
               >
                 <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -translate-x-1 -translate-y-1"></div>
                 <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white translate-x-1 -translate-y-1"></div>
                 <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -translate-x-1 translate-y-1"></div>
                 <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white translate-x-1 translate-y-1"></div>
                 
                 {status === AnalysisStatus.DETECTED && (
                   <div className="absolute inset-0 bg-green-500/20 animate-pulse"></div>
                 )}
               </div>
            )}
          </div>
        )}

        {status === AnalysisStatus.ANALYZING && (
          <div className="absolute inset-0 z-20 pointer-events-none">
             <div className="absolute inset-x-0 h-0.5 bg-pink-400/80 shadow-[0_0_40px_rgba(236,72,153,1)] animate-scan-vertical"></div>
             <div className="absolute inset-0 bg-pink-900/10 animate-pulse-slow"></div>

             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border border-pink-500/30 rounded-2xl animate-spin-slow flex items-center justify-center">
                 <div className="absolute inset-0 border-t-2 border-b-2 border-pink-500/50 rounded-full animate-ping-slow"></div>
                 <div className="w-3 h-3 bg-pink-400 rounded-full shadow-[0_0_15px_rgba(236,72,153,1)]"></div>
             </div>
             
             <div className="absolute bottom-24 w-full text-center">
               <div className="inline-flex items-center gap-3 bg-black/60 text-white px-6 py-2 rounded-full backdrop-blur-md border border-pink-500/30 shadow-lg">
                 <Sparkles size={16} className="text-pink-400 animate-pulse" />
                 <span className="text-sm font-bold tracking-wider">جاري تحليل التميز...</span>
               </div>
             </div>
          </div>
        )}

        {status === AnalysisStatus.SUCCESS && rewardData && (
          <div className="absolute inset-0 z-40 flex items-end justify-center pb-24 bg-black/60 backdrop-blur-sm animate-fade-in">
            <RewardCard 
              message={rewardData.message} 
              stars={rewardData.stars} 
              onDismiss={handleConfirmReward}
            />
          </div>
        )}
        
        {status === AnalysisStatus.ERROR && (
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 p-8 text-center">
             <AlertCircle size={48} className="text-red-500 mb-4" />
             <p className="text-white font-bold mb-2">تنبيه</p>
             <p className="text-gray-300 text-sm mb-6">{errorMsg}</p>
             <button onClick={resetScanner} className="bg-white text-black px-8 py-2 rounded-full font-bold hover:bg-gray-200 transition-colors">حاول مرة أخرى</button>
           </div>
        )}
      </div>

      {/* Filter Selection Bar & Controls */}
      <div className={`absolute bottom-32 left-0 right-0 px-2 z-40 transition-all duration-300 ${showFilters && status === AnalysisStatus.IDLE ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
         
         {/* Opacity Slider */}
         {activeFilter !== 'none' && (
            <div className="flex justify-center mb-3">
               <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3 animate-pop">
                  <Sliders size={14} className="text-white/70" />
                  <input 
                    type="range" 
                    min="0.3" 
                    max="1" 
                    step="0.1"
                    value={filterOpacity}
                    onChange={(e) => setFilterOpacity(parseFloat(e.target.value))}
                    className="w-32 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
               </div>
            </div>
         )}

         <div className="bg-black/30 backdrop-blur-md p-3 rounded-3xl flex gap-3 overflow-x-auto no-scrollbar scroll-smooth border border-white/10 mx-auto max-w-full">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleFilterSelect(filter.id)}
                className={`relative flex flex-col items-center justify-center gap-1 min-w-[4rem] transition-all duration-300 ${activeFilter === filter.id ? 'scale-110 -translate-y-1' : 'opacity-70 hover:opacity-100'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${filter.color} text-white shadow-lg border-2 transition-all duration-300 ${activeFilter === filter.id ? 'border-white ring-2 ring-offset-2 ring-offset-black ring-white/50' : 'border-transparent'}`}>
                  {activeFilter === filter.id && (
                    <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-50"></div>
                  )}
                  {filter.icon}
                </div>
                <span className={`text-[9px] font-bold text-white drop-shadow-md transition-opacity ${activeFilter === filter.id ? 'opacity-100' : 'opacity-70'}`}>{filter.name}</span>
              </button>
            ))}
         </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent pt-12 pb-8 px-6 flex justify-center items-center gap-6 z-30">
        
        {status === AnalysisStatus.IDLE && (
          <>
            {/* Filter Toggle Button */}
            <button 
              onClick={() => {
                setShowFilters(!showFilters);
                setShowSettings(false);
              }}
              className={`p-3 rounded-full backdrop-blur-md transition-all ${showFilters ? 'bg-pink-500 text-white ring-2 ring-pink-300 ring-offset-2 ring-offset-black' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              <Wand2 size={24} />
            </button>

            {/* Capture Button with Long Press */}
            <button
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center relative group active:scale-95 transition-all"
            >
              <div className="w-16 h-16 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full group-hover:scale-90 transition-transform duration-200 shadow-[0_0_25px_rgba(219,39,119,0.6)] flex items-center justify-center">
                  {/* Timer Icon Hint */}
                  <div className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-white/60">
                     <Timer size={24} />
                  </div>
              </div>
              {/* Button Ring Animation for visual feedback */}
              {longPressTimerRef.current && (
                <svg className="absolute inset-0 w-full h-full rotate-[-90deg] pointer-events-none">
                   <circle cx="50%" cy="50%" r="45%" stroke="white" strokeWidth="2" fill="none" strokeDasharray="283" strokeDashoffset="0" className="animate-[dash_0.6s_linear_forwards]" />
                </svg>
              )}
            </button>

            {/* Placeholder for symmetry */}
            <div className="w-12"></div>
          </>
        )}
      </div>

      <style>{`
        @keyframes scanVertical {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .animate-scan-vertical {
          animation: scanVertical 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        .animate-wiggle {
           animation: wiggle 1s ease-in-out infinite;
        }
        @keyframes wiggle {
            0%, 100% { transform: rotate(-10deg); }
            50% { transform: rotate(10deg); }
        }
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow {
            animation: bounce-slow 2s ease-in-out infinite;
        }
        @keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        .animate-ping-slow {
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .ease-cubic { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
        
        @keyframes shimmer-fast {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(150%) skewX(-20deg); }
        }
        .animate-shimmer-fast {
          animation: shimmer-fast 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes shimmer-overlay {
          0% { opacity: 0; transform: translateX(-100%); }
          50% { opacity: 0.5; }
          100% { opacity: 0; transform: translateX(100%); }
        }
        .animate-shimmer-overlay {
          animation: shimmer-overlay 4s infinite linear;
        }
        @keyframes twinkle {
            0%, 100% { opacity: 0.4; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); text-shadow: 0 0 10px currentColor; }
        }
        .animate-twinkle {
            animation: twinkle 2s ease-in-out infinite;
        }
        @keyframes float-up {
            0% { transform: translateY(100%) scale(0.5); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(-20vh) scale(1.2); opacity: 0; }
        }
        .animate-float-up {
            animation: float-up linear infinite;
        }
        @keyframes float-down {
            0% { transform: translateY(-20%) rotate(0deg); opacity: 0; }
            20% { opacity: 0.8; }
            100% { transform: translateY(120%) rotate(180deg); opacity: 0; }
        }
        .animate-float-down {
            animation: float-down linear infinite;
        }
        @keyframes pupil-move {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-6px, 0); }
          50% { transform: translate(6px, 0); }
          75% { transform: translate(0, 4px); }
        }
        .animate-pupil-move {
          animation: pupil-move 4s infinite ease-in-out;
        }
        @keyframes wing-flap-left {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(25deg); }
        }
        .animate-wing-flap-left {
          animation: wing-flap-left 3s ease-in-out infinite;
        }
        @keyframes wing-flap-right {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(-25deg); }
        }
        .animate-wing-flap-right {
          animation: wing-flap-right 3s ease-in-out infinite;
        }
        @keyframes dash {
           from { stroke-dashoffset: 283; }
           to { stroke-dashoffset: 0; }
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
