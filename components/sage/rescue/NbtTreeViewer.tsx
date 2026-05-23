import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Type,
  Database,
  List,
  Box,
  Copy,
  Edit2,
  Trash2,
  X,
  Check
} from "lucide-react";
import { TagType, NBTTag } from "@/lib/modding/nbt";

interface NBTTreeViewerProps {
  nbtRoot: NBTTag;
  onModify?: (modifiedRoot: NBTTag) => void;
  readOnly?: boolean;
}

export function NbtTreeViewer({ nbtRoot, onModify, readOnly = false }: NBTTreeViewerProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(["root"]));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const updateNbtAtPath = (root: NBTTag, keyPath: string, newValue: any, isDelete: boolean = false): NBTTag => {
    const newRoot = JSON.parse(JSON.stringify(root));
    if (keyPath === 'root') return isDelete ? { type: TagType.Compound, name: "", value: {} } : newValue;

    const pathParts = keyPath.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    if (pathParts[0] === 'root') pathParts.shift();

    let current: any = newRoot;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (current.type === TagType.Compound) current = current.value[part];
      else if (current.type === TagType.List) current = current.value.list[Number(part)];
      else current = current.value[Number(part)];
    }

    const lastPart = pathParts[pathParts.length - 1];
    if (current.type === TagType.Compound) {
      if (isDelete) delete current.value[lastPart];
      else current.value[lastPart].value = newValue;
    } else if (current.type === TagType.List) {
      if (isDelete) current.value.list.splice(Number(lastPart), 1);
      else {
        // If it's a list of compounds, the item might be the whole object, but for primitives we update the literal.
        if (typeof current.value.list[Number(lastPart)] === 'object' && current.value.list[Number(lastPart)].value !== undefined) {
           current.value.list[Number(lastPart)].value = newValue;
        } else {
           current.value.list[Number(lastPart)] = newValue;
        }
      }
    }
    return newRoot;
  };

  const handleCopy = (type: TagType, value: any) => {
    let text = renderValue(type, value);
    if (type === TagType.String) text = value;
    navigator.clipboard.writeText(text);
  };

  const startEdit = (keyPath: string, type: TagType, currentValue: any) => {
    if ([TagType.Compound, TagType.List, TagType.ByteArray, TagType.IntArray, TagType.LongArray].includes(type)) {
      alert("No se pueden editar compuestos o arreglos directamente.");
      return;
    }
    setEditingKey(keyPath);
    setEditValue(String(currentValue));
  };

  const submitEdit = (keyPath: string, type: TagType) => {
    setEditingKey(null);
    let parsedVal: any = editValue;
    if ([TagType.Byte, TagType.Short, TagType.Int, TagType.Long, TagType.Float, TagType.Double].includes(type)) {
      parsedVal = Number(editValue);
      if (isNaN(parsedVal)) {
        alert("Valor numérico inválido");
        return;
      }
    }
    if (onModify) onModify(updateNbtAtPath(nbtRoot, keyPath, parsedVal));
  };

  const handleDelete = (keyPath: string) => {
    if (window.confirm(`¿Seguro que quieres eliminar la etiqueta ${keyPath}?`)) {
      if (onModify) onModify(updateNbtAtPath(nbtRoot, keyPath, null, true));
    }
  };

  const toggleExpand = (key: string) => {
    const newSet = new Set(expandedKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedKeys(newSet);
  };

  const getTagIcon = (type: TagType) => {
    switch (type) {
      case TagType.Byte:
      case TagType.Short:
      case TagType.Int:
      case TagType.Long:
        return <Hash className="w-4 h-4 text-blue-400" />;
      case TagType.Float:
      case TagType.Double:
        return <Hash className="w-4 h-4 text-cyan-400" />;
      case TagType.String:
        return <Type className="w-4 h-4 text-amber-400" />;
      case TagType.List:
        return <List className="w-4 h-4 text-purple-400" />;
      case TagType.Compound:
        return <Box className="w-4 h-4 text-pink-400" />;
      case TagType.ByteArray:
      case TagType.IntArray:
      case TagType.LongArray:
        return <Database className="w-4 h-4 text-green-400" />;
      default:
        return null;
    }
  };

  const getTagTypeName = (type: TagType): string => {
    const names: Record<TagType, string> = {
      [TagType.End]: "End",
      [TagType.Byte]: "Byte",
      [TagType.Short]: "Short",
      [TagType.Int]: "Int",
      [TagType.Long]: "Long",
      [TagType.Float]: "Float",
      [TagType.Double]: "Double",
      [TagType.ByteArray]: "ByteArray",
      [TagType.String]: "String",
      [TagType.List]: "List",
      [TagType.Compound]: "Compound",
      [TagType.IntArray]: "IntArray",
      [TagType.LongArray]: "LongArray"
    };
    return names[type] || "Unknown";
  };

  const renderValue = (type: TagType, value: any): string => {
    switch (type) {
      case TagType.Byte:
      case TagType.Short:
      case TagType.Int:
      case TagType.Long:
      case TagType.Float:
      case TagType.Double:
        return String(value);
      case TagType.String:
        return `"${value}"`;
      case TagType.List:
        const listData = value as { itemType: TagType; list: any[] };
        return `List<${getTagTypeName(listData.itemType)}> [${listData.list.length}]`;
      case TagType.Compound:
        const compound = value as Record<string, NBTTag>;
        return `Compound {${Object.keys(compound).length} entries}`;
      case TagType.ByteArray:
      case TagType.IntArray:
      case TagType.LongArray:
        const arr = value as any[];
        return `${getTagTypeName(type)} [${arr.length}]`;
      default:
        return String(value);
    }
  };

  const renderTag = (tag: NBTTag, keyPath: string, depth: number = 0): React.ReactNode => {
    const isCompound = tag.type === TagType.Compound;
    const isList = tag.type === TagType.List;
    const isExpandable = isCompound || isList;
    const isExpanded = expandedKeys.has(keyPath);

    return (
      <div key={keyPath} className="space-y-0">
        <div className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 group ${depth > 0 ? "ml-4" : ""}`}>
          {isExpandable && (
            <button
              onClick={() => toggleExpand(keyPath)}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-white/50" />
              ) : (
                <ChevronRight className="w-4 h-4 text-white/50" />
              )}
            </button>
          )}
          {!isExpandable && <div className="w-4" />}

          {getTagIcon(tag.type)}

          <span className="font-mono text-xs text-amber-300 flex-shrink-0 min-w-[120px]">
            {tag.name}
          </span>

          <span className="text-[10px] text-white/40 uppercase tracking-tight px-2 py-0.5 bg-white/5 rounded flex-shrink-0">
            {getTagTypeName(tag.type)}
          </span>

          {editingKey === keyPath ? (
            <input 
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => submitEdit(keyPath, tag.type)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(keyPath, tag.type); else if (e.key === 'Escape') setEditingKey(null); }}
              className="bg-black/50 border border-white/20 text-white rounded px-1 ml-auto font-mono text-xs min-w-[80px]"
            />
          ) : (
            <span className="text-xs text-white/50 ml-auto font-mono">
              {renderValue(tag.type, tag.value)}
            </span>
          )}

          {!readOnly && !isExpandable && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
              <button onClick={() => handleCopy(tag.type, tag.value)} className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white/60" title="Copiar">
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={() => startEdit(keyPath, tag.type, tag.value)}
                className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white/60"
                title="Editar"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDelete(keyPath)}
                className="p-1 hover:bg-red-500/20 rounded text-white/40 hover:text-red-400"
                title="Eliminar"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {isExpanded && isCompound && (
          <div>
            {Object.entries(tag.value as Record<string, NBTTag>).map(([_, childTag]) => {
              const childKeyPath = `${keyPath}.${childTag.name}`;
              return renderTag(childTag, childKeyPath, depth + 1);
            })}
          </div>
        )}

        {isExpanded && isList && (
          <div>
            {(() => {
              const listData = tag.value as { itemType: TagType; list: any[] };
              return listData.list.map((item, index) => {
                const childKeyPath = `${keyPath}[${index}]`;
                return (
                  <div key={childKeyPath} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 ml-4">
                    <div className="w-4" />
                    {getTagIcon(listData.itemType)}
                    <span className="font-mono text-xs text-white/40">[{index}]</span>
                    <span className="text-[10px] text-white/40 uppercase tracking-tight px-2 py-0.5 bg-white/5 rounded">
                      {getTagTypeName(listData.itemType)}
                    </span>
                    {editingKey === childKeyPath ? (
                      <input 
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => submitEdit(childKeyPath, listData.itemType)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(childKeyPath, listData.itemType); else if (e.key === 'Escape') setEditingKey(null); }}
                        className="bg-black/50 border border-white/20 text-white rounded px-1 ml-auto font-mono text-xs min-w-[80px] mr-2"
                      />
                    ) : (
                      <span className="text-xs text-white/50 ml-auto font-mono pr-2">
                        {renderValue(listData.itemType, item)}
                      </span>
                    )}
                    {!readOnly && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={() => handleCopy(listData.itemType, item)} className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white/60" title="Copiar">
                          <Copy className="w-3 h-3" />
                        </button>
                        {![TagType.Compound, TagType.List, TagType.ByteArray, TagType.IntArray, TagType.LongArray].includes(listData.itemType) && (
                          <button
                            onClick={() => startEdit(childKeyPath, listData.itemType, typeof item === 'object' && item.value !== undefined ? item.value : item)}
                            className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white/60"
                            title="Editar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(childKeyPath)}
                          className="p-1 hover:bg-red-500/20 rounded text-white/40 hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 font-mono text-xs overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
        <div className="space-y-0">
          {renderTag(nbtRoot, "root")}
        </div>
      </div>

      {!readOnly && (
        <div className="flex gap-2 text-xs">
          <p className="text-white/40">
            📝 Modifica los valores haciendo clic en ellos o expande los compuestos/listas para explorar la jerarquía NBT.
          </p>
        </div>
      )}
    </div>
  );
}
