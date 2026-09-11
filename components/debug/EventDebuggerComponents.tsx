import React from "react";
import { 
  Play, Square, Filter, Download, Search, 
  Clock, AlertTriangle, CheckCircle, XCircle, Activity,
  ChevronRight, ChevronDown, RefreshCw,
  BarChart3, Zap, Target, Layers, Database
} from "lucide-react";
import { EventSource } from "@/lib/events/eventContract";
import type { TimelineItem as ITimelineItem, DebugEvent, DebugCorrelation, DebugIncident } from "@/lib/debugger/types";
import type { FilterState } from "@/hooks/useEventDebugger";

export interface DebuggerStatsData {
  eventsCaptured: number;
  correlationsDetected: number;
  incidentsCreated: number;
  activeTraces: number;
  memoryUsage: { events: number };
}

export type DebuggerFilterState = FilterState;

export interface TimelineDisplayItem extends ITimelineItem {
  id: string;
  expanded?: boolean;
}

// ── DebuggerHeader ───────────────────────────────────────────────────────────

export interface DebuggerHeaderProps {
  isRecording: boolean;
  activeTrace?: string | null;
  showFilters: boolean;
  setShowFilters: (v: boolean | ((prev: boolean) => boolean)) => void;
  onExport: () => void;
  onStart: () => void;
  onStop: () => void;
}

