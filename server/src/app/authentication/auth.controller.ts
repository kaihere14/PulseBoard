import { getAuth } from "@clerk/express";
import type { Request, Response } from "express";
import * as authService from "./auth.services";

export const getUser = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { user, created } = await authService.getOrCreateUser(userId);
  return res.status(created ? 201 : 200).json({ user });
};