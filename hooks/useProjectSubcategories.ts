/**
 * @fileoverview useProjectSubcategories - Hook para gestionar subcategorías personalizadas por proyecto
 */

import { useState, useCallback, useEffect } from "react";

export interface ProjectSubcategories {
  [category: string]: string[];
}

export function useProjectSubcategories(projectName: string | null) {
  const [subcategories, setSubcategories] = useState<ProjectSubcategories | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar subcategorías del proyecto
  const loadSubcategories = useCallback(async () => {
    if (!projectName) {
      setSubcategories(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/project-config?project=${encodeURIComponent(projectName)}`);
      if (res.ok) {
        const data = await res.json();
        setSubcategories(data.config?.subcategories || {});
      } else {
        setError("No se pudieron cargar las subcategorías");
      }
    } catch (e) {
      setError("Error de red al cargar subcategorías");
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  useEffect(() => {
    loadSubcategories();
  }, [loadSubcategories]);

  // Agregar subcategoría
  const addSubcategory = useCallback(async (category: string, subcategory: string) => {
    if (!projectName) return false;
    
    try {
      const res = await fetch("/api/project-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: projectName,
          action: "add_subcategory",
          category,
          subcategory,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSubcategories(data.subcategories);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [projectName]);

  // Eliminar subcategoría
  const removeSubcategory = useCallback(async (category: string, subcategory: string) => {
    if (!projectName) return false;
    
    try {
      const res = await fetch("/api/project-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: projectName,
          action: "remove_subcategory",
          category,
          subcategory,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSubcategories(data.subcategories);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [projectName]);

  // Resetear a defaults
  const resetSubcategories = useCallback(async () => {
    if (!projectName) return false;
    
    try {
      const res = await fetch("/api/project-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: projectName,
          action: "reset_subcategories",
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSubcategories(data.subcategories);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [projectName]);

  return {
    subcategories,
    loading,
    error,
    addSubcategory,
    removeSubcategory,
    resetSubcategories,
    refresh: loadSubcategories,
  };
}
