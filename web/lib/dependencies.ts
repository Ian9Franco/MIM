export type DependencyKind = "required" | "optional" | "incompatible" | "embedded";

export interface DependencyGroupMeta {
  title: string;
  empty: string;
  badge: string;
  className: string;
}

export const DEPENDENCY_GROUPS: Record<DependencyKind, DependencyGroupMeta> = {
  required: {
    title: "Obligatorias",
    empty: "No hay dependencias obligatorias.",
    badge: "Requerida",
    className: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  },
  optional: {
    title: "Opcionales",
    empty: "No hay dependencias opcionales.",
    badge: "Opcional",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  },
  incompatible: {
    title: "Incompatibilidades",
    empty: "No se declararon incompatibilidades.",
    badge: "Incompatible",
    className: "border-red-500/25 bg-red-500/10 text-red-300",
  },
  embedded: {
    title: "Otras relaciones",
    empty: "No hay otras relaciones.",
    badge: "Relacion",
    className: "border-white/[0.08] bg-white/[0.05] text-white/45",
  },
};

export function normalizeDependencyKind(dep: any): DependencyKind {
  const raw = String(dep?.dependency_type || dep?.dependencyType || dep?.relationType || "").toLowerCase();
  if (raw === "required" || raw === "requireddependency" || raw === "3") return "required";
  if (raw === "optional" || raw === "optionaldependency" || raw === "2") return "optional";
  if (raw === "incompatible" || raw === "incompatibility" || raw === "5") return "incompatible";
  return "embedded";
}

function dependencyTypeRank(type?: string) {
  if (type === "required") return 4;
  if (type === "incompatible") return 3;
  if (type === "optional") return 2;
  return 1;
}

export function buildDependencyTypeMap(versions: any[]) {
  const map = new Map<string, string>();
  versions.forEach((version) => {
    (version.dependencies || []).forEach((dependency: any) => {
      const projectId = dependency.project_id || dependency.projectId;
      const type = dependency.dependency_type || dependency.dependencyType || "required";
      if (!projectId) return;
      const current = map.get(projectId);
      if (!current || dependencyTypeRank(type) > dependencyTypeRank(current)) {
        map.set(projectId, type);
      }
    });
  });
  return map;
}

export function attachDependencyTypes(projects: any[], typeMap: Map<string, string>) {
  return projects.map((project) => {
    const projectId = project.id || project.project_id || project.projectId;
    return {
      ...project,
      project_id: projectId,
      dependency_type: typeMap.get(projectId) || project.dependency_type || "required",
    };
  });
}
