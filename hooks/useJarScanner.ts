/**
 * Hook para escaneo de archivos JAR usando Web Workers
 * 
 * Permite escanear grandes cantidades de mods en background sin bloquear el UI.
 * Proporciona progreso en tiempo real y manejo de errores.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LibraryFile } from '@/lib/types';

interface ScannerState {
  scanning: boolean;
  progress: {
    current: number;
    total: number;
    percentage: number;
    currentFile?: string;
  };
  results: LibraryFile[];
  errors: string[];
}

interface ScannerOptions {
  onProgress?: (progress: ScannerState['progress']) => void;
  onComplete?: (results: LibraryFile[], errors: string[]) => void;
  onError?: (error: string) => void;
}

export function useJarScanner(options: ScannerOptions = {}) {
  const [state, setState] = useState<ScannerState>({
    scanning: false,
    progress: { current: 0, total: 0, percentage: 0 },
    results: [],
    errors: []
  });

  const workerRef = useRef<Worker | null>(null);
  const scanIdRef = useRef<string>('');

  // Inicializar worker
  useEffect(() => {
    try {
      workerRef.current = new Worker('/workers/scanner.worker.js');
      
      workerRef.current.onmessage = (e: MessageEvent) => {
        const message = e.data;

        switch (message.type) {
          case 'progress':
            setState(prev => ({
              ...prev,
              progress: {
                current: message.current,
                total: message.total,
                percentage: message.percentage,
                currentFile: message.currentFile
              }
            }));
            options.onProgress?.(message);
            break;

          case 'complete':
            setState(prev => ({
              ...prev,
              scanning: false,
              results: message.results,
              errors: message.errors
            }));
            options.onComplete?.(message.results, message.errors);
            break;

          case 'error':
            setState(prev => ({
              ...prev,
              scanning: false,
              errors: [...prev.errors, message.error]
            }));
            options.onError?.(message.error);
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        const errorMsg = `Worker error: ${error.message}`;
        setState(prev => ({
          ...prev,
          scanning: false,
          errors: [...prev.errors, errorMsg]
        }));
        options.onError?.(errorMsg);
      };

    } catch (error) {
      console.error('[useJarScanner] Failed to initialize worker:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize scanner worker';
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMsg]
      }));
      options.onError?.(errorMsg);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [options]);

  const scanFiles = useCallback(async (filePaths: string[]) => {
    if (!workerRef.current) {
      const error = 'Scanner worker not initialized';
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, error]
      }));
      options.onError?.(error);
      return;
    }

    if (filePaths.length === 0) {
      options.onComplete?.([], []);
      return;
    }

    // Resetear estado
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    scanIdRef.current = scanId;

    setState({
      scanning: true,
      progress: { current: 0, total: filePaths.length, percentage: 0 },
      results: [],
      errors: []
    });

    try {
      workerRef.current.postMessage({
        filePaths,
        id: scanId
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start scanning';
      setState(prev => ({
        ...prev,
        scanning: false,
        errors: [...prev.errors, errorMsg]
      }));
      options.onError?.(errorMsg);
    }
  }, [options]);

  const cancelScan = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      scanning: false
    }));

    // Re-inicializar worker para futuros escaneos
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload(); // Simple reload to reinitialize
      }
    }, 100);
  }, []);

  const clearResults = useCallback(() => {
    setState({
      scanning: false,
      progress: { current: 0, total: 0, percentage: 0 },
      results: [],
      errors: []
    });
  }, []);

  return {
    // Estado
    scanning: state.scanning,
    progress: state.progress,
    results: state.results,
    errors: state.errors,

    // Acciones
    scanFiles,
    cancelScan,
    clearResults,

    // Utilidades
    isReady: !!workerRef.current,
    hasResults: state.results.length > 0,
    hasErrors: state.errors.length > 0,
    progressPercentage: state.progress.percentage,
    currentFile: state.progress.currentFile
  };
}
