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

      {/* Editorial Divider Line */}
      <div className="w-full h-[1px] bg-paper/10 mt-24 mb-20" />

      {/* Founder's Essay Section */}
      <div className="max-w-3xl mx-auto text-left select-text">
        {/* Section Label */}
        <div className="font-sans text-[10px] font-semibold tracking-[0.35em] uppercase text-blood-light mb-4 flex items-center justify-center gap-3">
          <span className="w-6 h-px bg-blood-light/40" />
          Founder's Essay
          <span className="w-6 h-px bg-blood-light/40" />
        </div>

        {/* Main Heading */}
        <h2 className="font-display text-4xl md:text-5xl font-normal italic text-paper text-center mb-4 tracking-tight">
          Why I Founded The Oligarchy
        </h2>

        {/* Subheading */}
        <p className="font-serif text-lg md:text-xl text-paper/60 text-center italic max-w-xl mx-auto mb-16 leading-relaxed">
          "The simple answer is that it began with curiosity."
        </p>

        {/* Long-form Essay Body */}
        <div className="font-serif text-base md:text-lg text-paper/75 leading-relaxed space-y-8">
          <p>
            It was not a sudden decision, but a slow realization. A quiet progression of questions that began to demand answers—or if not answers, at least an honest, rigorous framework through which to examine them.
          </p>

          <p>
            It began with crime. As an observer of behavior, I wanted to understand what drives individuals to step outside the boundaries of society, to commit acts that others deem unthinkable. But crime does not exist in a vacuum. It is a symptom of a deeper, quieter machinery.
          </p>

          {/* Important Editorial Moment 1 */}
          <div className="border-l border-blood pl-4 py-1 my-6">
            <span className="font-display text-lg md:text-xl font-medium italic text-paper tracking-tight">
              Crime led to psychology. Psychology led to politics.
            </span>
          </div>

          {/* Centered Distinct Question 1 */}
          <div className="my-12 py-8 border-y border-paper/5 flex flex-col items-center">
            <span className="font-sans text-[9px] tracking-widest text-blood uppercase mb-2">Contemplation</span>
            <p className="font-display text-xl md:text-2xl text-paper font-normal italic text-center max-w-lg">
              "Why do some people become violent?"
            </p>
          </div>

          <p>
            No single discipline can explain the sheer complexity of human systems. To study the mind without studying the architecture of the state is to ignore the shape of the cage; to study the state without studying the mind is to ignore the animal inside.
          </p>

          {/* Important Editorial Moment 2 */}
          <div className="border-l border-blood pl-4 py-1 my-6">
            <span className="font-display text-lg md:text-xl font-medium italic text-paper tracking-tight">
              Everything influences everything else.
            </span>
          </div>

          <p>
            In our public discourse, we are constantly presented with pre-packaged conclusions. We are urged to react immediately, to choose sides, and to feel outraged before we even understand the underlying incentives at play. But outrage is exhausting, and it rarely solves the structural failures of our societies.
          </p>

          {/* Important Editorial Moment 3 */}
          <div className="border-l border-blood pl-4 py-1 my-6">
            <span className="font-display text-lg md:text-xl font-medium italic text-paper tracking-tight">
              Understanding began to feel more valuable than outrage.
            </span>
          </div>

          {/* Centered Distinct Question 2 */}
          <div className="my-12 py-8 border-y border-paper/5 flex flex-col items-center">
            <span className="font-sans text-[9px] tracking-widest text-blood uppercase mb-2">Inquiry</span>
            <p className="font-display text-xl md:text-2xl text-paper font-normal italic text-center max-w-lg">
              "Why do institutions fail?"
            </p>
          </div>

          <p>
            This shift in perspective completely changed how I approached research. Instead of searching for convenient villains, I began looking for incentives. Instead of seeking simple, comforting answers, I looked for systemic feedback loops. Eventually, I realized that some of the most profound truths lie in the gray areas.
          </p>

          {/* Important Editorial Moment 4 */}
          <div className="border-l border-blood pl-4 py-1 my-6">
            <span className="font-display text-lg md:text-xl font-medium italic text-paper tracking-tight">
              Questions became more interesting than conclusions.
            </span>
          </div>

          <p>
            And when you look closely at systems, you inevitably confront the architecture of control. Who writes the rules? How is compliance maintained? Who benefits, and who pays the price?
          </p>

          {/* Important Editorial Moment 5 */}
          <div className="border-l border-blood pl-4 py-1 my-6">
            <span className="font-display text-lg md:text-xl font-medium italic text-paper tracking-tight">
              An oligarchy is ultimately about power.
            </span>
          </div>

          {/* Centered Distinct Question 3 */}
          <div className="my-12 py-8 border-y border-paper/5 flex flex-col items-center">
            <span className="font-sans text-[9px] tracking-widest text-blood uppercase mb-2">Observation</span>
            <p className="font-display text-xl md:text-2xl text-paper font-normal italic text-center max-w-xl">
              "Why do societies normalize certain behaviours and condemn others?"
            </p>
          </div>

          <p>
            This power is rarely distributed equally, and it is rarely as simple as a direct conspiracy. It is the natural tendency of complex human organizations to consolidate power into the hands of a few. It is the physics of human organization. To study it requires a dispassionate, analytical mind.
          </p>

          {/* Important Editorial Moment 6 */}
          <div className="border-l border-blood pl-4 py-1 my-6">
            <span className="font-display text-lg md:text-xl font-medium italic text-paper tracking-tight">
              I founded The Oligarchy at 19 years old.
            </span>
          </div>

          <p>
            At that age, one is often told to wait, to learn, and to accept the existing interpretations of the world. But the hunger to analyze these systems firsthand could not be deferred. The Oligarchy was created as an independent sanctuary for rigorous inquiry, free from institutional bias and the demands of modern sensationalist media.
          </p>

          <p>
            The path ahead is long, and there is an infinite amount of terrain left to explore.
          </p>

          {/* Important Editorial Moments 7 & 8 */}
          <div className="border-l border-blood pl-4 py-1 my-6 flex flex-col gap-2">
            <span className="font-display text-lg md:text-xl font-medium italic text-paper tracking-tight block">
              The publication will evolve.
            </span>
            <span className="font-display text-lg md:text-xl font-medium italic text-paper tracking-tight block">
              Its founder will evolve.
            </span>
          </div>

          <p>
            But the core compass will remain entirely unchanged. We will continue to investigate the quiet incentives, structures, and dynamics that shape our shared world, driven by nothing other than a relentless search for clarity.
          </p>
        </div>

        {/* Closing Book Treatment & Philosophical Mission Statement */}
        <div className="mt-20 pt-16 border-t border-paper/10 flex flex-col items-center text-center">
          <span className="text-blood text-sm tracking-[0.5em] mb-8 select-none">❖</span>
          
          <div className="font-display text-2xl md:text-3xl text-paper italic tracking-wide max-w-xl mx-auto leading-relaxed space-y-6">
            <p className="text-paper/90">
              "Why do people become who they become?"
            </p>
            <p className="text-paper">
              The Oligarchy exists in pursuit of that question.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
