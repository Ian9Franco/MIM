export type EnvironmentSide = "required" | "optional" | "unsupported" | "unknown";

export type EnvironmentTone = "client" | "server" | "both" | "optional" | "danger" | "unknown";

export interface InterpretedEnvironment {
  label: string;
  description: string;
  tone: EnvironmentTone;
  client: EnvironmentSide;
  server: EnvironmentSide;
}

export function normalizeEnvironmentSide(value?: string | null): EnvironmentSide {
  const side = String(value || "").toLowerCase();
  if (side === "required" || side === "optional" || side === "unsupported") return side;
  return "unknown";
}

export function environmentSideLabel(value: EnvironmentSide) {
  if (value === "required") return "Requerido";
  if (value === "optional") return "Opcional";
  if (value === "unsupported") return "No soportado";
  return "Desconocido";
}

export function interpretModEnvironment(clientValue?: string | null, serverValue?: string | null): InterpretedEnvironment {
  const client = normalizeEnvironmentSide(clientValue);
  const server = normalizeEnvironmentSide(serverValue);
  const clientSupported = client === "required" || client === "optional";
  const serverSupported = server === "required" || server === "optional";

  if (client === "unsupported" && server === "unsupported") {
    return {
      label: "No compatible",
      description: "El proyecto declara que no corre ni en cliente ni en servidor.",
      tone: "danger",
      client,
      server,
    };
  }

  if (clientSupported && server === "unsupported") {
    return {
      label: client === "required" ? "Solo cliente" : "Cliente opcional",
      description: client === "required"
        ? "Instalalo en el cliente. No va en servidores dedicados."
        : "Puede ir en cliente si queres esa funcion, pero no va en servidor.",
      tone: "client",
      client,
      server,
    };
  }

  if (serverSupported && client === "unsupported") {
    return {
      label: server === "required" ? "Solo servidor" : "Servidor opcional",
      description: server === "required"
        ? "Instalalo en el servidor. El cliente no lo necesita."
        : "Puede ir en servidor si queres esa funcion, pero no va en cliente.",
      tone: "server",
      client,
      server,
    };
  }

  if (client === "required" && server === "required") {
    return {
      label: "Cliente y servidor",
      description: "Debe estar instalado en ambos lados para funcionar correctamente.",
      tone: "both",
      client,
      server,
    };
  }

  if (client === "optional" && server === "optional") {
    return {
      label: "Opcional en ambos",
      description: "Puede estar en cliente, servidor o ambos segun el uso del pack.",
      tone: "optional",
      client,
      server,
    };
  }

  if (client === "required" && server === "optional") {
    return {
      label: "Cliente requerido",
      description: "Debe estar en el cliente; en servidor es opcional.",
      tone: "client",
      client,
      server,
    };
  }

  if (client === "optional" && server === "required") {
    return {
      label: "Servidor requerido",
      description: "Debe estar en el servidor; en cliente es opcional.",
      tone: "server",
      client,
      server,
    };
  }

  if (clientSupported || serverSupported) {
    return {
      label: clientSupported ? "Cliente declarado" : "Servidor declarado",
      description: "El otro entorno no esta declarado por la fuente. Revisalo antes de armar el pack.",
      tone: clientSupported ? "client" : "server",
      client,
      server,
    };
  }

  return {
    label: "Entorno no declarado",
    description: "La fuente no informa claramente donde debe instalarse.",
    tone: "unknown",
    client,
    server,
  };
}

export function environmentToneClass(tone: string) {
  if (tone === "client") return "border-sky-500/20 bg-sky-500/10 text-sky-200";
  if (tone === "server") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  if (tone === "both") return "border-orange-500/25 bg-orange-500/10 text-orange-200";
  if (tone === "optional") return "border-purple-500/20 bg-purple-500/10 text-purple-200";
  if (tone === "danger") return "border-red-500/25 bg-red-500/10 text-red-200";
  return "border-white/[0.08] bg-white/[0.04] text-white/65";
}
