import { auth } from "./auth";

export type Actor = {
  id: string;
  name: string;
  role: "OPERATOR" | "INVESTOR" | "ADMIN";
};

/**
 * Resolve the current authenticated actor from the request session.
 * Returns `null` when unauthenticated so route handlers can respond 401.
 */
export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user as {
    id?: string;
    name?: string | null;
    role?: string;
  };
  if (!u.id) return null;
  return {
    id: u.id,
    name: u.name ?? "unknown",
    role: (u.role as Actor["role"]) ?? "OPERATOR",
  };
}
