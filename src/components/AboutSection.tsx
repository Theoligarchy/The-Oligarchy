import React from 'react';
import { Instagram, Twitter, Linkedin } from 'lucide-react';
import { SOCIAL_LINKS } from './Footer';

export default function AboutSection() {
  return (
    <section className="bg-midnight py-16 px-6 md:px-12 max-w-5xl mx-auto fade-in">
      {/* Upper Eyebrow label */}
      <div className="font-sans text-[10px] font-semibold tracking-[0.35em] uppercase text-blood mb-8 flex items-center gap-3">
        <span className="w-6 h-px bg-blood" />
        About The Publication
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start select-text">
        {/* What is The Oligarchy Column */}
        <div className="md:col-span-7 flex flex-col gap-6 pr-0 md:pr-4">
          <h2 className="font-display text-3xl md:text-4xl font-semibold italic text-paper leading-tight">
            What is The Oligarchy?
          </h2>
          
          <div className="font-serif text-base text-paper/70 leading-relaxed flex flex-col gap-4">
            <p className="font-semibold text-paper/90">
              The Oligarchy is not an endorsement of rule by elites.
            </p>
            <p>
              The name reflects an interest in understanding how power operates inside societies, institutions, organisations, and human behaviour.
            </p>
            <p>
              Power is rarely distributed equally. Decisions are often shaped by incentives, structures, and small groups of individuals whose influence extends beyond public attention.
            </p>
            <p>
              This publication examines those systems through research rather than reaction.
            </p>
            <p className="border-l-2 border-blood pl-4 italic text-paper/50 my-2">
              The aim is not outrage. The aim is understanding.
            </p>
          </div>
        </div>

        {/* Founder Bio Card Column */}
        <div className="md:col-span-5">
          <div className="bg-navy border border-paper/10 p-6 md:p-8 rounded-sm shadow-xl flex flex-col gap-5">
            {/* Avatar placeholder with first letter */}
            <div className="w-14 h-14 bg-blood text-paper flex items-center justify-center font-display text-2xl font-bold rounded-full border border-paper/10 shadow-md">
              P
            </div>
            
            <div>
              <h3 className="font-display text-xl font-bold text-paper/90">
                Priyasha Priyal Jena
              </h3>
              <p className="font-sans text-[10px] font-semibold tracking-wider uppercase text-blood mt-0.5">
                Founder &amp; Editor-in-Chief
              </p>
            </div>

            <div className="font-serif text-sm text-paper/60 leading-relaxed flex flex-col gap-3.5">
              <p>
                Founder and Editor of The Oligarchy, an independent research publication exploring crime, psychology, politics, and systems of power.
              </p>
              <p>
                Founded at 19, the project began as an attempt to understand why people, institutions, and societies behave the way they do.
              </p>
              <p>
                The publication prioritises understanding before judgment and research before outrage.
              </p>
              <p className="italic text-paper/40">
                Currently studying business while building The Oligarchy as a long-term intellectual and publishing project.
              </p>
            </div>

            {/* Specialties tag grid */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {['Criminology', 'Behavioral Psyche', 'Corporate Fraud', 'Systems of Power'].map((tag) => (
                <span 
                  key={tag} 
                  className="font-sans text-[8px] tracking-wider uppercase bg-paper/5 border border-paper/10 text-paper/40 px-2.5 py-1 rounded-sm"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Founder Social Links - matching style exactly */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-paper/10">
              <a 
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-[9px] font-semibold tracking-widest uppercase bg-transparent border border-paper/10 hover:border-blood hover:text-paper text-paper/50 px-3 py-2 flex items-center gap-1.5 transition-colors duration-200"
              >
                <Instagram size={10} /> Instagram
              </a>
              <a 
                href={SOCIAL_LINKS.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-[9px] font-semibold tracking-widest uppercase bg-transparent border border-paper/10 hover:border-blood hover:text-paper text-paper/50 px-3 py-2 flex items-center gap-1.5 transition-colors duration-200"
              >
                <Twitter size={10} /> Twitter
              </a>
              <a 
                href={SOCIAL_LINKS.linkedinPersonal}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-[9px] font-semibold tracking-widest uppercase bg-transparent border border-paper/10 hover:border-blood hover:text-paper text-paper/50 px-3 py-2 flex items-center gap-1.5 transition-colors duration-200"
              >
                <Linkedin size={10} /> LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
