export const dynamic = "force-dynamic";

// Demo mode is intentionally database-free. All sample records are generated
// from src/data/seedData.ts and edits are stored in the browser only.
export async function GET() {
  return Response.json({ ok: true, mode: "demo", storage: "browser-local" });
}
