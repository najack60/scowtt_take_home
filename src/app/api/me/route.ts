import { getCurrentUser } from "@/lib/current-user";
import { apiError, privateHeaders } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Sign in to view your profile.", 401);
    return Response.json(user, { headers: privateHeaders });
  } catch (error) {
    console.error("Could not load profile:", error);
    return apiError("Couldn't load your profile. Please try again.", 500);
  }
}
