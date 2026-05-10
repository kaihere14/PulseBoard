import { Router } from "express";
import * as authController from "./auth.controller";

const router = Router();

router.get("/", authController.getUser);
router.post("/anonymous", authController.postAnonymousUser);

export default router;
