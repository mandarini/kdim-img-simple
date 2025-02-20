import React from 'react';
import { AlertCircle, CheckCircle, XCircle, X as CloseIcon } from 'lucide-react';

export type StatusType = 'success' | 'error' | 'info';

interface Props {
  message: string;
  type: StatusType;
  onClose: () => void;
}

export function StatusBanner({ message, type, onClose }: Props) {
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <XCircle className="h-5 w-5 text-blue-500" />,
    },
  };

  const currentStyle = styles[type];

  return (
    <div className={`${currentStyle.bg} border ${currentStyle.border} rounded-lg p-4 mb-4`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">{currentStyle.icon}</div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${currentStyle.text}`}>{message}</p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 ${currentStyle.bg} ${currentStyle.text} hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${type}-50 focus:ring-${type}-600`}
            >
              <span className="sr-only">Dismiss</span>
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}