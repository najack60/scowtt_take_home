import { getCurrentUser } from "@/lib/current-user";
import { generateAndSaveFact } from "@/lib/facts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!originHost || !host || originHost !== host) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to generate a fact." }, { status: 401 });
  }
  if (user.favoriteMovie === null) {
    return Response.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  try {
    const fact = await generateAndSaveFact(user.id, user.favoriteMovie);
    return Response.json(fact, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not generate or save movie fact:", error);
    return Response.json(
      { error: "Couldn't get a fact right now. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
