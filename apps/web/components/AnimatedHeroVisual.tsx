import React from 'react';

export default function AnimatedHeroVisual() {
  return (
    <div className="relative w-full h-48 md:h-64 my-6 overflow-hidden flex items-center justify-center animate-scale-in">
      {/* Background radial glow specifically for the visual */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary-light)] to-transparent opacity-50 rounded-3xl"></div>

      {/* Abstract Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="var(--primary)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gridPattern)" />
      </svg>

      {/* Main SVG Growth Chart & Elements */}
      <svg className="w-full h-full relative z-10" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Gradients */}
          <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--dark)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFAE42" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--orange)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--orange)" stopOpacity="1" />
          </linearGradient>
          
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Rising Growth Line */}
        <path
          d="M 20 160 C 80 150, 120 140, 180 110 C 240 80, 280 60, 360 40"
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1000"
          strokeDashoffset="1000"
          className="animate-draw-line delay-200"
          filter="url(#softGlow)"
        />

        {/* Floating Abstract Coin / Node 1 (Navy/Purple) */}
        <g className="animate-float">
          <circle cx="90" cy="110" r="14" fill="url(#primaryGrad)" filter="url(#softGlow)" opacity="0.9" />
          <circle cx="90" cy="110" r="6" fill="var(--primary-light)" opacity="0.6" />
        </g>

        {/* Floating Data Node 2 (Orange) */}
        <g className="animate-float-reverse delay-100">
          <circle cx="210" cy="70" r="10" fill="url(#orangeGrad)" filter="url(#softGlow)" />
        </g>

        {/* High Point Glow Node */}
        <g className="animate-pulse-glow delay-500">
          <circle cx="360" cy="40" r="8" fill="var(--orange)" />
          <circle cx="360" cy="40" r="18" fill="var(--orange)" opacity="0.2" />
        </g>

        {/* Subtle Geometric Ring (Translucent Depth) */}
        <g className="animate-float-slow">
          <circle cx="290" cy="130" r="28" fill="none" stroke="var(--primary-light)" strokeWidth="3" opacity="0.7" />
          <circle cx="290" cy="130" r="18" fill="none" stroke="var(--primary-light)" strokeWidth="1" opacity="0.5" />
        </g>
        
        {/* Floating Particles */}
        <circle cx="50" cy="60" r="3" fill="var(--primary)" opacity="0.4" className="animate-float delay-300" />
        <circle cx="160" cy="150" r="4" fill="var(--orange)" opacity="0.3" className="animate-float-reverse delay-500" />
        <circle cx="330" cy="100" r="2" fill="var(--dark)" opacity="0.3" className="animate-float delay-100" />
      </svg>
    </div>
  );
}
