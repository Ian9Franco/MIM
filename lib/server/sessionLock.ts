import { SftpAuditError } from "./transport/sftpReadTransport";

let active = false;

/** One inspect or deploy at a time in the Desktop backend. */
export function acquireServerSession(busyMessage: string): () => void {
  if (active) throw new SftpAuditError("AUDIT_BUSY", busyMessage);
  active = true;
  return () => {
    active = false;
  };
}