export function DebuggerHeader({ 
  isRecording, activeTrace, showFilters, setShowFilters, onExport, onStart, onStop 
}: DebuggerHeaderProps) {
  return (
    <div className="p-4 border-b bg-white/5" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-primary" style={{ color: "var(--color-accent)" }} />
          <h1 className="text-xl font-bold">Event Debugger</h1>
          {isRecording && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400">Recording</span>
            </div>
          )}
          {activeTrace && <span className="text-xs font-mono opacity-60">Trace: {activeTrace.slice(-8)}</span>}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5 text-muted-foreground">
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button onClick={onExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5 text-muted-foreground">
            <Download className="w-4 h-4" /> Export
          </button>
          {!isRecording ? (
            <button onClick={onStart} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
              <Play className="w-4 h-4" /> Start Trace
            </button>
          ) : (
            <button onClick={onStop} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
              <Square className="w-4 h-4" /> Stop Trace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DebuggerStats ────────────────────────────────────────────────────────────

export interface DebuggerStatsProps {
  stats: DebuggerStatsData | null;
  onRefresh: () => void;
}

export function DebuggerStats({ stats, onRefresh }: DebuggerStatsProps) {
  if (!stats) return null;
  return (
    <div className="px-4 py-2 border-b bg-black/10 grid grid-cols-6 gap-4 text-xs" style={{ borderColor: "var(--color-border)" }}>
      <StatItem icon={<Activity className="w-3 h-3" />} label="Events" value={stats.eventsCaptured} />
      <StatItem icon={<Layers className="w-3 h-3" />} label="Correlations" value={stats.correlationsDetected} />
      <StatItem icon={<AlertTriangle className="w-3 h-3" />} label="Incidents" value={stats.incidentsCreated} />
      <StatItem icon={<Target className="w-3 h-3" />} label="Active Traces" value={stats.activeTraces} />
      <StatItem icon={<BarChart3 className="w-3 h-3" />} label="Memory" value={`${Math.round(stats.memoryUsage.events / 1024)}KB`} />
      <div className="flex items-center gap-2">
        <RefreshCw className="w-3 h-3 opacity-60" />
        <button onClick={onRefresh} className="text-muted-foreground hover:text-foreground transition-colors">Refresh</button>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="opacity-60">{icon}</div>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// ── DebuggerFilters ──────────────────────────────────────────────────────────

export interface DebuggerFiltersProps {
  filters: DebuggerFilterState;
  setFilters: React.Dispatch<React.SetStateAction<DebuggerFilterState>>;
  onClear: () => void;
  onRefresh: () => void;
}

export function DebuggerFilters({ filters, setFilters, onClear, onRefresh }: DebuggerFiltersProps) {
  return (
    <div className="p-4 border-b bg-white/5" style={{ borderColor: "var(--color-border)" }}>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-medium mb-2 block text-muted-foreground uppercase">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 opacity-60" />
            <input
              type="text" placeholder="Search events..." value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-black/20 border border-white/10 text-foreground"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-2 block text-muted-foreground uppercase">Time Range</label>
          <div className="flex gap-2">
            <input
              type="datetime-local" value={filters.timeRange.start.slice(0, 16)}
              onChange={(e) => setFilters((prev) => ({ ...prev, timeRange: { ...prev.timeRange, start: new Date(e.target.value).toISOString() } }))}
              className="flex-1 px-2 py-2 rounded-lg text-sm bg-black/20 border border-white/10 text-foreground"
            />
            <input
              type="datetime-local" value={filters.timeRange.end.slice(0, 16)}
              onChange={(e) => setFilters((prev) => ({ ...prev, timeRange: { ...prev.timeRange, end: new Date(e.target.value).toISOString() } }))}
              className="flex-1 px-2 py-2 rounded-lg text-sm bg-black/20 border border-white/10 text-foreground"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-2 block text-muted-foreground uppercase">Quick Filters</label>
          <div className="flex gap-4 pt-2">
            <FilterCheckbox label="Errors Only" checked={filters.showErrorsOnly} onChange={(v) => setFilters((prev) => ({ ...prev, showErrorsOnly: v }))} />
            <FilterCheckbox label="Slow Events" checked={filters.showSlowEvents} onChange={(v) => setFilters((prev) => ({ ...prev, showSlowEvents: v }))} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-2 block text-muted-foreground uppercase">Actions</label>
          <div className="flex gap-2">
            <button onClick={onClear} className="px-3 py-2 rounded-lg text-xs hover:bg-white/5 text-muted-foreground">Clear Data</button>
            <button onClick={onRefresh} className="px-3 py-2 rounded-lg text-xs hover:bg-white/5 text-muted-foreground">Refresh</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded bg-black/20 border-white/10" />
      {label}
    </label>
  );
}

// ── TimelineItem ─────────────────────────────────────────────────────────────

export interface TimelineItemProps {
  event: TimelineDisplayItem;
  onClick: (event: TimelineDisplayItem) => void;
  onToggleExpand: (id: string) => void;
}

export function TimelineItem({ event, onClick, onToggleExpand }: TimelineItemProps) {
  const getEventIcon = (type: string, data: DebugEvent | DebugCorrelation | DebugIncident) => {
    switch (type) {
      case "event": {
        const ev = data as DebugEvent;
        if (ev.errors && ev.errors.length > 0) return <XCircle className="w-4 h-4 text-red-400" />;
        if (ev.processingTime > 100) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      }
      case "correlation": return <Layers className="w-4 h-4 text-blue-400" />;
      case "incident": {
        const inc = data as DebugIncident;
        if (inc.incident.severity === "danger") return <AlertTriangle className="w-4 h-4 text-red-400" />;
        if (inc.incident.severity === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      }
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSourceColor = (source: EventSource) => {
    const colors: Record<string, string> = { FOMO: "#10b981", SAGE: "#f59e0b", TWEAK: "#8b5cf6", ALRT: "#ef4444", SECURITY: "#dc2626", WATCHER: "#06b6d4", BUILDER: "#84cc16", SYSTEM: "#6b7280" };
    return colors[source] || "#6b7280";
  };

  const evData = event.data as DebugEvent;
  const corrData = event.data as DebugCorrelation;
  const incData = event.data as DebugIncident;

  return (
    <div
      className="rounded-lg border bg-black/20 transition-all hover:shadow-md cursor-pointer group"
      style={{ borderColor: "var(--color-border)", marginLeft: `${event.type === "correlation" ? 16 : event.type === "incident" ? 32 : 0}px` }}
      onClick={() => onClick(event)}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          {getEventIcon(event.type, event.data)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase opacity-40 tracking-wider">{event.type}</span>
                {evData.metadata?.source && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${getSourceColor(evData.metadata.source)}20`, color: getSourceColor(evData.metadata.source) }}>
                    {evData.metadata.source}
                  </span>
                )}
                {event.type === "event" && <span className="text-xs font-mono opacity-60">{evData.type}</span>}
              </div>
              <div className="flex items-center gap-2 text-[10px] opacity-40 font-mono">
                <Clock className="w-3 h-3" /> {new Date(event.timestamp).toLocaleTimeString()}
                {event.duration && <><Zap className="w-3 h-3" /> {Math.round(event.duration)}ms</>}
              </div>
            </div>
            <div className="text-sm">
              {event.type === "event" && <div><span className="font-medium">{evData.type}</span>{evData.errors && evData.errors.length > 0 && <span className="ml-2 text-xs text-red-400">{evData.errors.length} errors</span>}</div>}
              {event.type === "correlation" && <div><span className="font-medium">{corrData.patternName}</span><span className="ml-2 text-xs opacity-60">{corrData.confidence}% confidence</span></div>}
              {event.type === "incident" && <div><span className="font-medium">{incData.incident.title}</span><span className="ml-2 text-xs opacity-60">{incData.incident.severity}</span></div>}
            </div>
            {event.expanded && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <pre className="text-xs overflow-x-auto opacity-80 scrollbar-thin">{JSON.stringify(event.data, null, 2)}</pre>
              </div>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onToggleExpand(event.id); }} className="p-1 rounded hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100">
            {event.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EventDetailPanel ─────────────────────────────────────────────────────────

export interface EventDetailPanelProps {
  event: TimelineDisplayItem | null;
  onClose: () => void;
}

export function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  if (!event) return null;
  return (
    <div className="w-96 border-l border-white/10 bg-black/40 overflow-y-auto p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-headline text-base">Event Details</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground"><XCircle className="w-5 h-5" /></button>
      </div>
      <div className="space-y-6">
        <DetailItem label="Type" value={event.type.toUpperCase()} />
        <DetailItem label="Timestamp" value={new Date(event.timestamp).toLocaleString()} />
        {event.duration && <DetailItem label="Duration" value={`${Math.round(event.duration)}ms`} />}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Raw Data</label>
          <pre className="text-[11px] bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto scrollbar-thin font-mono leading-relaxed">{JSON.stringify(event.data, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">{label}</label>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
