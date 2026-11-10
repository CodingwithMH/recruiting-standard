import { Router } from "express";
import healthRouter from "./health.routes.js";
import authRouter from "./auth.routes.js";
import schoolRouter from "./school.routes.js";
import userRouter from "./user.routes.js";
import parentRouter from "./parent.routes.js";
import athleteRouter from "./athlete.routes.js";
import coachRouter from "./coach.routes.js";
import subscriptionRouter from "./subscription.routes.js";
import documentRouter from "./document.routes.js";
import adminRouter from "./admin.routes.js";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/schools", schoolRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/parent", parentRouter);
apiRouter.use("/athlete", athleteRouter);
apiRouter.use("/coach", coachRouter);
apiRouter.use("/subscriptions", subscriptionRouter);
apiRouter.use("/documents", documentRouter);
apiRouter.use("/admin", adminRouter);

export default apiRouter;
