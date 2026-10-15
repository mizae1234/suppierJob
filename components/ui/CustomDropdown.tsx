'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: LucideIcon;
  dot?: string;
  badge?: string;
  badgeClass?: string;
}

export interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  icon?: LucideIcon;
  className?: string;
  buttonClassName?: string;
  dropdownWidth?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'เลือกตัวเลือก',
  icon: Icon,
  className = '',
  buttonClassName = '',
  dropdownWidth = 'min-w-[220px]',
  align = 'left',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all select-none w-full ${
          disabled
            ? 'opacity-60 bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : isOpen
            ? 'border-[#0f5238] ring-2 ring-[#0f5238]/15 bg-[#f4f9f5] text-[#0f5238] cursor-pointer shadow-2xs'
            : 'border-gray-200 bg-[#f4f9f5] hover:bg-gray-50 text-gray-700 hover:border-gray-300 cursor-pointer shadow-2xs'
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.dot && !selectedOption?.icon ? (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedOption.dot }}
            />
          ) : selectedOption?.icon ? (
            <selectedOption.icon
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: selectedOption.dot || (isOpen ? '#0f5238' : '#047857') }}
            />
          ) : Icon ? (
            <Icon className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-[#0f5238]' : 'text-emerald-700'}`} />
          ) : null}

          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0f5238]' : 'text-gray-400'
          }`}
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${dropdownWidth} max-w-[90vw] z-50 rounded-2xl bg-white border border-gray-100 shadow-xl overflow-hidden max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 py-1.5`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const OptionIcon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-[calc(100%-12px)] mx-1.5 my-0.5 flex items-center justify-between gap-2.5 px-3 py-2 text-xs rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-[#0f5238] font-bold shadow-2xs'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {option.dot && !OptionIcon ? (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: option.dot }}
                    />
                  ) : OptionIcon ? (
                    <OptionIcon
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: option.dot || (isSelected ? '#0f5238' : '#9ca3af') }}
                    />
                  ) : (
                    <span className="w-1.5" />
                  )}

                  <div className="flex flex-col min-w-0 text-left">
                    <span className="truncate">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-[10px] text-gray-400 font-normal truncate">
                        {option.sublabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-1">
                  {option.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        option.badgeClass || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {option.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#0f5238] shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
