/**
 * Event Debugger UI - Development Timeline Visual Interface
 * Optimized for v5.9: Modular structure with custom hooks and components.
 */

"use client";

import React from "react";
import { Database } from "lucide-react";
import { useEventDebugger } from "@/hooks/useEventDebugger";
import { 
  DebuggerHeader, DebuggerStats, DebuggerFilters, TimelineItem, EventDetailPanel 
} from "./EventDebuggerComponents";

export function EventDebuggerUI() {
  const {
    isRecording, activeTrace, timeline, selectedEvent, setSelectedEvent,
    filters, setFilters, stats, showFilters, setShowFilters,
    loadTimeline, handleStartTrace, handleStopTrace, handleExportData, toggleEventExpanded
  } = useEventDebugger();

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--color-card)", color: "var(--color-foreground)" }}>
      <DebuggerHeader 
        isRecording={isRecording} activeTrace={activeTrace} 
        showFilters={showFilters} setShowFilters={setShowFilters} 
        onExport={handleExportData} onStart={handleStartTrace} onStop={handleStopTrace} 
      />

      <DebuggerStats stats={stats} onRefresh={loadTimeline} />

      {showFilters && (
        <DebuggerFilters 
          filters={filters} setFilters={setFilters} 
          onClear={loadTimeline} onRefresh={loadTimeline} 
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-2 pb-20">
            {timeline.map((event) => (
              <TimelineItem 
                key={event.id} 
                event={event} 
                onClick={setSelectedEvent} 
                onToggleExpand={toggleEventExpanded} 
              />
            ))}
            
            {timeline.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 opacity-20">
                <Database className="w-16 h-16 mb-4 animate-pulse" />
                <p className="font-headline text-lg tracking-widest uppercase">No events captured</p>
                <p className="font-caption text-xs mt-2">Start a trace to begin debugging the system.</p>
              </div>
            )}
          </div>
        </div>

        {/* Event Details Sidebar */}
        <EventDetailPanel 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      </div>
    </div>
  );
}
