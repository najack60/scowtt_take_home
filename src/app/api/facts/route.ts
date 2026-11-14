import { getCurrentUser } from "@/lib/current-user";
import { generateAndSaveFact } from "@/lib/facts";
import { apiError, hasValidOrigin, privateHeaders } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return apiError("Invalid request origin.", 403);

  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Sign in to generate a fact.", 401);
    const expectedUser = request.headers.get("x-expected-user-id");
    if (expectedUser && expectedUser !== user.id) return apiError("Your session has changed. Please reload.", 409);
    if (user.favoriteMovie === null) return apiError("Complete onboarding first.", 403);

    const fact = await generateAndSaveFact(user.id, user.favoriteMovie);
    return Response.json({ fact }, { headers: privateHeaders });
  } catch (error) {
    console.error("Could not generate or save movie fact:", error);
    return apiError("Couldn't get a fact right now. Please try again.", 500);
  }
}
