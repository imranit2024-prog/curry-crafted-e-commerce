import { cache } from "react";
import { redirect } from "next/navigation";
import { getJson } from "./api";
import type { PostcodeResult, UserDTO } from "./types";

/** The signed-in customer and the saved postcode's delivery result, resolved by the API from the visitor's cookies. */
export const getSession = cache(() => getJson<{ user: UserDTO | null; postcode: PostcodeResult | null }>("/api/session"));

export async function getCurrentUser(): Promise<UserDTO | null> {
  return (await getSession()).user;
}

/** For pages that require a signed-in customer. Redirects to sign-in otherwise. */
export async function requireUser(next = "/account"): Promise<UserDTO> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
