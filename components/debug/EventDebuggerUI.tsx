/**
 * Event Debugger UI - Development Timeline Visual Interface
 * ─────────────────────────────────────────────────────────────────────────────
 * Interfaz visual interactiva para debugging del sistema event-driven de MIM.
 * 
 * Proporciona:
 * - Timeline visual de eventos con filtrado avanzado
 * - Flow traces con correlación tracking
 * - Análisis de performance y bottlenecks
 * - Inspección detallada de eventos y correlaciones
 * - Export de datos y reportes
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Play, Pause, Square, Filter, Download, Search, 
  Clock, AlertTriangle, CheckCircle, XCircle, Activity,
  ChevronRight, ChevronDown, Eye, EyeOff, RefreshCw,
  Calendar, BarChart3, Zap, Target, Layers, Database
} from "lucide-react";
import { eventDebugger } from "@/lib/eventDebugger";
import { eventSchemaRegistry } from "@/lib/eventSchemaRegistry";
import { EventSource, EventName } from "@/lib/eventContract";

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "event" | "correlation" | "incident";
  data: any;
  duration?: number;
  expanded?: boolean;
}

interface FilterState {
  eventTypes: EventName[];
  sources: EventSource[];
  timeRange: {
    start: string;
    end: string;
  };
  searchQuery: string;
  showErrorsOnly: boolean;
  showSlowEvents: boolean;
}

export function EventDebuggerUI() {
  const [isRecording, setIsRecording] = useState(false);
  const [activeTrace, setActiveTrace] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    eventTypes: [],
    sources: [],
    timeRange: {
      start: new Date(Date.now() - 3600000).toISOString(),
      end: new Date().toISOString()
    },
    searchQuery: "",
    showErrorsOnly: false,
    showSlowEvents: false
  });
  const [stats, setStats] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadTimeline();
    loadStats();
    
    const interval = setInterval(() => {
      if (isRecording) {
        loadTimeline();
        loadStats();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, filters]);

  const loadTimeline = useCallback(() => {
    const rawTimeline = eventDebugger.generateTimeline({
      startTime: filters.timeRange.start,
      endTime: filters.timeRange.end,
      eventTypes: filters.eventTypes.length > 0 ? filters.eventTypes : undefined,
      sources: filters.sources.length > 0 ? filters.sources : undefined,
      limit: 1000
    });

    const processedTimeline: TimelineEvent[] = rawTimeline.map(item => {
      let id: string;
      
      if (item.type === "event") {
        id = (item.data as any).id;
      } else if (item.type === "correlation") {
        id = (item.data as any).id;
      } else if (item.type === "incident") {
        id = (item.data as any).incident.id;
      } else {
        id = `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      return {
        id,
        ...item,
        expanded: false
      };
    });

    // Aplicar filtros adicionales
    const filtered = processedTimeline.filter(event => {
      // Búsqueda
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        const eventStr = JSON.stringify(event.data).toLowerCase();
        if (!eventStr.includes(searchLower)) return false;
      }

      // Solo errores
      if (filters.showErrorsOnly) {
        if (event.type === "event" && event.data.errors?.length === 0) return false;
        if (event.type === "incident" && event.data.incident.severity === "info") return false;
      }

      // Eventos lentos
      if (filters.showSlowEvents && event.duration && event.duration < 100) return false;

      return true;
    });

    setTimeline(filtered);
  }, [filters]);

  const loadStats = useCallback(() => {
    setStats(eventDebugger.getStats());
  }, []);

  const handleStartTrace = () => {
    const traceId = eventDebugger.startTrace();
    setActiveTrace(traceId);
    setIsRecording(true);
  };

  const handleStopTrace = () => {
    if (activeTrace) {
      eventDebugger.endTrace(activeTrace);
    }
    setActiveTrace(null);
    setIsRecording(false);
  };

  const handleClearData = () => {
    // Implementar limpieza de datos
    loadTimeline();
  };

  const handleExportData = () => {
    const data = eventDebugger.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-debug-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleEventExpanded = (eventId: string) => {
    setTimeline(prev => prev.map(event => 
      event.id === eventId ? { ...event, expanded: !event.expanded } : event
    ));
  };

  const getEventIcon = (type: string, data: any) => {
    switch (type) {
      case "event":
        if (data.errors?.length > 0) return <XCircle className="w-4 h-4 text-red-400" />;
        if (data.processingTime > 100) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "correlation":
        return <Layers className="w-4 h-4 text-blue-400" />;
      case "incident":
        if (data.incident.severity === "danger") return <AlertTriangle className="w-4 h-4 text-red-400" />;
        if (data.incident.severity === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSourceColor = (source: EventSource) => {
    const colors: Record<EventSource, string> = {
      FOMO: "#10b981",
      SAGE: "#f59e0b", 
      TWEAK: "#8b5cf6",
      ALRT: "#ef4444",
      SECURITY: "#dc2626",
      WATCHER: "#06b6d4",
      BUILDER: "#84cc16",
      SYSTEM: "#6b7280"
    };
    return colors[source] || "#6b7280";
  };

  const formatDuration = (ms: number) => {
    if (ms < 1) return "< 1ms";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Estilos dinámicos
  const containerStyle = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    color: "var(--color-foreground)"
  };

  const headerStyle = {
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-secondary-bg)"
  };

  const timelineStyle = {
    background: "var(--color-background)",
    border: "1px solid var(--color-border)"
  };

  return (
    <div className="flex flex-col h-screen" style={containerStyle}>
      {/* Header */}
      <div className="p-4" style={headerStyle}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6" style={{ color: "var(--color-accent)" }} />
            <h1 className="text-xl font-bold">Event Debugger</h1>
            {isRecording && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-400">Recording</span>
              </div>
            )}
            {activeTrace && (
              <span className="text-xs font-mono opacity-60">Trace: {activeTrace.slice(-8)}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--color-muted)" }}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--color-muted)" }}
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {!isRecording ? (
              <button
                onClick={handleStartTrace}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ 
                  background: "var(--color-accent-bg)",
                  color: "var(--color-accent)"
                }}
              >
                <Play className="w-4 h-4" />
                Start Trace
              </button>
            ) : (
              <button
                onClick={handleStopTrace}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ 
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444"
                }}
              >
                <Square className="w-4 h-4" />
                Stop Trace
              </button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-6 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 opacity-60" />
              <span style={{ color: "var(--color-muted)" }}>Events:</span>
              <span className="font-medium">{stats.eventsCaptured}</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 opacity-60" />
              <span style={{ color: "var(--color-muted)" }}>Correlations:</span>
              <span className="font-medium">{stats.correlationsDetected}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 opacity-60" />
              <span style={{ color: "var(--color-muted)" }}>Incidents:</span>
              <span className="font-medium">{stats.incidentsCreated}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-3 h-3 opacity-60" />
              <span style={{ color: "var(--color-muted)" }}>Active Traces:</span>
              <span className="font-medium">{stats.activeTraces}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3 h-3 opacity-60" />
              <span style={{ color: "var(--color-muted)" }}>Memory:</span>
              <span className="font-medium">{Math.round(stats.memoryUsage.events / 1024)}KB</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3 opacity-60" />
              <button 
                onClick={loadTimeline}
                className="hover:opacity-80 transition-opacity"
                style={{ color: "var(--color-muted)" }}
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: "var(--color-muted)" }}>
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 opacity-60" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "var(--color-input)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-foreground)"
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: "var(--color-muted)" }}>
                Time Range
              </label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={filters.timeRange.start.slice(0, 16)}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    timeRange: { ...prev.timeRange, start: new Date(e.target.value).toISOString() }
                  }))}
                  className="flex-1 px-2 py-2 rounded-lg text-sm"
                  style={{
                    background: "var(--color-input)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-foreground)"
                  }}
                />
                <input
                  type="datetime-local"
                  value={filters.timeRange.end.slice(0, 16)}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    timeRange: { ...prev.timeRange, end: new Date(e.target.value).toISOString() }
                  }))}
                  className="flex-1 px-2 py-2 rounded-lg text-sm"
                  style={{
                    background: "var(--color-input)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-foreground)"
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: "var(--color-muted)" }}>
                Quick Filters
              </label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showErrorsOnly}
                    onChange={(e) => setFilters(prev => ({ ...prev, showErrorsOnly: e.target.checked }))}
                  />
                  Errors Only
                </label>
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showSlowEvents}
                    onChange={(e) => setFilters(prev => ({ ...prev, showSlowEvents: e.target.checked }))}
                  />
                  Slow Events
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: "var(--color-muted)" }}>
                Actions
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleClearData}
                  className="px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/5"
                  style={{ color: "var(--color-muted)" }}
                >
                  Clear Data
                </button>
                <button
                  onClick={loadTimeline}
                  className="px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/5"
                  style={{ color: "var(--color-muted)" }}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {timeline.map((event, index) => (
              <div
                key={event.id}
                className="rounded-lg border transition-all hover:shadow-md cursor-pointer"
                style={{
                  ...timelineStyle,
                  marginLeft: `${event.type === "correlation" ? 16 : event.type === "incident" ? 32 : 0}px`
                }}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    {getEventIcon(event.type, event.data)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase opacity-60">
                            {event.type}
                          </span>
                          {event.data.metadata?.source && (
                            <span 
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ 
                                background: `${getSourceColor(event.data.metadata.source)}20`,
                                color: getSourceColor(event.data.metadata.source)
                              }}
                            >
                              {event.data.metadata.source}
                            </span>
                          )}
                          {event.type === "event" && (
                            <span className="text-xs font-mono opacity-60">
                              {event.data.type}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs opacity-60">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(event.timestamp)}
                          {event.duration && (
                            <>
                              <Zap className="w-3 h-3" />
                              {formatDuration(event.duration)}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Event Content */}
                      <div className="text-sm">
                        {event.type === "event" && (
                          <div>
                            <span className="font-medium">{event.data.type}</span>
                            {event.data.errors?.length > 0 && (
                              <span className="ml-2 text-xs text-red-400">
                                {event.data.errors.length} errors
                              </span>
                            )}
                          </div>
                        )}
                        
                        {event.type === "correlation" && (
                          <div>
                            <span className="font-medium">{event.data.patternName}</span>
                            <span className="ml-2 text-xs opacity-60">
                              {event.data.confidence}% confidence
                            </span>
                          </div>
                        )}
                        
                        {event.type === "incident" && (
                          <div>
                            <span className="font-medium">{event.data.incident.title}</span>
                            <span className="ml-2 text-xs opacity-60">
                              {event.data.incident.severity}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Expandable Details */}
                      {event.expanded && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                          <pre className="text-xs overflow-x-auto opacity-80">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEventExpanded(event.id);
                      }}
                      className="p-1 rounded hover:bg-white/5 transition-colors"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {event.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {timeline.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 opacity-40">
              <Database className="w-12 h-12 mb-4" />
              <p className="text-sm">No events captured</p>
              <p className="text-xs mt-1">Start a trace to begin debugging</p>
            </div>
          )}
        </div>

        {/* Event Details Panel */}
        {selectedEvent && (
          <div className="w-96 border-l overflow-y-auto p-4" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Event Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded hover:bg-white/5 transition-colors"
                style={{ color: "var(--color-muted)" }}
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-muted)" }}>
                  Type
                </label>
                <div className="text-sm font-medium uppercase">{selectedEvent.type}</div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-muted)" }}>
                  Timestamp
                </label>
                <div className="text-sm">{new Date(selectedEvent.timestamp).toLocaleString()}</div>
              </div>

              {selectedEvent.duration && (
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-muted)" }}>
                    Duration
                  </label>
                  <div className="text-sm">{formatDuration(selectedEvent.duration)}</div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--color-muted)" }}>
                  Raw Data
                </label>
                <pre className="text-xs bg-black/5 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedEvent.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
