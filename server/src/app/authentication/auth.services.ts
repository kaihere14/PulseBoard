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