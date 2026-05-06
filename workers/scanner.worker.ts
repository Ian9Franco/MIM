/**
 * Web Worker for JAR File Scanning
 * 
 * Escanea archivos JAR de mods en background sin bloquear el UI thread.
 * Extrae metadata: modId, modName, version, dependencies, etc.
 * 
 * Uso:
 * const worker = new Worker('/workers/scanner.worker.js');
 * worker.postMessage({ filePaths: [...] });
 * worker.onmessage = (e) => { handleResults(e.data); };
 */

import { scanMod } from '@/lib/mod-scanner';

interface ScanRequest {
  filePaths: string[];
  id?: string;
}

interface ScanResult {
  id: string;
  results: any[];
  errors: string[];
  completed: boolean;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
}

interface ScanProgress {
  id: string;
  type: 'progress';
  current: number;
  total: number;
  percentage: number;
  currentFile?: string;
}

interface ScanComplete {
  id: string;
  type: 'complete';
  results: any[];
  errors: string[];
}

interface ScanError {
  id: string;
  type: 'error';
  error: string;
}

// Worker message handler
self.onmessage = async (e: MessageEvent<ScanRequest>) => {
  const { filePaths, id = `scan_${Date.now()}` } = e.data;
  
  try {
    await scanJarFiles(filePaths, id);
  } catch (error) {
    const errorMessage: ScanError = {
      id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    self.postMessage(errorMessage);
  }
};

async function scanJarFiles(filePaths: string[], scanId: string) {
  const results: any[] = [];
  const errors: string[] = [];
  const total = filePaths.length;

  // Enviar progreso inicial
  const initialProgress: ScanProgress = {
    id: scanId,
    type: 'progress',
    current: 0,
    total,
    percentage: 0
  };
  self.postMessage(initialProgress);

  // Procesar archivos en batches para no sobrecargar
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
    const batch = filePaths.slice(i, i + BATCH_SIZE);
    
    // Procesar batch en paralelo
    const batchPromises = batch.map(async (filePath, batchIndex) => {
      try {
        const result = await scanMod(filePath);
        
        // Enviar progreso
        const progress: ScanProgress = {
          id: scanId,
          type: 'progress',
          current: i + batchIndex + 1,
          total,
          percentage: Math.round(((i + batchIndex + 1) / total) * 100),
          currentFile: filePath.split('\\').pop() || filePath.split('/').pop()
        };
        self.postMessage(progress);
        
        return result;
      } catch (error) {
        const errorMsg = `Failed to scan ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        
        // Enviar progreso incluso con error
        const progress: ScanProgress = {
          id: scanId,
          type: 'progress',
          current: i + batchIndex + 1,
          total,
          percentage: Math.round(((i + batchIndex + 1) / total) * 100),
          currentFile: filePath.split('\\').pop() || filePath.split('/').pop()
        };
        self.postMessage(progress);
        
        return null;
      }
    });

    // Esperar a que termine el batch
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(result => result !== null));

    // Pequeña pausa entre batches para no bloquear completamente
    if (i + BATCH_SIZE < filePaths.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  // Enviar resultado final
  const completeMessage: ScanComplete = {
    id: scanId,
    type: 'complete',
    results,
    errors
  };
  self.postMessage(completeMessage);
}

// Manejar errores no capturados
self.onerror = (error) => {
  const errorMessage: ScanError = {
    id: 'unknown',
    type: 'error',
    error: error.message || 'Unknown worker error'
  };
  self.postMessage(errorMessage);
};

// Export para TypeScript
export {};
