"use client";

import React from "react";
import { motion } from "framer-motion";

const pulseVariants = {
  initial: { opacity: 0.4 },
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

interface SkeletonWrapperProps {
  children: React.ReactNode;
  className?: string;
  count?: number;
}

function SkeletonWrapper({ children, className = "", count = 1 }: SkeletonWrapperProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="relative overflow-hidden"
        >
          {children}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * DiscoverSkeleton: Grid structure matching the discovery results.
 */
export function DiscoverSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 w-full">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="bg-surface/60 border border-white/[0.06] flex flex-col overflow-hidden rounded-3xl"
        >
          {/* Banner */}
          <div className="h-12 w-full bg-white/[0.04] relative" />
          
          {/* Card Body */}
          <div className="p-3 pt-6 relative flex-grow flex flex-col justify-between">
            {/* Floating Icon */}
            <div className="absolute -top-6 left-3 w-10 h-10 bg-white/[0.08] border border-white/[0.08] rounded-2xl" />
            
            <div className="flex-grow min-w-0 mt-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-4/5" />
              <div className="h-2 bg-white/5 rounded w-1/2" />
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.04] pt-2 mt-4">
              <div className="h-2.5 bg-white/5 rounded w-1/3" />
              <div className="h-2.5 bg-white/10 rounded w-1/4" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * SpotlightSkeleton: Carousel/Marquee placeholder for spotlight tab featured mods.
 */
export function SpotlightSkeleton() {
  return (
    <div className="w-full overflow-hidden py-1">
      <div className="flex gap-4 w-max px-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            className="border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col min-w-[200px] max-w-[200px]"
            style={{ background: "color-mix(in srgb, var(--color-card) 96%, transparent)" }}
          >
            {/* Banner */}
            <div className="h-24 bg-white/[0.04] border-b border-white/[0.06]" />
            
            {/* Body */}
            <div className="p-4 flex flex-col gap-3">
              <div className="h-3.5 bg-white/10 rounded w-2/3" />
              <div className="space-y-1.5">
                <div className="h-2 bg-white/5 rounded w-full" />
                <div className="h-2 bg-white/5 rounded w-4/5" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] mt-1">
                <div className="h-2.5 bg-white/5 rounded w-1/4" />
                <div className="h-2.5 bg-white/10 rounded w-1/5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * CollectionsSkeleton: Standard item list placeholder for editorial collections.
 */
export function CollectionsSkeleton() {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="bg-surface/90 border border-white/[0.06] rounded-2xl p-3 flex items-center gap-3"
        >
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.05] shrink-0" />
          
          {/* Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3 bg-white/10 rounded w-1/2" />
            <div className="h-2 bg-white/5 rounded w-1/3" />
          </div>

          <div className="w-4 h-4 bg-white/10 rounded shrink-0 mr-1" />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * FeedSkeleton: Stack of compact YouTube posts.
 */
export function FeedSkeleton() {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="bg-surface/90 border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3"
        >
          {/* Title */}
          <div className="h-3 bg-white/10 rounded w-3/4" />
          
          {/* Description line */}
          <div className="h-2 bg-white/5 rounded w-full" />
          
          {/* Aspect video player placeholder */}
          <div className="relative aspect-video w-full rounded-xl bg-white/[0.04] border border-white/[0.05]" />
          
          {/* Footer */}
          <div className="flex justify-between items-center pt-2 border-t border-white/[0.04] mt-1">
            <div className="h-2.5 bg-white/5 rounded w-1/4" />
            <div className="h-2.5 bg-white/10 rounded w-1/5" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * RankingsSkeleton: Community rankings leaderboard entries placeholder.
 */
export function RankingsSkeleton() {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="bg-surface/90 border border-white/[0.06] rounded-2xl p-3 flex items-center gap-3"
        >
          {/* Rank number */}
          <div className="w-6 h-4 bg-white/10 rounded shrink-0" />
          
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.05] shrink-0" />
          
          {/* Title and details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3 bg-white/10 rounded w-1/2" />
            <div className="h-2 bg-white/5 rounded w-1/3" />
          </div>
          
          {/* Badge */}
          <div className="w-16 h-5 bg-white/[0.05] border border-white/[0.05] rounded-full shrink-0" />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * MiembrosSkeleton: Community members list.
 */
export function MiembrosSkeleton() {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="bg-surface/80 border border-white/[0.06] rounded-2xl p-3.5 flex items-center gap-3"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.05] shrink-0" />
          
          {/* Identity details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3.5 bg-white/10 rounded w-1/3" />
            <div className="h-2 bg-white/5 rounded w-1/2" />
          </div>

          <div className="w-4 h-4 bg-white/10 rounded shrink-0" />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * PublicProfileSkeleton: Full user profile overlay with drafts and favorites.
 */
export function PublicProfileSkeleton() {
  return (
    <div className="w-full space-y-5">
      {/* Profile Card Header */}
      <motion.div
        variants={pulseVariants}
        initial="initial"
        animate="animate"
        className="bg-surface/90 border border-white/[0.06] rounded-2xl overflow-hidden"
      >
        {/* Banner */}
        <div className="h-24 w-full bg-white/[0.04]" />
        
        {/* Profile Info Row */}
        <div className="px-4 pb-4 pt-0 relative flex flex-col gap-2">
          <div className="w-14 h-14 rounded-xl border-2 border-white/[0.1] bg-white/[0.06] -mt-7 relative z-10" />
          <div className="h-4 bg-white/10 rounded w-1/4 mt-2" />
          <div className="h-3 bg-white/5 rounded w-1/3" />
        </div>
      </motion.div>

      {/* Profile Detail Sections */}
      <div className="flex flex-col gap-5">
        {Array.from({ length: 2 }).map((_, secIdx) => (
          <div key={secIdx} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="h-3 bg-white/10 rounded w-1/4" />
              <div className="h-3 bg-white/5 rounded w-8" />
            </div>

            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, itemIdx) => (
                <motion.div
                  key={itemIdx}
                  variants={pulseVariants}
                  initial="initial"
                  animate="animate"
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.05] shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                    <div className="h-2 bg-white/5 rounded w-1/3" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
