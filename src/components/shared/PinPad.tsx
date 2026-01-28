import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Delete, Check } from 'lucide-react';

interface PinPadProps {
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  pinLength?: number;
  className?: string;
  title?: string;
}

export function PinPad({ onComplete, onCancel, pinLength = 4, className, title = 'Enter PIN' }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  const handleNumber = useCallback((num: string) => {
    if (pin.length < pinLength) {
      setPin(prev => prev + num);
    }
  }, [pin, pinLength]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  const handleSubmit = useCallback(() => {
    if (pin.length === pinLength) {
      onComplete(pin);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }, [pin, pinLength, onComplete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumber(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumber, handleDelete, handleSubmit, onCancel]);

  return (
    <div className={cn('flex flex-col items-center gap-6 p-6', className)}>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      
      {/* PIN Display */}
      <div
        className={cn(
          'flex gap-3 transition-transform',
          shake && 'animate-shake'
        )}
        style={{
          animation: shake ? 'shake 0.5s ease-in-out' : undefined,
        }}
      >
        {Array.from({ length: pinLength }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 transition-all duration-200',
              i < pin.length
                ? 'bg-primary border-primary scale-110'
                : 'bg-transparent border-muted-foreground/30'
            )}
          />
        ))}
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <Button
            key={num}
            variant="outline"
            size="lg"
            className="w-16 h-16 text-2xl font-medium touch-target"
            onClick={() => handleNumber(num)}
          >
            {num}
          </Button>
        ))}
        <Button
          variant="outline"
          size="lg"
          className="w-16 h-16 text-muted-foreground touch-target"
          onClick={handleClear}
        >
          C
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-16 h-16 text-2xl font-medium touch-target"
          onClick={() => handleNumber('0')}
        >
          0
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-16 h-16 touch-target"
          onClick={handleDelete}
        >
          <Delete size={24} />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-[220px]">
        {onCancel && (
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          className="flex-1 gap-2"
          onClick={handleSubmit}
          disabled={pin.length !== pinLength}
        >
          <Check size={18} />
          Confirm
        </Button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
