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

export const postAnonymousUser = async (req: Request, res: Response) => {
  const body = req.body as { name?: unknown; id?: unknown };
  const id = typeof body.id === "string" && body.id.trim().length > 0 ? body.id.trim() : undefined;
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (id) {
    const user = await authService.findAnonymousById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({ user, created: false });
  }

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  const user = await authService.createAnonymousUser(name);
  return res.status(201).json({ user, created: true });
};
