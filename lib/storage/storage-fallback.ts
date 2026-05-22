/**
 * LocalStorage Fallback for Incident Storage
 */
import { Incident } from "@/lib/intelligence/incidentManager";

export class StorageFallback {
  static save(incident: Incident) {
    const list = this.getAll();
    const idx = list.findIndex(i => i.id === incident.id);
    if (idx >= 0) list[idx] = incident;
    else list.unshift(incident);
    localStorage.setItem("mim_incidents", JSON.stringify(list.slice(0, 50)));
  }

  static getAll(options: any = {}): Incident[] {
    try {
      const saved = localStorage.getItem("mim_incidents");
      if (!saved) return [];
      let list = JSON.parse(saved) as Incident[];
      if (options.status && options.status !== "all") list = list.filter(i => i.status === options.status);
      if (options.module) list = list.filter(i => i.module === options.module);
      if (options.severity) list = list.filter(i => i.severity === options.severity);
      list.sort((a, b) => (options.orderDirection === "desc" ? -1 : 1) * a.timestamp.localeCompare(b.timestamp));
      return list.slice(options.offset || 0, (options.offset || 0) + (options.limit || 50));
    } catch { return []; }
  }

  static markAsSeen(ids?: string[]) {
    const list = this.getAll();
    list.forEach(i => { if (!ids || ids.includes(i.id)) i.seen = true; });
    localStorage.setItem("mim_incidents", JSON.stringify(list));
  }

  static resolve(id: string) {
    const list = this.getAll();
    const item = list.find(i => i.id === id);
    if (item) { item.status = "resolved"; localStorage.setItem("mim_incidents", JSON.stringify(list)); }
  }

  static getStats() {
    const list = this.getAll();
    const stats = { total: list.length, active: 0, resolved: 0, unseen: 0, byModule: {} as any, bySeverity: {} as any };
    list.forEach(i => {
      if (i.status === "active") stats.active++;
      if (i.status === "resolved") stats.resolved++;
      if (!i.seen) stats.unseen++;
      stats.byModule[i.module] = (stats.byModule[i.module] || 0) + 1;
      stats.bySeverity[i.severity] = (stats.bySeverity[i.severity] || 0) + 1;
    });
    return stats;
  }

  static cleanup(keep: number) {
    const list = this.getAll().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    localStorage.setItem("mim_incidents", JSON.stringify(list.slice(0, keep)));
  }
}
