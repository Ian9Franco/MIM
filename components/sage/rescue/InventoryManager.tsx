import React, { useState } from "react";
import { Package, Trash2, AlertCircle, Search, Edit2, X, Save, Copy } from "lucide-react";
import { TagType, NBTTag } from "@/lib/modding/nbt";

interface InventoryManagerProps {
  playerCompound: Record<string, NBTTag> | null;
  onInventoryModify?: (newInventory: NBTTag) => void;
  readOnly?: boolean;
}

export function InventoryManager({
  playerCompound,
  onInventoryModify,
  readOnly = false
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ id: "", count: 1, slot: 0 });

  if (!playerCompound || !playerCompound["Inventory"]) {
    return (
      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center gap-3 text-white/40">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">No se encontraron datos de inventario</span>
      </div>
    );
  }

  const inventoryTag = playerCompound["Inventory"];
  if (inventoryTag.type !== TagType.List) {
    return (
      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center gap-3 text-red-400">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">Estructura de inventario inválida</span>
      </div>
    );
  }

  const listData = inventoryTag.value as { itemType: TagType; list: any[] };
  const items = listData.list;

  const getItemId = (item: any): string => {
    const idVal = item.id?.value ?? item.id;
    if (idVal !== undefined) {
      return String(idVal);
    }
    return "Desconocido";
  };

  const getItemCount = (item: any): number => {
    const countVal = item.Count?.value ?? item.Count;
    if (countVal !== undefined) {
      return Number(countVal);
    }
    return 1;
  };

  const getItemSlot = (item: any): number => {
    return Number(item.Slot?.value ?? item.Slot ?? 0);
  };

  const filteredItems = items.map((item, index) => ({
    index,
    item,
    id: getItemId(item),
    count: getItemCount(item),
    slot: getItemSlot(item)
  })).filter(({ id }) => 
    id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteItem = (index: number) => {
    const newList = items.filter((_, i) => i !== index);
    if (onInventoryModify) {
      onInventoryModify({
        type: TagType.List,
        name: "Inventory",
        value: {
          itemType: listData.itemType,
          list: newList
        }
      });
    }
  };

  const handleClearInventoryConfirm = () => {
    if (onInventoryModify) {
      onInventoryModify({
        type: TagType.List,
        name: "Inventory",
        value: {
          itemType: listData.itemType,
          list: []
        }
      });
    }
    setClearConfirmOpen(false);
  };

  const handleDuplicateItem = (index: number) => {
    if (!onInventoryModify) return;
    const newList = JSON.parse(JSON.stringify(items));
    const itemToClone = JSON.parse(JSON.stringify(newList[index]));

    // Find first available slot (0-35)
    const usedSlots = new Set(newList.map(getItemSlot));
    let newSlot = 0;
    while (usedSlots.has(newSlot) && newSlot < 36) {
      newSlot++;
    }
    
    // Fallback if inventory is full
    if (newSlot >= 36) {
      newSlot = Math.max(...Array.from(usedSlots).map(Number), 35) + 1;
    }

    if (itemToClone.Slot?.value !== undefined) {
      itemToClone.Slot.value = newSlot;
    } else {
      itemToClone.Slot = { type: TagType.Byte, value: newSlot };
    }

    newList.push(itemToClone);

    onInventoryModify({
      type: TagType.List,
      name: "Inventory",
      value: {
        itemType: listData.itemType,
        list: newList
      }
    });
  };

  const handleEditItem = (index: number, id: string, count: number, slot: number) => {
    setEditForm({ id, count, slot });
    setEditingIndex(index);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !onInventoryModify) return;
    
    // Create deep copy of the items list
    const newList = JSON.parse(JSON.stringify(items));
    const itemToEdit = newList[editingIndex];

    // Update ID
    if (itemToEdit.id?.value !== undefined) {
      itemToEdit.id.value = editForm.id;
    } else {
      itemToEdit.id = { type: TagType.String, value: editForm.id };
    }

    // Update Count
    if (itemToEdit.Count?.value !== undefined) {
      itemToEdit.Count.value = editForm.count;
    } else {
      itemToEdit.Count = { type: TagType.Byte, value: editForm.count };
    }

    onInventoryModify({
      type: TagType.List,
      name: "Inventory",
      value: {
        itemType: listData.itemType,
        list: newList
      }
    });

    setEditingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Buscar ID de ítem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        {!readOnly && items.length > 0 && (
          <button
            onClick={() => setClearConfirmOpen(true)}
            className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar Todo
          </button>
        )}
      </div>

      <div className="rounded-lg bg-white/[0.02] border border-white/5 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3 text-white/30">
            <Package className="w-8 h-8 opacity-50" />
            <p className="text-sm">
              {items.length === 0 ? "El inventario está vacío" : "Ningún ítem coincide con tu búsqueda"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <div className="grid grid-cols-12 gap-2 p-3 bg-white/[0.02] text-xs font-bold uppercase tracking-widest text-white/40 sticky top-0">
              <div className="col-span-1">Ranura</div>
              <div className="col-span-5">ID de Ítem</div>
              <div className="col-span-2">Cant.</div>
              <div className="col-span-2">NBT</div>
              <div className="col-span-2 text-right">Acción</div>
            </div>

            {filteredItems.map(({ index, item, id, count, slot }) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-white/5 transition-colors group"
              >
                <div className="col-span-1 font-mono text-xs text-white/60">{slot}</div>
                <div className="col-span-5">
                  <div className="font-mono text-xs text-amber-300 break-words">{id}</div>
                </div>
                <div className="col-span-2 text-sm font-bold text-white/70">{count}x</div>
                <div className="col-span-2">
                  {item.tag ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      NBT
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/20">—</span>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  {!readOnly && (
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicateItem(index)}
                        className="p-1.5 rounded hover:bg-emerald-500/20 text-white/40 hover:text-emerald-300 transition-colors"
                        title="Duplicar ítem"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEditItem(index, id, count, slot)}
                        className="p-1.5 rounded hover:bg-amber-500/20 text-white/40 hover:text-amber-300 transition-colors"
                        title="Editar ítem"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(index)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-300 transition-colors"
                        title="Eliminar ítem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Borrar ítems directamente modifica la lista del inventario. Los ítems complejos con datos NBT serán eliminados por completo.
        </p>
      </div>

      {/* Clear Confirm Modal */}
      {clearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">¿Borrar Inventario?</h3>
            </div>
            <p className="text-white/70 text-sm mb-6">
              Esta acción eliminará <strong>todos</strong> los ítems del inventario actual. ¡No se puede deshacer!
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setClearConfirmOpen(false)}
                className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearInventoryConfirm}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                Sí, Borrar Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                Editar Ítem
              </h3>
              <button
                onClick={() => setEditingIndex(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5">ID del Ítem</label>
                <input
                  type="text"
                  value={editForm.id}
                  onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    max="127"
                    value={editForm.count}
                    onChange={(e) => setEditForm({ ...editForm, count: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5">Slot (Solo lectura)</label>
                  <input
                    type="number"
                    readOnly
                    value={editForm.slot}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white/40 font-mono text-sm cursor-not-allowed opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setEditingIndex(null)}
                className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
