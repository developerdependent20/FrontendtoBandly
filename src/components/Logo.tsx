"use client";

import React from "react";
import { useTheme } from "./ThemeProvider";

interface LogoProps {
  variant?: "horizontal" | "stacked";
  sizeMultiplier?: number;
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  variant = "horizontal", 
  sizeMultiplier = 1, 
  className = ""
}) => {
  const { theme } = useTheme();

  const logoUrl = "https://krmopdpfgrlcoldfsefq.supabase.co/storage/v1/object/public/Images/3.png";
  const logoFilter = theme === "dark" ? "brightness(0) invert(1)" : "none";

  // Sizes for high visibility
  const baseHeight = variant === "stacked" ? 160 : 65;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={logoUrl} 
        alt="CLAN" 
        style={{ 
          height: `${baseHeight * sizeMultiplier}px`, 
          width: "auto", 
          objectFit: "contain",
          filter: logoFilter
        }} 
        className="transition-all duration-500"
      />
    </div>
  );
};
