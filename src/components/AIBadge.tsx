import React from 'react';
import '../styles/components/AIBadge.css';

interface AIBadgeProps {
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  variant?: 'solid' | 'outline' | 'minimal';
}

export const AIBadge: React.FC<AIBadgeProps> = ({ 
  position = 'bottom-right',
  variant = 'solid'
}) => {
  return (
    <div className={`ai-badge ${position} ${variant}`}>
      <span className="ai-badge-icon">AI</span>
      <span className="ai-badge-pulse"></span>
    </div>
  );
};