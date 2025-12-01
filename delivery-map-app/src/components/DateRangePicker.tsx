import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  label?: string;
  minDate?: string; // Minimum selectable date (YYYY-MM-DD)
  maxDate?: string; // Maximum selectable date (YYYY-MM-DD)
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  label,
  minDate,
  maxDate
}) => {
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(event.target as Node)) {
        setShowFromCalendar(false);
      }
      if (toRef.current && !toRef.current.contains(event.target as Node)) {
        setShowToCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const renderCalendar = (dateStr: string, onChange: (date: string) => void, isFrom: boolean) => {
    const date = dateStr ? new Date(dateStr) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = generateCalendarDays(year, month);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const isDateDisabled = (day: number | null): boolean => {
      if (day === null) return true;
      const checkDate = new Date(year, month, day);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (minDate && dateStr < minDate) return true;
      if (maxDate && dateStr > maxDate) return true;
      
      // For "from" date, ensure it's not after "to" date
      if (isFrom && toDate && dateStr > toDate) return true;
      // For "to" date, ensure it's not before "from" date
      if (!isFrom && fromDate && dateStr < fromDate) return true;
      
      return false;
    };

    const handleDateClick = (day: number) => {
      if (isDateDisabled(day)) return;
      const selectedDate = new Date(year, month, day);
      const dateStr = selectedDate.toISOString().split('T')[0];
      onChange(dateStr);
      if (isFrom) {
        setShowFromCalendar(false);
      } else {
        setShowToCalendar(false);
      }
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
      const newDate = new Date(year, month + (direction === 'next' ? 1 : -1), 1);
      const newDateStr = newDate.toISOString().split('T')[0];
      onChange(newDateStr);
    };

    const isDateSelected = (day: number | null): boolean => {
      if (day === null) return false;
      const checkDate = new Date(year, month, day);
      const selectedDate = dateStr ? new Date(dateStr) : null;
      if (!selectedDate) return false;
      return checkDate.toDateString() === selectedDate.toDateString();
    };

    const isDateInRange = (day: number | null): boolean => {
      if (day === null || !fromDate || !toDate) return false;
      const checkDate = new Date(year, month, day);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return checkDate >= from && checkDate <= to;
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded"
            type="button"
          >
            ‹
          </button>
          <h3 className="text-sm font-semibold text-gray-700">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded"
            type="button"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <button
              key={index}
              onClick={() => day !== null && handleDateClick(day)}
              disabled={day === null || isDateDisabled(day)}
              className={`
                p-2 text-sm rounded
                ${day === null ? 'cursor-default' : ''}
                ${isDateDisabled(day) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}
                ${isDateSelected(day) ? 'bg-blue-600 text-white font-semibold' : ''}
                ${!isDateSelected(day) && isDateInRange(day) ? 'bg-blue-100 text-blue-700' : ''}
                ${!isDateSelected(day) && !isDateInRange(day) && !isDateDisabled(day) ? 'text-gray-700' : ''}
              `}
              type="button"
            >
              {day || ''}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-4">
      {label && <span className="text-sm text-gray-600">{label}</span>}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 relative" ref={fromRef}>
          <label className="text-sm text-gray-600">From:</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              readOnly
              value={formatDate(fromDate)}
              onClick={() => {
                setShowFromCalendar(!showFromCalendar);
                setShowToCalendar(false);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-32"
            />
            <button
              onClick={() => {
                setShowFromCalendar(!showFromCalendar);
                setShowToCalendar(false);
              }}
              className="p-2 hover:bg-gray-100 rounded"
              type="button"
            >
              <Calendar className="text-gray-500" size={18} />
            </button>
          </div>
          {showFromCalendar && (
            <div className="absolute top-full left-0 mt-1 z-50">
              {renderCalendar(fromDate, onFromDateChange, true)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 relative" ref={toRef}>
          <label className="text-sm text-gray-600">To:</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              readOnly
              value={formatDate(toDate)}
              onClick={() => {
                setShowToCalendar(!showToCalendar);
                setShowFromCalendar(false);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-32"
            />
            <button
              onClick={() => {
                setShowToCalendar(!showToCalendar);
                setShowFromCalendar(false);
              }}
              className="p-2 hover:bg-gray-100 rounded"
              type="button"
            >
              <Calendar className="text-gray-500" size={18} />
            </button>
          </div>
          {showToCalendar && (
            <div className="absolute top-full left-0 mt-1 z-50">
              {renderCalendar(toDate, onToDateChange, false)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

