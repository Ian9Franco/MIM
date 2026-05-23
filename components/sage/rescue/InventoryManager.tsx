import React, { useState } from "react";
import { Package, Trash2, AlertCircle, Search } from "lucide-react";
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

  const handleClearInventory = () => {
    if (window.confirm("⚠️  ¿Borrar TODOS los ítems del inventario? ¡Esto no se puede deshacer!")) {
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
    }
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
            onClick={handleClearInventory}
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
                    <button
                      onClick={() => handleDeleteItem(index)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
    </div>
  );
}
