import React, { useId } from "react";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  shine?: boolean;
};

export function Logo({ className, shine = true }: LogoProps) {
  const uid = useId(); // unique per instance
  const clipId = `bisogo-clip-${uid}`;
  const gradId = `bisogo-shine-${uid}`;

  return (
    <span className={cn("relative inline-block", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 293.95 74.71"
        role="img"
        aria-label="Bisogo"
        className="block h-full w-auto"
      >
        <defs>
          <clipPath id={clipId}>
            <text
              x="7.32"
              y="64.91"
              fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
              fontWeight="900"
              fontSize="72"
              letterSpacing="-1"
            >
              BISOGO
            </text>
          </clipPath>

          {/* Premium rare sweep */}
           <linearGradient id={gradId} x1="-1" y1="0" x2="1" y2="0">
            {/* Wider + softer band */}
            <stop offset="0" stopColor="rgba(255,255,255,0)" />
            <stop offset="0.38" stopColor="rgba(255,255,255,0)" />
            <stop offset="0.48" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="0.52" stopColor="rgba(255,255,255,0.65)" />
            <stop offset="0.56" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="0.66" stopColor="rgba(255,255,255,0)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />

            {/* Slow + premium: long pause, slow sweep */}
            <animate
              attributeName="x1"
              dur="5s"
              repeatCount="indefinite"
              values="-1;-1;1;1"
              keyTimes="0;0.70;0.88;1"
            />
            <animate
              attributeName="x2"
              dur="5s"
              repeatCount="indefinite"
              values="0;0;2;2"
              keyTimes="0;0.70;0.88;1"
            />
          </linearGradient>
        </defs>

        {/* Base */}
        <text
          x="7.32"
          y="64.91"
          fill="currentColor"
          fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          fontWeight="900"
          fontSize="72"
          letterSpacing="-1"
        >
          BISOGO
        </text>

        {/* Shine */}
        {shine ? (
          <rect
            x="-40%"
            y="0"
            width="180%"
            height="100%"
            fill={`url(#${gradId})`}
            clipPath={`url(#${clipId})`}
            opacity="0.75"
          />
        ) : null}
      </svg>
    </span>
  );
}