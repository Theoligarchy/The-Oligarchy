import React, { useState, useEffect } from 'react';
import { Search, Menu, X, Settings, Share2, Check } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSearch: (query: string) => void;
}

export default function Header({ activeTab, setActiveTab, onSearch }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [todayDate, setTodayDate] = useState('');
  const [platformCopied, setPlatformCopied] = useState(false);

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    setTodayDate(new Date().toLocaleDateString('en-GB', options));
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    onSearch(q);
  };

  const navigateTo = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="bg-ink border-b-3 border-double border-paper/20 select-none">
      {/* Upper Masthead Info Bar */}
      <div className="font-sans text-[10px] md:text-xs text-paper/40 tracking-[0.18em] uppercase py-2.5 px-6 border-b border-paper/10 flex flex-wrap justify-between gap-2">
        <span>theoligarchy.in</span>
        <span className="hidden md:inline">Independent Research Platform</span>
        <span>{todayDate}</span>
      </div>

      {/* Main Gothic Masthead Logo */}
      <div className="text-center py-6 md:py-8 flex flex-col items-center justify-center gap-3">
        <h1 
          onClick={() => navigateTo('home')} 
          className="font-gothic text-5xl md:text-8xl text-paper hover:text-blood transition-colors duration-300 cursor-pointer selection:bg-blood selection:text-paper leading-none"
        >
          The Oligarchy
        </h1>
        <p className="font-serif text-xs md:text-sm italic text-paper/40 tracking-[0.05em] mt-1 selection:bg-blood selection:text-paper">
          Research · Analysis · Critical Thinking
        </p>
      </div>

      {/* Academic triple focus headers */}
      <div className="flex border-y border-paper/15 text-center divide-x divide-paper/10 text-paper/30 font-sans uppercase text-[10px] tracking-[0.2em] py-2">
        <span className="flex-1">Criminology</span>
        <span className="flex-1">Psyche</span>
        <span className="flex-1">Politics</span>
      </div>

      {/* Primary Navigation Bar */}
      <nav className="bg-ink border-b border-blood flex justify-between items-center px-4 md:px-8 relative z-50">
        {/* Desktop Links */}
        <div className="hidden md:flex items-center">
          {[
            { id: 'home', label: 'Home' },
            { id: 'research', label: 'Research Areas' },
            { id: 'principles', label: 'Editorial Principles' },
            { id: 'about', label: 'About' },
            { id: 'contact', label: 'Contact' },
            { id: 'admin', label: '⚙️ Admin' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`font-sans text-[11px] font-semibold tracking-widest uppercase py-4 px-5 border-r border-paper/10 transition-all duration-200 cursor-pointer ${
                activeTab === item.id 
                  ? 'bg-blood text-paper' 
                  : 'text-paper/60 hover:bg-blood hover:text-paper'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Mobile Hamburger Trigger */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-paper/70 p-3 hover:text-paper transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Right side controls: Search and Theme */}
        <div className="flex items-center gap-4 py-2">
          {/* Share Platform Button */}
          <div className="relative">
            <button 
              onClick={() => {
                const mainUrl = 'https://theoligarchy.in';
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(mainUrl).then(() => {
                    setPlatformCopied(true);
                    setTimeout(() => setPlatformCopied(false), 2000);
                  }).catch(() => {
                    const tempInput = document.createElement('input');
                    tempInput.value = mainUrl;
                    document.body.appendChild(tempInput);
                    tempInput.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempInput);
                    setPlatformCopied(true);
                    setTimeout(() => setPlatformCopied(false), 2000);
                  });
                } else {
                  const tempInput = document.createElement('input');
                  tempInput.value = mainUrl;
                  document.body.appendChild(tempInput);
                  tempInput.select();
                  document.execCommand('copy');
                  document.body.removeChild(tempInput);
                  setPlatformCopied(true);
                  setTimeout(() => setPlatformCopied(false), 2000);
                }
              }}
              className="text-paper/60 hover:text-blood transition-colors p-2 cursor-pointer relative flex items-center justify-center"
              title="Copy Platform Link to Share"
            >
              {platformCopied ? <Check size={18} className="text-green-500 animate-pulse" /> : <Share2 size={18} />}
            </button>
            
            {/* Elegant Tooltip Popover */}
            {platformCopied && (
              <div className="absolute right-0 top-10 bg-blood text-paper font-sans text-[9px] font-bold tracking-wider uppercase py-1 px-2.5 rounded-sm shadow-md whitespace-nowrap z-[100] border border-paper/10 animate-fade-in">
                Platform Link Copied!
              </div>
            )}
          </div>

          {/* Inline Search Bar */}
          <div className="relative flex items-center bg-paper/5 border border-paper/12 rounded-sm px-2.5 py-1">
            <Search size={14} className="text-paper/30 mr-1.5" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="bg-transparent text-paper font-serif text-sm focus:outline-none w-32 md:w-44 transition-all duration-300 focus:w-48 placeholder-paper/25"
            />
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-ink border-b border-blood flex flex-col divide-y divide-paper/10">
          {[
            { id: 'home', label: 'Home' },
            { id: 'research', label: 'Research Areas' },
            { id: 'principles', label: 'Editorial Principles' },
            { id: 'about', label: 'About' },
            { id: 'contact', label: 'Contact' },
            { id: 'admin', label: '⚙️ Admin Dashboard' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`font-sans text-[11px] font-semibold tracking-widest uppercase text-left py-4 px-6 transition-colors duration-200 cursor-pointer ${
                activeTab === item.id ? 'bg-blood text-paper' : 'text-paper/60 hover:bg-blood/50 hover:text-paper'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
