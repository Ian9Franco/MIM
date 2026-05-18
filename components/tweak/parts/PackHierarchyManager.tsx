"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { Layers, GripVertical, Trash2, Plus, Check, ArrowUp, ArrowDown, Settings, RefreshCw, AlertTriangle, Package, X, Maximize2 } from "lucide-react";

interface PackHierarchyManagerProps {
  activePacks: string[];
  availablePacks: string[];
  onUpdatePacks: (packs: string[]) => void;
}

export interface PackHierarchyManagerRef {
  handleCompile: () => void;
}

const PackHierarchyManager = forwardRef<PackHierarchyManagerRef, PackHierarchyManagerProps>(
  ({ activePacks, availablePacks, onUpdatePacks }, ref) => {
    const [blocks, setBlocks] = useState<Record<string, string[]>>({});
    const [blockOrder, setBlockOrder] = useState<string[]>([]);
    const [draggedItem, setDraggedItem] = useState<{ block: string, index: number } | null>(null);
    const [activeBlockView, setActiveBlockView] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
    const [removingBlock, setRemovingBlock] = useState<string | null>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Group packs on mount or when activePacks change, with persistence
    useEffect(() => {
      const savedBlocks = localStorage.getItem("mim_tweak_working_blocks");
      const savedOrder = localStorage.getItem("mim_tweak_working_order");
      
      let groups: Record<string, string[]> = {};
      let order: string[] = [];
      
      if (savedBlocks && savedOrder) {
        try {
          groups = JSON.parse(savedBlocks);
          order = JSON.parse(savedOrder);
          
          // Filter out packs that are no longer in activePacks
          const currentActiveSet = new Set(activePacks);
          for (const key in groups) {
            groups[key] = groups[key].filter(p => currentActiveSet.has(p));
            if (groups[key].length === 0) {
              delete groups[key];
              order = order.filter(k => k !== key);
            }
          }
          
          // Find packs that are active but NOT in the saved state
          const savedPacksSet = new Set(Object.values(groups).flat());
          const missingPacks = activePacks.filter(p => !savedPacksSet.has(p));
          
          if (missingPacks.length > 0) {
            const missingGroups = groupPacksLogic(missingPacks);
            for (const key in missingGroups) {
              if (groups[key]) {
                groups[key].push(...missingGroups[key]);
              } else {
                groups[key] = missingGroups[key];
                order.push(key);
              }
            }
          }
          
          // We preserve the manual order from localStorage, so no sorting here!
        } catch (e) {
          console.error("Failed to parse saved blocks:", e);
          groups = groupPacksLogic(activePacks);
          order = Object.keys(groups);
        }
      } else {
        groups = groupPacksLogic(activePacks);
        order = Object.keys(groups);
      }
      
      setBlocks(groups);
      setBlockOrder(order);
      setSelectedBlocks([]); // Clear selection when packs change
    }, [activePacks]);

    // Save working order to localStorage whenever it changes
    useEffect(() => {
      if (mounted && Object.keys(blocks).length > 0) {
        localStorage.setItem("mim_tweak_working_blocks", JSON.stringify(blocks));
        localStorage.setItem("mim_tweak_working_order", JSON.stringify(blockOrder));
      }
    }, [blocks, blockOrder, mounted]);

    // Keyboard Shortcuts for moving blocks
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (selectedBlocks.length === 0) return;
        
        if (e.key === "+" || e.key === "Add") {
          e.preventDefault();
          moveSelectedBlocks(1); // Move up (decrease index)
        } else if (e.key === "-" || e.key === "Subtract") {
          e.preventDefault();
          moveSelectedBlocks(-1); // Move down (increase index)
        }
      };
      
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedBlocks, blockOrder]);

    // Expose handleCompile to parent
    useImperativeHandle(ref, () => ({
      handleCompile
    }));

    // Grouping Logic extracted to be reused
    function groupPacksLogic(packs: string[]) {
      const groups: Record<string, string[]> = {};
      
      for (const pack of packs) {
        const cleanName = pack.replace("file/", "").replace(".zip", "");
        const words = cleanName.split(/[\s\-_:]+/);
        const firstWord = words[0]?.toLowerCase() || "other";
        const groupKey = firstWord.length > 2 ? firstWord : "other";
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(pack);
      }
      
      // Sort within groups: shortest name at the BOTTOM (index length-1), longest at the TOP (index 0)
      for (const key in groups) {
        groups[key].sort((a, b) => {
          const normA = a.replace("file/", "").replace(".zip", "");
          const normB = b.replace("file/", "").replace(".zip", "");
          return normB.length - normA.length; // Longest first
        });
      }
      
      return groups;
    }

    // Check if the items in a block are correctly ordered (longer names first)
    function isBlockCorrect(items: string[]) {
      for (let i = 0; i < items.length - 1; i++) {
        const normA = items[i].replace("file/", "").replace(".zip", "");
        const normB = items[i+1].replace("file/", "").replace(".zip", "");
        if (normA.length < normB.length) return false;
      }
      return true;
    }

    const handleDragStartItem = (block: string, index: number) => {
      setDraggedItem({ block, index });
    };

    const handleDragOverItem = (e: React.DragEvent, block: string, index: number) => {
      e.preventDefault();
      if (!draggedItem || draggedItem.block !== block) return;
      
      const newBlocks = { ...blocks };
      const items = [...newBlocks[block]];
      const [movedItem] = items.splice(draggedItem.index, 1);
      items.splice(index, 0, movedItem);
      newBlocks[block] = items;
      
      setBlocks(newBlocks);
      setDraggedItem({ block, index });
    };

    const handleDropItemOnBlock = (e: React.DragEvent, targetBlock: string) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent dropping on the grid container
      
      if (!draggedItem || draggedItem.block === targetBlock) return;
      
      const newBlocks = { ...blocks };
      const sourceItems = [...newBlocks[draggedItem.block]];
      const [movedItem] = sourceItems.splice(draggedItem.index, 1);
      
      const targetItems = [...(newBlocks[targetBlock] || [])];
      targetItems.unshift(movedItem); // Add to the beginning (top) of the target block
      
      newBlocks[draggedItem.block] = sourceItems;
      newBlocks[targetBlock] = targetItems;
      
      // Clean up empty blocks with animation
      if (sourceItems.length === 0) {
        setRemovingBlock(draggedItem.block);
        setTimeout(() => {
          const updatedBlocks = { ...newBlocks };
          delete updatedBlocks[draggedItem.block];
          setBlocks(updatedBlocks);
          setBlockOrder(prev => prev.filter(b => b !== draggedItem.block));
          setSelectedBlocks(prev => prev.filter(b => b !== draggedItem.block));
          setRemovingBlock(null);
        }, 300); // Match transition duration
      } else {
        setBlocks(newBlocks);
      }
      
      setDraggedItem(null);
    };

    const handleDropItemOnGrid = (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggedItem) return;
      
      const newBlocks = { ...blocks };
      const sourceItems = [...newBlocks[draggedItem.block]];
      const [movedItem] = sourceItems.splice(draggedItem.index, 1);
      
      // Create a new block key based on the item name
      const cleanName = movedItem.replace("file/", "").replace(".zip", "");
      let newBlockKey = cleanName.toLowerCase().split(/[\s\-_:]+/)[0] || "other";
      
      // Ensure unique key
      if (newBlocks[newBlockKey]) {
        newBlockKey = `${newBlockKey}_new_${Date.now()}`;
      }
      
      newBlocks[newBlockKey] = [movedItem];
      
      setBlockOrder([...blockOrder, newBlockKey]);
      
      // Clean up empty blocks with animation
      if (sourceItems.length === 0) {
        setRemovingBlock(draggedItem.block);
        setTimeout(() => {
          const updatedBlocks = { ...newBlocks };
          delete updatedBlocks[draggedItem.block];
          setBlocks(updatedBlocks);
          setBlockOrder(prev => prev.filter(b => b !== draggedItem.block));
          setSelectedBlocks(prev => prev.filter(b => b !== draggedItem.block));
          setRemovingBlock(null);
        }, 300);
      } else {
        newBlocks[draggedItem.block] = sourceItems;
        setBlocks(newBlocks);
      }
      
      setDraggedItem(null);
    };

    const moveSelectedBlocks = (direction: number) => {
      const newOrder = [...blockOrder];
      const sortedSelected = [...selectedBlocks].sort((a, b) => newOrder.indexOf(a) - newOrder.indexOf(b));
      
      if (direction === 1) { // Move UP (Left in array)
        for (const block of sortedSelected) {
          const idx = newOrder.indexOf(block);
          if (idx > 0) {
            [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
          }
        }
      } else if (direction === -1) { // Move DOWN (Right in array)
        for (let i = sortedSelected.length - 1; i >= 0; i--) {
          const block = sortedSelected[i];
          const idx = newOrder.indexOf(block);
          if (idx < newOrder.length - 1) {
            [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
          }
        }
      }
      
      setBlockOrder(newOrder);
    };

    const handleSelectBlock = (blockKey: string, e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      
      if (e.ctrlKey || e.metaKey) {
        setSelectedBlocks(prev => 
          prev.includes(blockKey) 
            ? prev.filter(b => b !== blockKey) 
            : [...prev, blockKey]
        );
      } else {
        if (selectedBlocks.includes(blockKey) && selectedBlocks.length === 1) {
          setSelectedBlocks([]);
        } else {
          setSelectedBlocks([blockKey]);
        }
      }
    };

    const handleCompile = () => {
      const finalPacks: string[] = [];
      
      for (const blockKey of blockOrder) {
        const blockItems = blocks[blockKey] || [];
        finalPacks.push(...blockItems);
      }
      
      onUpdatePacks(finalPacks);
    };

    const handleTogglePack = (pack: string) => {
      if (activePacks.includes(pack)) {
        onUpdatePacks(activePacks.filter(p => p !== pack));
      } else {
        onUpdatePacks([...activePacks, pack]);
      }
    };

    return (
      <div 
        className="space-y-8 animate-fade-in relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropItemOnGrid}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Jerarquía de Resource Packs</h2>
            <p className="text-[10px] text-muted/50 mt-1">
              Ordena los bloques. El bloque <span className="text-emerald-400">#1</span> tiene la mayor prioridad. Toca el <span className="text-white font-bold">título</span> para seleccionar. Usa <span className="text-white font-bold">+</span> y <span className="text-white font-bold">-</span> para moverlos.
            </p>
          </div>
        </div>

        {/* Grid of Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {blockOrder.map((blockKey, blockIdx) => {
            const items = blocks[blockKey] || [];
            const displayName = blockKey.toUpperCase();
            const correct = isBlockCorrect(items);
            const isSelected = selectedBlocks.includes(blockKey);
            const isRemoving = removingBlock === blockKey;
            
            return (
              <div
                key={blockKey}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropItemOnBlock(e, blockKey)}
                className={`border rounded-2xl p-4 space-y-3 hover:border-white/10 relative transition-all duration-300 ease-in-out ${
                  isRemoving ? "scale-0 opacity-0 max-h-0 p-0 overflow-hidden border-0" : "scale-100 opacity-100"
                } ${
                  isSelected
                    ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.1)]"
                    : correct 
                      ? "bg-white/[0.02] border-white/5" 
                      : "bg-amber-500/[0.03] border-amber-500/20 shadow-[0_10px_20px_-5px_rgba(245,158,11,0.1)]"
                }`}
              >
                {/* Block Header - Clickable for selection */}
                <div 
                  className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 cursor-pointer"
                  onClick={(e) => handleSelectBlock(blockKey, e)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-300 ${
                      isSelected
                        ? "bg-primary text-white"
                        : correct ? "bg-primary/10 text-primary" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {blockIdx + 1}
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white truncate">
                      {displayName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!correct && (
                      <span title="Orden interno incorrecto (el base debería estar abajo)">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      </span>
                    )}
                    <span className="text-[10px] font-black text-muted/30 whitespace-nowrap">{items.length} packs</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveBlockView(blockKey); }}
                      className="text-muted/60 hover:text-primary transition-colors"
                      title="Expandir Bloque"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Items List (Compact) - Drag and drop enabled here too */}
                <div className="space-y-1.5">
                  {items.slice(0, 3).map((item, idx) => {
                    const name = item.replace("file/", "").replace(".zip", "");
                    
                    return (
                      <div
                        key={item}
                        draggable
                        onDragStart={(e) => handleDragStartItem(blockKey, idx)}
                        onDragOver={(e) => handleDragOverItem(e, blockKey, idx)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-[10px] font-medium transition-all duration-200 bg-white/5 text-white/70 border border-white/5 cursor-grab active:cursor-grabbing hover:bg-white/10`}
                      >
                        <GripVertical className="w-3 h-3 text-muted/60" />
                        <div className="w-5 h-5 bg-black/40 rounded flex items-center justify-center text-muted/60 border border-white/5 shrink-0">
                          <Layers className="w-2.5 h-2.5" />
                        </div>
                        <span className="truncate flex-1" title={name}>{name}</span>
                      </div>
                    );
                  })}
                  {items.length > 3 && (
                    <div className="text-[9px] text-muted/30 font-bold text-center pt-1">
                      + {items.length - 3} más...
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-200">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal View for a Single Block */}
        {activeBlockView && (
          <div 
            className="absolute inset-0 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setActiveBlockView(null)}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => e.stopPropagation()}
          >
            <div 
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 w-full max-w-xl max-h-[85%] flex flex-col space-y-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {blockOrder.indexOf(activeBlockView) + 1}
                  </div>
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] !text-white">{activeBlockView.toUpperCase()}</h2>
                    <p className="text-[9px] !text-white/60 mt-0.5">Ordena las texturas de este bloque (más grandes arriba)</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveBlockView(null)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center !text-white transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-2 flex-1 overscroll-contain">
                {(blocks[activeBlockView] || []).map((item, idx) => {
                  const name = item.replace("file/", "").replace(".zip", "");
                  const isBase = idx === (blocks[activeBlockView] || []).length - 1;
                  
                  return (
                    <div
                      key={item}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        handleDragStartItem(activeBlockView, idx);
                      }}
                      onDragOver={(e) => {
                        e.stopPropagation();
                        handleDragOverItem(e, activeBlockView, idx);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl text-[10px] font-medium transition-all duration-200 cursor-grab active:cursor-grabbing ${
                        isBase 
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                          : "bg-white/15 text-white/90 border border-white/20 hover:bg-white/25"
                      }`}
                    >
                      <GripVertical className="w-3 h-3 !text-white/40" />
                      <div className="w-5 h-5 bg-black/40 rounded flex items-center justify-center border border-white/10 shrink-0">
                        <Layers className="w-2.5 h-2.5 !text-white/60" />
                      </div>
                      <span className="flex-1 min-w-0 truncate !text-white" title={name}>{name}</span>
                      {isBase ? (
                        <span className="text-[8px] uppercase font-black text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">Base</span>
                      ) : (
                        <span className="text-[8px] uppercase font-black text-amber-400 bg-amber-500/20 px-2 py-1 rounded">Addon</span>
                      )}
                      <button
                        onClick={() => handleTogglePack(item)}
                        className="text-white/20 hover:text-rose-500 transition-colors ml-2"
                        title="Desactivar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Available Packs Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-muted/30" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/50">Librería Global ({availablePacks.length})</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar p-2 bg-black/10 rounded-2xl border border-white/[0.02]">
            {availablePacks
              .filter(p => !activePacks.includes(p))
              .map(p => {
                const name = p.replace("file/", "").replace(".zip", "");
                return (
                  <div 
                    key={p}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 hover:border-primary/20 hover:bg-white/[0.03] group transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 bg-black/40 rounded flex items-center justify-center text-muted/20 border border-white/5 shrink-0">
                        <Layers className="w-3 h-3" />
                      </div>
                      <span className="text-[10px] font-black text-muted/40 uppercase tracking-widest truncate group-hover:text-white/80 transition-colors" title={name}>
                        {name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleTogglePack(p)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/5 text-primary border border-primary/10 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Activar
                    </button>
                  </div>
                );
              })}
            {availablePacks.filter(p => !activePacks.includes(p)).length === 0 && (
              <div className="py-12 text-center opacity-10">
                <Package className="w-8 h-8 mx-auto mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">Librería vacía o todos activos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default PackHierarchyManager;
