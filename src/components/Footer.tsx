import React from 'react';
import { Instagram, Twitter, Linkedin, BookOpen } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
  setCategoryFilter: (filter: string) => void;
}

export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/theoligarchy.in?igsh=bjV4ZGhpdnJxbjV4',
  twitter: 'https://x.com/TheOligarchy_',
  linkedinCompany: 'https://www.linkedin.com/company/the-oligarchy',
  linkedinPersonal: 'https://www.linkedin.com/in/priyashapriyaljena'
};

export default function Footer({ setActiveTab, setCategoryFilter }: FooterProps) {
  
  const handleFocusAreaClick = (area: string) => {
    setCategoryFilter(area);
    setActiveTab('home');
    setTimeout(() => {
      const anchor = document.getElementById('analyses-anchor');
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePageNavigate = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-ink border-t-2 border-blood pt-16 pb-8 px-6 md:px-12 select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        
        {/* Brand & Social Column */}
        <div className="flex flex-col gap-4">
          <span className="font-gothic text-3xl text-paper/90">The Oligarchy</span>
          <p className="font-serif text-sm text-paper/35 leading-relaxed">
            Independent research platform. Free of corporate sponsorship, commercial agendas, and attention-seeking headlines. Powered strictly by empirical research and critical inquiry.
          </p>
          
          {/* Side-by-side Social Links */}
          <div className="flex gap-2.5 mt-2">
            <a 
              href={SOCIAL_LINKS.instagram} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-9 h-9 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood flex items-center justify-center transition-all duration-200"
              title="Follow us on Instagram"
            >
              <Instagram size={15} />
            </a>
            <a 
              href={SOCIAL_LINKS.twitter} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-9 h-9 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood flex items-center justify-center transition-all duration-200"
              title="Follow us on X / Twitter"
            >
              <Twitter size={15} />
            </a>
            <a 
              href={SOCIAL_LINKS.linkedinCompany} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-9 h-9 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood flex items-center justify-center transition-all duration-200"
              title="Follow our LinkedIn Company Page"
            >
              <Linkedin size={15} />
            </a>
          </div>
        </div>

        {/* Focus Areas Column */}
        <div>
          <h4 className="font-sans text-[11px] font-bold tracking-[0.25em] uppercase text-blood border-b border-blood/25 pb-2 mb-4">
            Research Areas
          </h4>
          <ul className="font-serif text-sm flex flex-col gap-2.5 text-paper/35">
            <li>
              <button onClick={() => handleFocusAreaClick('criminology')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                Criminology &amp; Forensics
              </button>
            </li>
            <li>
              <button onClick={() => handleFocusAreaClick('psyche')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                Psyche &amp; Behaviour
              </button>
            </li>
            <li>
              <button onClick={() => handleFocusAreaClick('politics')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                Politics &amp; Institutions
              </button>
            </li>
            <li>
              <button onClick={() => handleFocusAreaClick('case-studies')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                Long-form Case Studies
              </button>
            </li>
            <li>
              <button onClick={() => handleFocusAreaClick('research-notes')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                Research Notes
              </button>
            </li>
          </ul>
        </div>

        {/* Platform Column */}
        <div>
          <h4 className="font-sans text-[11px] font-bold tracking-[0.25em] uppercase text-blood border-b border-blood/25 pb-2 mb-4">
            The Publication
          </h4>
          <ul className="font-serif text-sm flex flex-col gap-2.5 text-paper/35">
            <li>
              <button onClick={() => handlePageNavigate('about')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                About The Project
              </button>
            </li>
            <li>
              <button onClick={() => handlePageNavigate('principles')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                Editorial Principles
              </button>
            </li>
            <li>
              <button onClick={() => handlePageNavigate('contact')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                Submit Research Tip
              </button>
            </li>
            <li>
              <button onClick={() => handlePageNavigate('admin')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                Editorial Panel
              </button>
            </li>
          </ul>
        </div>

        {/* Legal Column */}
        <div>
          <h4 className="font-sans text-[11px] font-bold tracking-[0.25em] uppercase text-blood border-b border-blood/25 pb-2 mb-4">
            Legal &amp; Archive
          </h4>
          <ul className="font-serif text-sm flex flex-col gap-2.5 text-paper/35">
            <li>
              <span className="hover:text-paper transition-colors select-text">
                Disclaimer: Educational resource only.
              </span>
            </li>
            <li>
              <span className="hover:text-paper transition-colors select-text">
                Privacy Policy: Local cookies only.
              </span>
            </li>
            <li>
              <span className="hover:text-paper transition-colors select-text">
                Terms: Non-commercial license.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Bottom Credentials Bar */}
      <div className="max-w-7xl mx-auto border-t border-paper/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center">
        <span className="font-sans text-[10px] tracking-widest text-paper/20">
          &copy; {new Date().getFullYear()} THE OLIGARCHY. ALL RIGHTS RESERVED.
        </span>
        <span className="font-sans text-[10px] tracking-widest text-paper/20 uppercase">
          theoligarchy.in
        </span>
        <span className="font-sans text-[10px] tracking-[0.15em] text-paper/20 uppercase">
          Independent · Analytical · Educational
        </span>
      </div>
    </footer>
  );
}
