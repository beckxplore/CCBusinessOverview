import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ 
  content, 
  title,
  placement = 'top',
  size = 'sm'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  
  // Position classes based on placement
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  // Arrow classes based on placement
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent'
  };

  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-gray-400 hover:text-gray-600 transition-colors cursor-help inline-flex items-center"
        aria-label="More information"
      >
        <Info className={iconSize} />
      </button>

      {isVisible && (
        <div 
          className={`absolute ${positionClasses[placement]} z-50 w-64 pointer-events-none`}
          role="tooltip"
        >
          <div className="bg-gray-900 text-white text-sm rounded-lg shadow-lg p-3">
            {title && (
              <div className="font-semibold mb-1 text-blue-300">{title}</div>
            )}
            <div className="text-gray-200 leading-relaxed">{content}</div>
          </div>
          {/* Arrow */}
          <div 
            className={`absolute w-0 h-0 border-4 ${arrowClasses[placement]}`}
            style={{ borderWidth: '6px' }}
          />
        </div>
      )}
    </div>
  );
};

