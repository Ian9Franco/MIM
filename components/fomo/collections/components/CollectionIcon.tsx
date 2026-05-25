import React, { useState } from "react";
import { Library } from "lucide-react";
import { COLORS } from "@/theme/tokens";

export function CollectionIcon({ 
  url, 
  fallbackSize = "w-6 h-6", 
  fallbackOpacity = "opacity-30" 
}: { 
  url?: string | null; 
  fallbackSize?: string; 
  fallbackOpacity?: string; 
}) {
  const [failed, setFailed] = useState(false);
  
  if (url && !failed) {
    return (
      <img 
        src={url} 
        alt="" 
        className="w-full h-full object-cover" 
        onError={() => setFailed(true)}
      />
    );
  }
  
  return <Library className={`${fallbackSize} ${fallbackOpacity}`} style={{ color: COLORS.primary }} />;
}
