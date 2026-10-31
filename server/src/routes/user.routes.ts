import { Router } from "express";
import {
  handleGetUser,
  handleListUsers,
  handleSendUserPasswordReset,
  handleUpdateUser,
} from "../controllers/user.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireGlobalRole } from "../middleware/roles.js";

export const userRouter = Router();

userRouter.use(authenticateToken, requireGlobalRole("PLATFORM_ADMIN"));

userRouter.get("/", handleListUsers);
userRouter.get("/:id", handleGetUser);
userRouter.patch("/:id", handleUpdateUser);
userRouter.post("/:id/reset-password", handleSendUserPasswordReset);

export default userRouter;
