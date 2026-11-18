/**
 * Backend entry point.
 *
 * Configuration and shared state live in focused modules; this file only wires
 * the Express app, installs middleware in the original order, registers routes
 * by domain, and manages the server lifecycle.
 */
import express from "express";
import { sanitizeUser } from "./auth/roles";
import { createToken } from "./auth";
import "./config";
import {
  errorHandlerMiddleware,
  installBaseMiddleware,
  installMetricsMiddleware,
  installRateLimitMiddleware,
  installRequestMiddleware,
  installRouteHandlerWrapper,
  notFoundMiddleware,
} from "./middleware";
import { getRuntimeReady, shutdownServer, startServer } from "./runtime";
import { registerAdminMonitoringRoutes, registerAdminRecruiterRequestRoutes, registerResumeAdminRoutes, registerUserAdminRoutes } from "./routes/admin";
import { registerApplicationRoutes, registerCandidateRoutes } from "./routes/candidates";
import { registerCareerRoutes } from "./routes/career";
import { registerCourseRoutes, registerDashboardRoutes, registerHealthRoutes } from "./routes/courses";
import { registerAuthRoutes } from "./routes/auth";
import { registerJobTrackerRoutes, registerRecommendationRoutes } from "./routes/jobTracker";
import { registerJobRoutes } from "./routes/jobs";
import { registerRecruiterRoutes } from "./routes/recruiter";
import { registerResumeRoutes } from "./routes/resume";
import { db } from "./state";
import { logError } from "./logging";

const app = express();

installRouteHandlerWrapper(app);
installBaseMiddleware(app);
installRequestMiddleware(app);
installRateLimitMiddleware(app);
installMetricsMiddleware(app);

registerAuthRoutes(app);
registerAdminRecruiterRequestRoutes(app);
registerUserAdminRoutes(app);
registerResumeRoutes(app);
registerResumeAdminRoutes(app);
registerJobRoutes(app);
registerCandidateRoutes(app);
registerApplicationRoutes(app);
registerRecommendationRoutes(app);
registerCareerRoutes(app);
registerJobTrackerRoutes(app);
registerRecruiterRoutes(app);
registerCourseRoutes(app);
registerDashboardRoutes(app);
registerAdminMonitoringRoutes(app);
registerHealthRoutes(app);

app.use("/api", notFoundMiddleware);

const shouldAutoStartServer =
  process.env.VERCEL === undefined &&
  process.env.SKIP_BACKEND_AUTOSTART !== "1";

if (shouldAutoStartServer) {
  void startServer(app);
}

app.use(errorHandlerMiddleware);

process.on("SIGINT", () => {
  shutdownServer("SIGINT");
});

process.on("SIGTERM", () => {
  shutdownServer("SIGTERM");
});

export { app, getRuntimeReady };
export const __test = {
  db,
  createToken,
  sanitizeUser,
};

process.on("unhandledRejection", (reason) => {
  logError("process.unhandled_rejection", reason);
  shutdownServer("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  logError("process.uncaught_exception", error);
  shutdownServer("uncaughtException");
});

export default app;
