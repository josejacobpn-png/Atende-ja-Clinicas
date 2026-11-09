'use client';

import React, { useState, useEffect } from 'react';
import { useQueue } from '@/context/QueueContext';
import { HeartPulse, ShieldAlert, Award, Calendar, AlertCircle } from 'lucide-react';

export default function CampanhasSaude() {
  const { campaigns } = useQueue();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % campaigns.length);
    }, 8000); // Rotacionar a cada 8 segundos

    return () => clearInterval(timer);
  }, [campaigns.length]);

  const icons = [
    <HeartPulse key="0" className="h-10 w-10 text-emerald-500 animate-pulse" />,
    <ShieldAlert key="1" className="h-10 w-10 text-rose-500" />,
    <Award key="2" className="h-10 w-10 text-sky-500" />,
    <Calendar key="3" className="h-10 w-10 text-amber-500 animate-bounce" />,
    <AlertCircle key="4" className="h-10 w-10 text-pink-500" />,
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300">
      {/* Background design elements */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-primary/5 blur-xl"></div>
      <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-24 w-24 rounded-full bg-secondary/5 blur-xl"></div>

      <div className="flex flex-col md:flex-row items-center gap-6 z-10 relative">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-muted shadow-inner">
          {icons[currentIndex % icons.length]}
        </div>

        <div className="flex-1 text-center md:text-left">
          <span className="text-[10px] font-bold tracking-widest text-primary uppercase">Campanha de Saúde UBS</span>
          <h4 className="mt-1 text-base md:text-lg font-semibold leading-relaxed text-foreground transition-all duration-500 slide-in-bottom">
            {campaigns[currentIndex]}
          </h4>
        </div>
      </div>

      {/* Progress Indicator Dots */}
      <div className="mt-6 flex justify-center gap-1.5">
        {campaigns.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
