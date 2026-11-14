import { apiError, hasValidOrigin, privateHeaders } from "@/lib/api-server";
import { getCurrentUser } from "@/lib/current-user";
import { validateMovie } from "@/lib/movie";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  if (!hasValidOrigin(request)) return apiError("Invalid request origin.", 403);

  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Sign in to update your movie.", 401);
    const expectedUser = request.headers.get("x-expected-user-id");
    if (expectedUser && expectedUser !== user.id) {
      return apiError("Your session has changed. Please reload.", 409);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Enter a valid movie title.", 400);
    }
    const movie = typeof body === "object" && body !== null && "movie" in body
      ? body.movie
      : null;
    const result = validateMovie(typeof movie === "string" ? movie : null);
    if ("error" in result) return apiError(result.error, 400);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { favoriteMovie: result.movie },
      select: { id: true, name: true, email: true, image: true, favoriteMovie: true },
    });
    return Response.json(updated, { headers: privateHeaders });
  } catch (error) {
    console.error("Could not update favorite movie:", error);
    return apiError("Couldn't save your movie. Please try again.", 500);
  }
}
