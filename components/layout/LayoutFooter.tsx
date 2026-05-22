"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const FOOTER_PHRASES = [
  "Porque instalar 47 mods y rezar no cuenta como gestión.",
  "Porque tu carpeta de mods parece una boss fight de compatibilidad.",
  "Porque mezclar shaders al azar es ingeniería del caos.",
  "Porque un modpack estable vale más que mil tutoriales en YouTube.",
  "Porque encontrar un datapack no debería sentirse como arqueología.",
  "Porque Forge y Fabric ya pelean suficiente entre ellos.",
  "Porque abrir Minecraft sin crashes también es una feature.",
  "Porque el orden carga más rápido que el pánico.",
  "Porque ningún héroe merece debuggear mods a las 3 AM.",
  "Porque ‘funciona en mi PC’ no es una estrategia.",
  "Porque los mods deberían darte dopamina, no PTSD.",
  "Porque cada shader roto le quita 3 años de vida a tu GPU.",
  "Porque tu instalación de Minecraft necesita terapia y estructura.",
  "Porque sobrevivir a conflictos de versiones no debería ser endgame.",
  "Porque tener 200 mods sin explotar el juego merece respeto."
];

export function LayoutFooter() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentPhrase = FOOTER_PHRASES[currentIndex];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => {
        if (FOOTER_PHRASES.length <= 1) return prev;

        let next;

        do {
          next = Math.floor(Math.random() * FOOTER_PHRASES.length);
        } while (next === prev);

        return next;
      });
    }, 4500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <footer
      id="onboarding-footer"
      className="border-t border-primary/20 bg-background/60 px-6 py-10 backdrop-blur-md transition-colors duration-500"
    >
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-8 opacity-80 transition-opacity duration-700 hover:opacity-100 md:flex-row">

        {/* Left */}
        <div className="flex flex-col items-center gap-2 md:items-start">
          <div className="flex items-center gap-2">
            <Image
              src="/icon.png"
              alt="MIM Icon"
              width={20}
              height={20}
              className="h-5 w-5 animate-slime grayscale opacity-70"
            />

            <span className="font-headline text-[10px] font-medium uppercase tracking-[0.3em] text-foreground/70">
              Minecraft Intelligent Manager
            </span>
          </div>

          <p className="text-center text-[10px] font-light tracking-wide text-foreground/50 md:text-left">
            &copy; {new Date().getFullYear()} MIM Project.

            <span
              className="relative ml-2 inline-flex h-[16px] w-[220px] items-center overflow-hidden align-middle sm:w-[320px] lg:w-[420px]"
              style={{ perspective: 600 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentPhrase}
                  className="absolute left-0 top-0 inline-block text-primary/80"
                  initial={{
                    rotateX: 90,
                    opacity: 0,
                    y: 6
                  }}
                  animate={{
                    rotateX: 0,
                    opacity: 1,
                    y: 0
                  }}
                  exit={{
                    rotateX: -90,
                    opacity: 0,
                    y: -6
                  }}
                  transition={{
                    duration: 0.45,
                    ease: "easeOut"
                  }}
                  style={{
                    transformStyle: "preserve-3d",
                    display: "inline-block"
                  }}
                >
                  {currentPhrase}
                </motion.span>
              </AnimatePresence>
            </span>
          </p>
        </div>

        {/* Center */}
        <div className="flex items-center gap-8">
          <FooterLink
            label="Repository"
            href="https://github.com/Ian9Franco/MIM"
            value="github.com/Ian9Franco/MIM"
          />

          <div className="h-6 w-px bg-primary/20" />

          <FooterLink
            label="Developer"
            href="https://github.com/Ian9Franco"
            value="@Ian9Franco"
          />
        </div>

        {/* Right */}
        <div className="hidden lg:block">
          <a
            href="https://ian-pontorno-portfolio.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-52 text-right text-[10px] font-thin italic leading-relaxed text-foreground/50 transition-colors hover:text-primary"
          >
            Hecho con demasiado café,
            <br />
            commits impulsivos y noches
            <br />
            peleando contra conflictos absurdos.
          </a>
        </div>
      </div>
    </footer>
  );
}

type FooterLinkProps = {
  label: string;
  href: string;
  value: string;
};

function FooterLink({ label, href, value }: FooterLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-1 transition-all duration-300"
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/50 transition-colors group-hover:text-primary">
        {label}
      </span>

      <span className="text-[11px] font-medium text-foreground/70 transition-colors group-hover:text-foreground">
        {value}
      </span>
    </a>
  );
}