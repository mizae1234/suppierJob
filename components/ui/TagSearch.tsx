'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface TagSearchProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  accentColor?: string;
  className?: string;
  variant?: 'default' | 'header';
}

export default function TagSearch({
  tags,
  onTagsChange,
  placeholder = 'ค้นหาตาม VIN / รุ่น / ทะเบียน...',
  accentColor = '#0f5238',
  className = '',
  variant = 'default',
}: TagSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse raw text into tags (split by comma, semicolon, newline, tab)
  const parseTerms = useCallback((raw: string): string[] => {
    return raw
      .split(/[,\n\t;]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }, []);

  const addTags = useCallback((newTerms: string[]) => {
    const unique = newTerms.filter(t => !tags.includes(t));
    if (unique.length > 0) {
      onTagsChange([...tags, ...unique]);
    }
  }, [tags, onTagsChange]);

  const removeTag = useCallback((tagToRemove: string) => {
    onTagsChange(tags.filter(t => t !== tagToRemove));
  }, [tags, onTagsChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const terms = parseTerms(inputValue);
      if (terms.length > 0) {
        addTags(terms);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove last tag when pressing backspace on empty input
      onTagsChange(tags.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const terms = parseTerms(pasted);
    if (terms.length > 0) {
      addTags(terms);
      setInputValue('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Auto-convert if comma, semicolon, or newline typed or pasted
    if (val.includes(',') || val.includes(';') || val.includes('\n')) {
      const terms = parseTerms(val);
      if (terms.length > 0) {
        addTags(terms);
        setInputValue('');
        return;
      }
    }
    setInputValue(val);
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      const terms = parseTerms(inputValue);
      if (terms.length > 0) {
        addTags(terms);
        setInputValue('');
      }
    }
  };

  const clearAll = () => {
    onTagsChange([]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const isHeader = variant === 'header';

  return (
    <div
      className={`relative w-full transition-all duration-200 cursor-text flex items-center ${
        isHeader
          ? 'h-10 rounded-full bg-[#f4f9f5] border border-gray-200/90 shadow-2xs focus-within:bg-white focus-within:border-[#0f5238] focus-within:ring-2 focus-within:ring-[#0f5238]/15 px-3.5 gap-2'
          : 'min-h-[2.5rem] rounded-xl bg-white border border-gray-200/90 shadow-2xs focus-within:border-[#0f5238] focus-within:ring-2 focus-within:ring-[#0f5238]/15 px-3.5 py-1.5 gap-2'
      } ${className}`}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Search icon */}
      <Search className="w-4 h-4 text-gray-400 shrink-0" />

      {/* Tags & Input Container */}
      <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${isHeader ? 'overflow-x-auto no-scrollbar py-0.5' : 'flex-wrap py-0.5'}`}>
        {/* Tags */}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-semibold shrink-0 border border-[#0f5238]/20 bg-[#0f5238]/10 text-[#0f5238] hover:bg-[#0f5238]/15 transition-colors shadow-2xs"
          >
            <span className="font-mono text-[12px] font-bold">
              {tag}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[#0f5238]/60 hover:text-[#0f5238] hover:bg-[#0f5238]/20 transition-colors ml-0.5"
              title={`ลบ ${tag}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : 'พิมพ์เพิ่ม... (Enter)'}
          className="flex-1 min-w-[90px] h-7 text-xs sm:text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-900 font-medium"
        />
      </div>

      {/* Clear button (pinned right, never wraps!) */}
      {(tags.length > 0 || inputValue) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clearAll();
          }}
          className="shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition-colors ml-1"
          title="ล้างทั้งหมด"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
