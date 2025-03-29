import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  radius?: number;
  showPercentage?: boolean;
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 10,
  backgroundColor = '#f3f4f6',
  progressColor = '#4f46e5',
  radius = 4,
  showPercentage = false,
  label
}) => {
  // Ensure progress is between 0 and 100
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className="progress-bar-container">
      {label && <div className="progress-label">{label}</div>}
      <div 
        className="progress-bar-background"
        style={{
          height: `${height}px`,
          backgroundColor,
          borderRadius: `${radius}px`,
        }}
      >
        <motion.div 
          className="progress-bar-fill"
          style={{
            backgroundColor: progressColor,
            borderRadius: `${radius}px`,
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${normalizedProgress}%` }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut",
            delay: 0.2
          }}
        />
      </div>
      {showPercentage && (
        <motion.div 
          className="progress-percentage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {normalizedProgress.toFixed(0)}%
        </motion.div>
      )}

      <style jsx>{`
        .progress-bar-container {
          width: 100%;
          margin: 8px 0;
        }
        
        .progress-label {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        
        .progress-bar-background {
          width: 100%;
          overflow: hidden;
        }
        
        .progress-bar-fill {
          height: 100%;
        }
        
        .progress-percentage {
          font-size: 12px;
          color: #6b7280;
          text-align: right;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;
