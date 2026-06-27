import React from 'react';

export default function EditorialPrinciples() {
  const principles = [
    {
      title: 'Understanding before judgment.',
      desc: 'Our primary objective is to comprehend the underlying mechanisms of human actions and systems. Moral condemnation or celebration is deferred in favor of descriptive accuracy.'
    },
    {
      title: 'Research before outrage.',
      desc: 'Modern media thrives on immediate emotional reactions. We choose instead to pause, collect historical facts, verify data, and present our findings only when a thorough synthesis has been completed.'
    },
    {
      title: 'Evidence over ideology.',
      desc: 'We do not twist observations to fit pre-existing political or sociological dogmas. When empirical evidence contradicts popular theoretical structures, we favor the evidence.'
    },
    {
      title: 'Complexity over certainty.',
      desc: 'Systems of power are rarely simple. We reject binary narratives of absolute good versus absolute evil, embracing the nuanced, multi-faceted nature of organizational behavior and human psyche.'
    },
    {
      title: 'Sources over speculation.',
      desc: 'Every claim we make must be traceable back to verifiable records. We document our citations meticulously, allowing readers to audit our primary materials directly.'
    },
    {
      title: 'Incentives matter.',
      desc: 'To understand behavior—whether of an individual offender or a corporate elite—one must analyze the reward structures and systemic pressures acting upon them.'
    },
    {
      title: 'Institutions shape behaviour.',
      desc: 'Human beings do not act in a vacuum. The design of our institutions, courts, banks, and bureaucracy forms the psychological landscape within which decisions are made.'
    }
  ];

  return (
    <section className="bg-midnight py-16 px-6 md:px-12 max-w-4xl mx-auto fade-in">
      {/* Upper Eyebrow label */}
      <div className="font-sans text-[10px] font-semibold tracking-[0.35em] uppercase text-blood mb-8 flex items-center gap-3">
        <span className="w-6 h-px bg-blood" />
        Editorial Philosophy
      </div>

      <div className="flex flex-col gap-6 mb-12 select-text">
        <h2 className="font-display text-3xl md:text-4xl font-semibold italic text-paper leading-tight">
          Our Guiding Principles
        </h2>
        <p className="font-serif text-base text-paper/60 leading-relaxed max-w-2xl">
          The Oligarchy operates as an independent review. We seek to study power and behavior with a level of scholarly detachment, ensuring that our findings are built for years of contemplation rather than hours of social engagement.
        </p>
      </div>

      {/* Grid listing the principles elegantly */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-paper/10 select-text">
        {principles.map((p, index) => (
          <div key={p.title} className="flex gap-4 items-start bg-navy/40 border border-paper/5 p-5 hover:border-blood/30 transition-all duration-300">
            <span className="font-mono text-xs text-blood font-semibold mt-1">
              {String(index + 1).padStart(2, '0')}.
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="font-display text-base font-bold text-paper/90 leading-tight">
                {p.title}
              </h3>
              <p className="font-serif text-sm text-paper/50 leading-relaxed">
                {p.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
