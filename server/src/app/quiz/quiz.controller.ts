import type { Request, Response } from "express";

export const createQuiz = (req: Request, res: Response) => {
    return res.status(200).json({ message: "Soon to be implemented" });
};