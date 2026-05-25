import React, { useState, useEffect } from "react";

const HEADLINE_PHRASES = [
  { p1: "Explora las", h: "{tendencias}", p2: "de la comunidad" },
  { p1: "Y los", h: "{picks}", p2: "mensuales" }
];

const HEADLINE_DESCRIPTION = [
  "Explora las colecciones dinámicas de CurseForge y Modrinth. Te traemos los mejores mods curados mes a mes.",
  "Descubre las selecciones mensuales curadas de CurseForge y Modrinth y mantente al día con lo más destacado." 
];

export function AnimatedHeadline() {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [descSubIndex, setDescSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (subIndex === 0 && index === 0 && !isDeleting) {
      setSubIndex(1);
      setDescSubIndex(1);
    }
  }, [subIndex, index, isDeleting]);

  useEffect(() => {
    const phrase = HEADLINE_PHRASES[index];
    const description = HEADLINE_DESCRIPTION[index];
    const fullText = `${phrase.p1}\n${phrase.h}\n${phrase.p2}`;

    if (subIndex === fullText.length && descSubIndex === description.length && !isDeleting) {
      const timeout = setTimeout(() => setIsDeleting(true), 5000);
      return () => clearTimeout(timeout);
    }

    if (subIndex === 0 && descSubIndex === 0 && isDeleting) {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % HEADLINE_PHRASES.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => {
        const next = prev + (isDeleting ? -1 : 1);
        return Math.max(0, Math.min(next, fullText.length));
      });
      setDescSubIndex((prev) => {
        const next = prev + (isDeleting ? -1 : 1);
        return Math.max(0, Math.min(next, description.length));
      });
    }, isDeleting ? 12 : 32);

    return () => clearTimeout(timeout);
  }, [subIndex, descSubIndex, isDeleting, index]);

  useEffect(() => {
    const interval = setInterval(() => setBlink((prev) => !prev), 500);
    return () => clearInterval(interval);
  }, []);

  const phrase = HEADLINE_PHRASES[index];
  const description = HEADLINE_DESCRIPTION[index];
  const fullText = `${phrase.p1}\n${phrase.h}\n${phrase.p2}`;
  const currentText = fullText.substring(0, subIndex);
  const lines = currentText.split('\n');
  const currentDescription = description.substring(0, descSubIndex);

  return (
    <>
      <h1 className="font-headline text-5xl xl:text-7xl leading-[1.1] tracking-tight text-white mb-4 min-h-[160px] xl:min-h-[230px]">
        {lines.map((line, i, arr) => {
          if (i === 1) {
            return (
              <React.Fragment key={i}>
                <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">
                  {line}
                </span>
                {i < arr.length - 1 && <br />}
              </React.Fragment>
            );
          }
          return (
            <React.Fragment key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </React.Fragment>
          );
        })}
        <span className={`inline-block w-[4px] h-[0.8em] bg-white ml-2 align-middle transition-opacity duration-100 ${blink ? 'opacity-100' : 'opacity-0'}`} />
      </h1>
      <p className="font-caption text-sm xl:text-base opacity-60 leading-relaxed min-h-[48px]">
        {currentDescription}
      </p>
    </>
  );
}
