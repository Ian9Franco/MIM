import net from "node:net";
import type { CommandChannel } from "@mim/contracts-core/server";
import { SftpAuditError } from "./sftpReadTransport";

const TYPE_COMMAND = 2;
const TYPE_LOGIN = 3;
const MAX_PACKET = 4096;

function encodePacket(id: number, type: number, body: string): Buffer {
  const payload = Buffer.from(body, "utf8");
  const packet = Buffer.alloc(14 + payload.length);
  packet.writeInt32LE(10 + payload.length, 0);
  packet.writeInt32LE(id, 4);
  packet.writeInt32LE(type, 8);
  payload.copy(packet, 12);
  return packet;
}

function readPackets(buffer: Buffer): { packets: Array<{ id: number; type: number; body: string }>; rest: Buffer } {
  const packets: Array<{ id: number; type: number; body: string }> = [];
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const size = buffer.readInt32LE(offset);
    if (size < 10 || size > MAX_PACKET) throw new SftpAuditError("RCON_PROTOCOL", "El servidor RCON devolvió un paquete inválido.");
    if (offset + 4 + size > buffer.length) break;
    const id = buffer.readInt32LE(offset + 4);
    const type = buffer.readInt32LE(offset + 8);
    const body = buffer.subarray(offset + 12, offset + 4 + size - 2).toString("utf8");
    packets.push({ id, type, body });
    offset += 4 + size;
  }
  return { packets, rest: Buffer.from(buffer.subarray(offset)) };
}

export async function openRconChannel(options: {
  host: string;
  port: number;
  password: string;
  signal: AbortSignal;
  timeoutMs?: number;
}): Promise<{ channel: CommandChannel; close: () => void }> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const socket = new net.Socket();
  let buffer: Buffer = Buffer.alloc(0);
  let nextId = 1;
  const pending = new Map<number, { resolve: (body: string) => void; reject: (error: Error) => void }>();

  function failAll(error: Error) {
    for (const waiter of pending.values()) waiter.reject(error);
    pending.clear();
  }

  function onAbort() {
    const error = new SftpAuditError("RCON_TIMEOUT", "La consola RCON se canceló o superó el tiempo de espera.");
    failAll(error);
    socket.destroy();
  }

  options.signal.addEventListener("abort", onAbort, { once: true });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new SftpAuditError("RCON_TIMEOUT", "No se pudo conectar a RCON a tiempo."));
    }, timeoutMs);
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(new SftpAuditError("RCON_CONNECT", error.message || "No se pudo conectar a RCON."));
    });
    socket.connect(options.port, options.host, () => {
      clearTimeout(timer);
      resolve();
    });
  });

  socket.on("data", (chunk: Buffer) => {
    buffer = Buffer.from(Buffer.concat([buffer, chunk]));
    try {
      const parsed = readPackets(buffer);
      buffer = Buffer.from(parsed.rest);
      for (const packet of parsed.packets) {
        if (packet.id === -1) {
          failAll(new SftpAuditError("RCON_AUTH", "La contraseña RCON fue rechazada."));
          socket.destroy();
          return;
        }
        const waiter = pending.get(packet.id);
        if (waiter) {
          pending.delete(packet.id);
          waiter.resolve(packet.body);
        }
      }
    } catch (error) {
      failAll(error instanceof Error ? error : new Error(String(error)));
      socket.destroy();
    }
  });

  socket.on("close", () => {
    failAll(new SftpAuditError("RCON_CLOSED", "La conexión RCON se cerró."));
    options.signal.removeEventListener("abort", onAbort);
  });

  async function request(type: number, body: string): Promise<{ id: number; body: string }> {
    const id = nextId++;
    const packet = encodePacket(id, type, body);
    const response = new Promise<string>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.delete(id)) {
          reject(new SftpAuditError("RCON_TIMEOUT", "El comando RCON no respondió a tiempo."));
        }
      }, timeoutMs);
    });
    socket.write(packet);
    const text = await response;
    return { id, body: text };
  }

  await request(TYPE_LOGIN, options.password);

  const channel: CommandChannel = {
    async execute(command) {
      const result = await request(TYPE_COMMAND, command);
      return { output: result.body, accepted: result.id !== -1 };
    },
  };

  return {
    channel,
    close: () => {
      socket.destroy();
    },
  };
}

