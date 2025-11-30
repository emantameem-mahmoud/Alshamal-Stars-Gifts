import React, { useEffect, useState, useRef } from 'react';
import { Star, CheckCircle, Sparkles, Edit3 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RewardCardProps {
  message: string;
  stars: number;
  onDismiss: (finalStars: number, finalMessage: string) => void;
}

// Shared Audio Logic
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

// Polyphonic Arpeggio
const playSuccessChord = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = 0.1;

    // C Major 7 Arpeggio: C5, E5, G5, B5, C6
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; // smooth sound
      osc.frequency.value = freq;
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      const startTime = now + (i * 0.08);
      osc.start(startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(1, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
      
      osc.stop(startTime + 0.7);
    });
  } catch (e) { console.error(e); }
};

const playConfirmSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = 880; 
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
};

export const RewardCard: React.FC<RewardCardProps> = ({ message, stars: initialStars, onDismiss }) => {
  const [stars, setStars] = useState(initialStars);
  const [editableMessage, setEditableMessage] = useState(message);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    setStars(initialStars);
    setEditableMessage(message);
  }, [initialStars, message]);

  useEffect(() => {
    playSuccessChord();

    // Immediate central burst configuration
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    // Trigger multiple bursts for a "firework" effect
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    // Continuous gentle rain from sides
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#F472B6', '#A78BFA', '#FCD34D'],
        zIndex: 9999
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#F472B6', '#A78BFA', '#FCD34D'],
        zIndex: 9999
      });

      if (Date.now() < end) {
        animationFrameRef.current = requestAnimationFrame(frame);
      }
    };
    frame();

    // Cleanup animation frame on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleConfirm = () => {
      playConfirmSound();
      onDismiss(stars, editableMessage);
  };

  return (
    <div className="w-full max-w-sm mx-4 relative group">
      {/* Magical Pulsating Glow Background */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 rounded-[2.2rem] opacity-75 blur-lg animate-pulse-slow group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-white/95 backdrop-blur-2xl rounded-[2rem] p-6 shadow-[0_0_60px_rgba(236,72,153,0.3)] text-center animate-pop border border-white/50 overflow-hidden">
        
        {/* Shimmer Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-transparent to-purple-500/10 pointer-events-none"></div>
        
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-full flex justify-center z-20">
           <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-2.5 rounded-full font-black text-lg shadow-xl border-4 border-white/30 flex items-center gap-2 animate-bounce">
              <Sparkles size={20} className="animate-spin-slow text-white" />
              <span className="drop-shadow-md">أحسنتِ يا بطلة!</span>
           </div>
        </div>

        <div className="mt-8 mb-4 relative z-10">
          <p className="text-[10px] text-pink-800/60 font-bold mb-2 tracking-wide">اضغطي على النجوم للتعديل</p>
          <div className="flex justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <button 
                key={i}
                onClick={() => setStars(i + 1)}
                className="transform transition-all duration-200 hover:scale-110 active:scale-90 focus:outline-none"
              >
                <Star 
                  size={44} 
                  className={`transition-all duration-300 drop-shadow-md ${i < stars ? 'text-yellow-400 fill-yellow-400 scale-100 rotate-0' : 'text-gray-200 fill-gray-100 scale-75 rotate-12'}`} 
                />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/60 rounded-2xl p-4 mb-6 border-2 border-pink-100 min-h-[90px] flex flex-col relative group shadow-inner transition-colors focus-within:border-pink-300 focus-within:bg-white">
          <div className="absolute top-2 left-2 text-pink-300 opacity-50 group-hover:opacity-100 transition-opacity">
              <Edit3 size={16} />
          </div>
          <textarea 
            value={editableMessage}
            onChange={(e) => setEditableMessage(e.target.value)}
            className="w-full h-full bg-transparent text-center text-xl font-bold text-gray-800 leading-relaxed focus:outline-none resize-none pt-1 placeholder-gray-300"
            rows={2}
            placeholder="اكتبي رسالة تشجيعية..."
          />
        </div>

        <button 
          onClick={handleConfirm}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-pink-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 relative z-10 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <CheckCircle size={24} />
          <span>اعتماد المكافأة ({stars})</span>
        </button>
        
        <style>{`
          .animate-spin-slow {
              animation: spin 4s linear infinite;
          }
          @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};