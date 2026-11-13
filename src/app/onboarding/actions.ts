"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { validateMovie } from "@/lib/movie";
import { prisma } from "@/lib/prisma";

export type OnboardingState = {
  error?: string;
  value?: string;
};

export async function saveMovie(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.favoriteMovie !== null) redirect("/dashboard");

  const result = validateMovie(formData.get("movie"));
  if ("error" in result) return result;

  try {
    await prisma.user.updateMany({
      where: { id: user.id, favoriteMovie: null },
      data: { favoriteMovie: result.movie },
    });
  } catch (error) {
    console.error("Could not save favorite movie:", error);
    return { error: "Could not save your movie. Please try again.", value: result.movie };
  }

  redirect("/dashboard");
}
