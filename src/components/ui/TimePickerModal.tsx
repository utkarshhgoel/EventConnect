import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  initialTime?: string;
  title?: string;
}

export function TimePickerModal({ isOpen, onClose, onSelect, initialTime, title = "Select time" }: TimePickerModalProps) {
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (isOpen) {
      if (initialTime) {
        const [h, m] = initialTime.split(':').map(Number);
        const isPM = h >= 12;
        setPeriod(isPM ? 'PM' : 'AM');
        let displayHour = h % 12;
        if (displayHour === 0) displayHour = 12;
        setHours(displayHour);
        setMinutes(m || 0);
      } else {
        setHours(12);
        setMinutes(0);
        setPeriod('AM');
      }
      setMode('hours');
    }
  }, [isOpen, initialTime]);

  if (!isOpen) return null;

  const handleHourClick = (h: number) => {
    setHours(h);
    setMode('minutes');
  };

  const handleMinuteClick = (m: number) => {
    setMinutes(m);
  };

  const handleOK = () => {
    let h24 = hours;
    if (period === 'PM' && hours !== 12) h24 += 12;
    if (period === 'AM' && hours === 12) h24 = 0;
    
    const formattedTime = `${h24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onSelect(formattedTime);
    onClose();
  };

  const clockNumbers = mode === 'hours' 
    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const renderClockFace = () => {
    const radius = 96;
    const center = 120;
    
    return (
      <div className="relative w-[240px] h-[240px] bg-gray-50 rounded-full mx-auto mt-8 flex items-center justify-center">
        <div className="w-2 h-2 bg-indigo-600 rounded-full absolute z-10" />
        
        <div 
          className="absolute w-1 bg-indigo-600 origin-bottom rounded-full z-0 transition-transform duration-300 ease-out"
          style={{
            height: '80px',
            bottom: '120px',
            left: '118px',
            transform: `rotate(${mode === 'hours' ? (hours % 12) * 30 : (minutes / 5) * 30}deg)`
          }}
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 absolute -top-4 -left-3.5 flex items-center justify-center text-white font-medium shadow-sm">
            {mode === 'hours' ? hours : minutes.toString().padStart(2, '0')}
          </div>
        </div>

        {clockNumbers.map((num, i) => {
          const angle = (i * 30) * (Math.PI / 180);
          const x = center + radius * Math.sin(angle) - 16;
          const y = center - radius * Math.cos(angle) - 16;
          
          const isSelected = mode === 'hours' ? hours === (num || 12) : minutes === num;

          return (
            <button
              key={num}
              onClick={() => mode === 'hours' ? handleHourClick(num || 12) : handleMinuteClick(num)}
              className={`absolute w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors z-10 ${
                isSelected ? 'text-transparent' : 'text-gray-700 hover:bg-gray-200'
              }`}
              style={{ left: x, top: y }}
            >
              {mode === 'minutes' ? num.toString().padStart(2, '0') : num}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-[320px] overflow-hidden"
      >
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-6">{title}</h3>
          
          <div className="flex items-center justify-center space-x-2 mb-2">
            <button 
              onClick={() => setMode('hours')}
              className={`text-5xl font-light rounded-2xl p-3 w-24 text-center transition-colors ${
                mode === 'hours' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {hours}
            </button>
            <span className="text-4xl text-gray-400 font-light pb-2">:</span>
            <button 
              onClick={() => setMode('minutes')}
              className={`text-5xl font-light rounded-2xl p-3 w-24 text-center transition-colors ${
                mode === 'minutes' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {minutes.toString().padStart(2, '0')}
            </button>
            
            <div className="flex flex-col space-y-2 ml-2">
              <button 
                onClick={() => setPeriod('AM')}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  period === 'AM' ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                AM
              </button>
              <button 
                onClick={() => setPeriod('PM')}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  period === 'PM' ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {renderClockFace()}
          
          <div className="flex justify-end items-center mt-8 space-x-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleOK}
              className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
