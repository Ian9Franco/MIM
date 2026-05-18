import React from "react";
import Image from "next/image";

export function LayoutFooter() {
  return (
    <footer id="onboarding-footer" className="px-6 py-10 border-t border-primary/20 bg-background/60 backdrop-blur-md transition-colors duration-500">
      <div className="max-w-400 mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-80 hover:opacity-100 transition-opacity duration-700">
        
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2">
            <Image src="/icon.png" alt="" width={20} height={20} className="w-5 h-5 grayscale opacity-70 animate-slime" />
            <span className="font-headline text-[10px] tracking-[0.3em] uppercase text-foreground/70 font-medium">Minecraft Intelligent Manager</span>
          </div>
          <p className="text-[10px] font-light tracking-wide text-foreground/50">
            &copy; {new Date().getFullYear()} MIM Project. Porque organizar mods manualmente debería ser ilegal.
          </p>
        </div>

        <div className="flex items-center gap-8">
          <FooterLink label="Repository" href="https://github.com/Ian9Franco/MIM" value="github.com/Ian9Franco/MIM" />
          <div className="w-px h-6 bg-primary/20" />
          <FooterLink label="Developer" href="https://github.com/Ian9Franco" value="@Ian9Franco" />
        </div>

        <div className="hidden lg:block">
          <a 
            href="https://ian-pontorno-portfolio.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-foreground/50 hover:text-primary font-thin italic max-w-50 text-right leading-relaxed block transition-colors"
          >
            Hecho con mucho cold brew y demasiadas <br /> noches sin dormir por Ian.
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ label, href, value }: any) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-1 transition-all duration-300">
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-foreground/50 group-hover:text-primary transition-colors">{label}</span>
      <span className="text-[11px] font-medium text-foreground/70 group-hover:text-foreground transition-colors">{value}</span>
    </a>
  );
}
