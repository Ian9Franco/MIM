import { useState, useEffect, useCallback } from "react";
import { eventDebugger } from "@/lib/events/eventDebugger";
import { EventSource, EventName } from "@/lib/events/eventContract";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "event" | "correlation" | "incident";
  data: any;
  duration?: number;
  expanded?: boolean;
}

export interface FilterState {
  eventTypes: EventName[];
  sources: EventSource[];
  timeRange: { start: string; end: string; };
  searchQuery: string;
  showErrorsOnly: boolean;
  showSlowEvents: boolean;
}

export function useEventDebugger() {
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

  const loadStats = useCallback(() => {
    setStats(eventDebugger.getStats());
  }, []);

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
      if (item.type === "event") id = (item.data as any).id;
      else if (item.type === "correlation") id = (item.data as any).id;
      else if (item.type === "incident") id = (item.data as any).incident.id;
      else id = `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return { id, ...item, expanded: false };
    });

    const filtered = processedTimeline.filter(event => {
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        const eventStr = JSON.stringify(event.data).toLowerCase();
        if (!eventStr.includes(searchLower)) return false;
      }
      if (filters.showErrorsOnly) {
        if (event.type === "event" && event.data.errors?.length === 0) return false;
        if (event.type === "incident" && event.data.incident.severity === "info") return false;
      }
      if (filters.showSlowEvents && event.duration && event.duration < 100) return false;
      return true;
    });

    setTimeline(filtered);
  }, [filters]);

  useEffect(() => {
    loadTimeline();
    loadStats();
    const interval = setInterval(() => {
      if (isRecording) { loadTimeline(); loadStats(); }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording, filters, loadTimeline, loadStats]);

  const handleStartTrace = () => {
    const traceId = eventDebugger.startTrace();
    setActiveTrace(traceId);
    setIsRecording(true);
  };

  const handleStopTrace = () => {
    if (activeTrace) eventDebugger.endTrace(activeTrace);
    setActiveTrace(null);
    setIsRecording(false);
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

  return {
    isRecording, activeTrace, timeline, selectedEvent, setSelectedEvent,
    filters, setFilters, stats, showFilters, setShowFilters,
    loadTimeline, handleStartTrace, handleStopTrace, handleExportData, toggleEventExpanded
  };
}
