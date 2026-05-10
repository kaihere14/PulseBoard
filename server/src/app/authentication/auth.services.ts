import { clerkClient } from "@clerk/express";
import type { User } from "@clerk/backend";
import Auth from "./auth.schema";

export async function createUserFromClerk(userDetail: User) {
  return Auth.create({
    userId: userDetail.id,
    email: userDetail.primaryEmailAddress?.emailAddress ?? "",
    name: userDetail.firstName ?? "",
    image: userDetail.imageUrl,
  });
}

export async function getOrCreateUser(userId: string) {
  const existing = await Auth.findOne({ userId });
  if (existing) {
    return { user: existing, created: false as const };
  }

  const userDetail = await clerkClient.users.getUser(userId);
  const user = await createUserFromClerk(userDetail);
  return { user, created: true as const };
}

export async function findAnonymousById(anonymousId: string) {
  return Auth.findOne({ anonymousId: anonymousId.trim() });
}

/** Create a guest row with a server-generated `anonymousId` and the client-provided `name`. */
export async function createAnonymousUser(name: string) {
  const anonymousId = crypto.randomUUID();
  return Auth.create({
    anonymousId,
    userId: `anon_${crypto.randomUUID()}`,
    name: name.trim(),
    email: "",
  });
}
