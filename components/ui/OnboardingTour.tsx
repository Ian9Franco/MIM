"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowLeft, X } from "lucide-react";

interface Step {
  target: string;
  title: string;
  content: string;
}

interface OnboardingTourProps {
  steps: Step[];
  onComplete: () => void;
  onStepChange?: (step: number) => void;
}

export function OnboardingTour({ steps, onComplete, onStepChange }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      const step = steps[currentStep];
      if (!step) return;
      const element = document.querySelector(step.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
        // Scroll to element if not in view (use nearest to avoid unwanted jumps)
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    // Update on resize or scroll
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      onStepChange?.(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      onStepChange?.(currentStep - 1);
    }
  };

  if (!mounted || steps.length === 0) return null;

  const step = steps[currentStep];

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Spotlight Effect */}
      {targetRect && (
        <div
          className="fixed border-2 border-primary/50 transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            borderRadius: "1rem",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className="onboarding-tooltip fixed bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 w-80 flex flex-col space-y-3 shadow-2xl pointer-events-auto transition-all duration-300 ease-out"
        style={{
          // Position relative to target to avoid covering it
          top: targetRect 
            ? (targetRect.left + targetRect.width / 2 > window.innerWidth / 2)
              ? targetRect.top // Si está a la derecha (como sidebars), a la misma altura
              : (targetRect.top + targetRect.height / 2 < window.innerHeight / 2)
                ? targetRect.bottom + 12 // Mitad superior -> Abajo
                : Math.max(16, targetRect.top - 200) // Mitad inferior -> Arriba
            : "50%",
          left: targetRect 
            ? (targetRect.left + targetRect.width / 2 > window.innerWidth / 2)
              ? Math.max(16, targetRect.left - 340) // A la izquierda del elemento
              : Math.min(Math.max(16, targetRect.left), window.innerWidth - 340) // Alineado a la izquierda
            : "50%",
          transform: targetRect ? "none" : "translate(-50%, -50%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              {currentStep + 1}
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              {step.title}
            </h3>
          </div>
          <button
            onClick={onComplete}
            className="!text-white/50 hover:!text-white transition-colors"
          >
            <X className="w-4 h-4 !text-white/50" />
          </button>
        </div>

        <p className="text-[11px] !text-white/90 leading-relaxed">
          {step.content}
        </p>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
          <span className="text-[10px] font-bold !text-white/50">
            {currentStep + 1} de {steps.length}
          </span>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 !text-white/70 text-[10px] font-bold transition-all"
              >
                <ArrowLeft className="w-3 h-3 !text-white/70" /> Atrás
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-[10px] font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              {currentStep === steps.length - 1 ? "Terminar" : "Siguiente"}{" "}
              <ArrowRight className="w-3 h-3 !text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
