import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface NavigationItemProps {
  icon: React.ReactNode;
  label: string;
  section: string;
  active: boolean;
  onClick: () => void;
  tooltip?: string;
}

export const NavigationItem: React.FC<NavigationItemProps> = ({ 
  icon, 
  label, 
  active, 
  onClick,
  tooltip
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  useEffect(() => {
    if (showTooltip && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipTop(rect.top);
    }
  }, [showTooltip]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          w-full flex items-center justify-between px-3 py-2.5 rounded-lg 
          transition-all duration-200
          ${active 
            ? 'bg-blue-600 text-white shadow-lg' 
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }
        `}
      >
        <div className="flex items-center space-x-3">
          <span className={active ? 'text-white' : 'text-gray-400'}>
            {icon}
          </span>
          <span className="font-medium text-sm">{label}</span>
        </div>
        {tooltip && (
          <Info size={14} className="opacity-60" />
        )}
      </button>

      {/* Tooltip - Fixed position to avoid overflow clipping */}
      {tooltip && showTooltip && (
        <div 
          className="fixed left-[272px] z-[9999] w-80 pointer-events-none"
          style={{ top: `${tooltipTop}px` }}
          role="tooltip"
        >
          <div className="bg-gray-800 text-white text-sm rounded-lg shadow-2xl p-4 border-2 border-blue-500">
            <div className="text-gray-100 leading-relaxed">{tooltip}</div>
          </div>
          {/* Arrow pointing left */}
          <div 
            className="absolute right-full top-3 w-0 h-0"
            style={{ 
              borderWidth: '8px',
              borderStyle: 'solid',
              borderColor: 'transparent rgb(59, 130, 246) transparent transparent',
              marginRight: '-2px'
            }}
          />
        </div>
      )}
    </div>
  );
};

