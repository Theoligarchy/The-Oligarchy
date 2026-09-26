import React, { useState } from 'react';
import { Instagram, Twitter, Linkedin, Mail, CheckCircle2, Send, Rss } from 'lucide-react';
import { SiteSettings, SignupLocation } from '../types';

interface FooterProps {
  setActiveTab: (tab: string) => void;
  setCategoryFilter: (filter: string) => void;
  siteSettings?: SiteSettings;
  onSubscribe?: (email: string, location: SignupLocation) => Promise<boolean>;
}

export const DEFAULT_SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/theoligarchy.in?igsh=bjV4ZGhpdnJxbjV4',
  twitter: 'https://x.com/TheOligarchy_',
  linkedinCompany: 'https://www.linkedin.com/company/the-oligarchy',
  linkedinPersonal: 'https://www.linkedin.com/in/priyashapriyaljena',
  email: 'theoligarchy.ppj@gmail.com'
};

export const SOCIAL_LINKS = DEFAULT_SOCIAL_LINKS;

export default function Footer({ setActiveTab, setCategoryFilter, siteSettings, onSubscribe }: FooterProps) {
  const [footerEmail, setFooterEmail] = useState('');
  const [footerSuccess, setFooterSuccess] = useState(false);
  const [footerSubmitting, setFooterSubmitting] = useState(false);

  const socials = siteSettings?.socials || DEFAULT_SOCIAL_LINKS;
  const footerDesc = siteSettings?.footerDescription || 'Independent research platform. Free of corporate sponsorship, commercial agendas, and attention-seeking headlines. Powered strictly by empirical research and critical inquiry.';
  const copyright = siteSettings?.copyrightText || 'THE OLIGARCHY. ALL RIGHTS RESERVED.';
  const disclaimer = siteSettings?.disclaimerText || 'Educational resource only under critical inquiry.';
  
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
    <footer className="bg-ink border-t-2 border-blood pt-16 pb-8 px-6 md:px-12 select-none no-print">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        
        {/* Brand & Social Column */}
        <div className="flex flex-col gap-4">
          <span className="font-gothic text-3xl text-paper/90">{siteSettings?.siteName || 'The Oligarchy'}</span>
          <p className="font-serif text-sm text-paper/35 leading-relaxed">
            {footerDesc}
          </p>
          
          {/* Side-by-side Social Links */}
          <div className="flex gap-2.5 mt-2">
            {socials.instagram && (
              <a 
                href={socials.instagram} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood flex items-center justify-center transition-all duration-200"
                title="Follow us on Instagram"
              >
                <Instagram size={15} />
              </a>
            )}
            {socials.twitter && (
              <a 
                href={socials.twitter} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood flex items-center justify-center transition-all duration-200"
                title="Follow us on X / Twitter"
              >
                <Twitter size={15} />
              </a>
            )}
            {(socials.linkedinCompany || socials.linkedinPersonal) && (
              <a 
                href={socials.linkedinCompany || socials.linkedinPersonal} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood flex items-center justify-center transition-all duration-200"
                title="Follow our LinkedIn Page"
              >
                <Linkedin size={15} />
              </a>
            )}
            {socials.email && (
              <a 
                href={`mailto:${socials.email}`} 
                className="w-9 h-9 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood flex items-center justify-center transition-all duration-200"
                title="Email Editorial Office"
              >
                <Mail size={15} />
              </a>
            )}
            <a 
              href="/feed.xml" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-9 h-9 border border-paper/10 text-paper/50 hover:text-orange-400 hover:border-orange-400/50 flex items-center justify-center transition-all duration-200"
              title="RSS / Atom Syndication Feed (feed.xml)"
            >
              <Rss size={15} />
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
              <button onClick={() => handlePageNavigate('contributors')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                Contributors Registry
              </button>
            </li>
            <li>
              <button onClick={() => handlePageNavigate('contributor-dashboard')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer">
                Contributor Dashboard &amp; Analytics
              </button>
            </li>
            <li>
              <button onClick={() => handlePageNavigate('submit-investigation')} className="hover:text-paper hover:underline transition-colors text-left cursor-pointer text-blood-light font-semibold">
                Submit an Investigation
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
                Disclaimer: {disclaimer}
              </span>
            </li>
            <li>
              <span className="hover:text-paper transition-colors select-text">
                Privacy: Minimal local cookies only.
              </span>
            </li>
            <li>
              <span className="hover:text-paper transition-colors select-text">
                Terms: Non-commercial fair research inquiry.
              </span>
            </li>
            <li>
              <a 
                href="/feed.xml" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-orange-400 transition-colors text-left flex items-center gap-1.5 text-paper/50"
                title="Syndicated RSS Feed (XML / Atom) for Feedly, NetNewsWire, and academic feed readers"
              >
                <Rss size={12} className="text-orange-400/80 shrink-0" /> RSS Syndication (feed.xml)
              </a>
            </li>
          </ul>

          {/* Footer Dispatch Signup */}
          {onSubscribe && (
            <div className="mt-4 pt-3 border-t border-paper/10">
              <span className="block font-sans text-[10px] uppercase tracking-wider text-paper/40 mb-1.5">
                Research Dispatch
              </span>
              {footerSuccess ? (
                <div className="flex items-center gap-1.5 text-[#8bc4a8] text-xs font-serif">
                  <CheckCircle2 size={13} />
                  <span>Subscribed</span>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!footerEmail.trim() || footerSubmitting) return;
                    setFooterSubmitting(true);
                    try {
                      const ok = await onSubscribe(footerEmail.trim(), 'footer');
                      if (ok) {
                        setFooterEmail('');
                        setFooterSuccess(true);
                        setTimeout(() => setFooterSuccess(false), 6000);
                      }
                    } finally {
                      setFooterSubmitting(false);
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    type="email"
                    placeholder="scholar@domain.edu"
                    value={footerEmail}
                    onChange={(e) => setFooterEmail(e.target.value)}
                    className="bg-midnight border border-paper/15 text-paper text-xs px-2 py-1 rounded-xs flex-1 min-w-0 focus:outline-none focus:border-blood font-serif placeholder-paper/20"
                  />
                  <button
                    type="submit"
                    disabled={footerSubmitting}
                    className="bg-blood/80 hover:bg-blood text-paper px-2 py-1 rounded-xs text-xs font-sans uppercase tracking-wider cursor-pointer shrink-0 disabled:opacity-50"
                    title="Subscribe to research dispatch"
                  >
                    <Send size={11} />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Bottom Credentials Bar */}
      <div className="max-w-7xl mx-auto border-t border-paper/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center">
        <span className="font-sans text-[10px] tracking-widest text-paper/20 uppercase">
          &copy; {new Date().getFullYear()} {copyright}
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
