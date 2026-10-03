import React from 'react';

interface LoaderProps {
  message?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message = 'Loading...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-3 ${className}`}>
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      {message && <p className="text-sm text-gray-500 font-medium">{message}</p>}
    </div>
  );
};
