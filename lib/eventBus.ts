/**
 * MIM Event Bus — Centralized Intelligence Orchestrator
 * ─────────────────────────────────────────────────────────────────────────────
 * Bus de eventos centralizado con contrato formal y taxonomía tipada.
 * Implementa comunicación reactiva entre módulos con metadata de correlación,
 * validación de payloads y soporte para debugging de eventos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  MimEventMap,
  EventName,
  EventPayload,
  EventHandler,
  EventMetadata,
  EventSource,
  createEventMetadata,
  validateEventPayload
} from "./eventContract";

export type { MimEventMap, EventName, EventPayload, EventHandler, EventMetadata, EventSource };

// Enhanced handler con metadata
type EnhancedHandler<T extends EventName> = EventHandler<T>;
export type Handler<T extends EventName> = (payload: EventPayload<T>) => void;

class MimEventBus {
  private listeners: Map<string, Handler<any>[]> = new Map();
  private eventQueue: Array<{ event: string; payload: any; timestamp: number }> = [];
  private processingQueue = false;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 16; // ~60fps

  /**
   * Suscribe un manejador a un evento específico
   */
  subscribe<T extends EventName>(event: T, handler: Handler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);

    // Retorna una función para des-suscribirse fácilmente (útil en useEffect)
    return () => this.unsubscribe(event, handler);
  }

  /**
   * Elimina un manejador de un evento
   */
  unsubscribe<T extends EventName>(event: T, handler: Handler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      this.listeners.set(
        event,
        handlers.filter((h) => h !== handler)
      );
    }
  }

  /**
   * Emite un evento con su carga de datos tipada (con batch processing)
   */
  emit<T extends EventName>(event: T, payload: EventPayload<T>): void {
    // Agregar a la cola para procesamiento por lotes
    this.eventQueue.push({ event, payload, timestamp: Date.now() });
    
    // Iniciar procesamiento si no está activo
    if (!this.processingQueue) {
      this.scheduleFlush();
    }
  }

  /**
   * Emite un evento inmediatamente (para casos críticos)
   */
  emitImmediate<T extends EventName>(event: T, payload: EventPayload<T>): void {
    this.processEvent(event, payload);
  }

  private scheduleFlush() {
    this.processingQueue = true;
    
    // Usar requestAnimationFrame para mejor performance
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        this.flushQueue();
      });
    } else {
      // Fallback para SSR
      setTimeout(() => this.flushQueue(), this.FLUSH_INTERVAL);
    }
  }

  private flushQueue() {
    const batch = this.eventQueue.splice(0, this.BATCH_SIZE);
    
    // Agrupar eventos por tipo para procesamiento eficiente
    const eventsByType = new Map<string, any[]>();
    batch.forEach(({ event, payload }) => {
      if (!eventsByType.has(event)) {
        eventsByType.set(event, []);
      }
      eventsByType.get(event)!.push(payload);
    });

    // Procesar eventos agrupados
    eventsByType.forEach((payloads, event) => {
      payloads.forEach(payload => {
        this.processEvent(event as EventName, payload);
      });
    });

    // Continuar procesando si hay más eventos
    if (this.eventQueue.length > 0) {
      this.scheduleFlush();
    } else {
      this.processingQueue = false;
    }
  }

  private processEvent<T extends EventName>(event: T, payload: EventPayload<T>): void {
    // 1. Ejecutar listeners internos del bus
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[MIM Bus] Error en handler para ${event}:`, error);
        }
      });
    }

    // 2. Propagar como CustomEvent de DOM para compatibilidad con componentes vanilla/legacy
    if (typeof window !== "undefined") {
      const domEvent = new CustomEvent(`mim:${event}`, { 
        detail: payload,
        bubbles: true 
      });
      window.dispatchEvent(domEvent);
    }

    // 3. Log de desarrollo (opcional)
    if (process.env.NODE_ENV === "development") {
      console.log(`%c[MIM Bus] %c${event}`, "color: #818cf8; font-weight: bold", "color: #fff", payload);
    }
  }

  /**
   * Obtener estadísticas del bus para debugging
   */
  getStats() {
    return {
      queueLength: this.eventQueue.length,
      processingQueue: this.processingQueue,
      listenerCount: Array.from(this.listeners.values()).reduce((sum, handlers) => sum + handlers.length, 0)
    };
  }
}

// Singleton para toda la aplicación
export const eventBus = new MimEventBus();
