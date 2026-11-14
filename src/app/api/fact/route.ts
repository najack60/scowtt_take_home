import { apiError, privateHeaders } from "@/lib/api-server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Sign in to view a fact.", 401);
    const expectedUser = request.headers.get("x-expected-user-id");
    if (expectedUser && expectedUser !== user.id) return apiError("Your session has changed. Please reload.", 409);
    if (user.favoriteMovie === null) return apiError("Complete onboarding first.", 403);

    const fact = await prisma.fact.findFirst({
      where: { userId: user.id, movie: user.favoriteMovie },
      orderBy: { createdAt: "desc" },
      select: { movie: true, content: true, createdAt: true },
    });
    return Response.json({ fact }, { headers: privateHeaders });
  } catch (error) {
    console.error("Could not load movie fact:", error);
    return apiError("Couldn't get a fact right now. Please try again.", 500);
  }
}
