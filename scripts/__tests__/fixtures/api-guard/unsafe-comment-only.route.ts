import { withApiGuard } from "@/lib/apiGuard";

// Decoys that fooled the old textual verifier:
const marker = "withApiGuard(";
// withApiGuard({}, async () => new Response("still not guarded"));
void withApiGuard;

export async function GET() {
  return new Response("unsafe");
}
