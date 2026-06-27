import React, { useState, useEffect } from 'react';
import { Sun, Moon, Search, Menu, X, Settings } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSearch: (query: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export default function Header({ activeTab, setActiveTab, onSearch, theme, setTheme }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [todayDate, setTodayDate] = useState('');

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    setTodayDate(new Date().toLocaleDateString('en-GB', options));
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    onSearch(q);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
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
      <div className="text-center py-6 md:py-8">
        <h1 
          onClick={() => navigateTo('home')} 
          className="font-gothic text-5xl md:text-8xl text-paper hover:text-blood transition-colors duration-300 cursor-pointer selection:bg-blood selection:text-paper"
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
          {/* Theme switcher integrated into the navigation menu */}
          <button 
            onClick={toggleTheme}
            className="text-paper/60 hover:text-blood transition-colors p-2 cursor-pointer"
            title={theme === 'dark' ? "Switch to Light Academic Theme" : "Switch to Dark Gothic Theme"}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

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
