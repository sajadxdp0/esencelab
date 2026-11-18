/**
 * Express middleware: security headers, rate limits, request logging,
 * bootstrap gating, caching headers, uploads and error handling.
 */
import crypto from "crypto";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import rateLimit from "express-rate-limit";
import type { Application, NextFunction, Request, Response } from "express";
import { toCanonicalRole } from "./auth/roles";
import { getProfileFromAuth } from "./auth";
import {
  ALLOW_ALL_FRONTEND_ORIGINS,
  AUTH_RATE_LIMIT_MAX_REQUESTS,
  EXPENSIVE_OPERATION_RATE_LIMIT_PER_MINUTE,
  FRONTEND_ORIGINS,
  GENERAL_RATE_LIMIT_MAX_REQUESTS,
  GENERAL_RATE_LIMIT_WINDOW_MS,
  MAX_RESUME_FILE_SIZE_BYTES,
  MAX_RESUME_FILE_SIZE_MB,
  METRIC_SAMPLE_LIMIT,
  SLOW_ENDPOINT_THRESHOLD_MS,
  TRUST_PROXY_RAW,
} from "./config";
import {
  getResponseLogLevel,
  logError,
  logEvent,
  normalizeErrorResponseBody,
  toRequestPath,
} from "./logging";
import { getRuntimeReady, isShuttingDown } from "./runtime";
import { db } from "./state";
import type { RequestWithAuth } from "./types";
import { isLikelyPdfFile, normalizeMetricPath } from "./utils";

export const installRouteHandlerWrapper = (app: Application): void => {
const wrapRouteHandler = (handler: unknown) => {
  if (typeof handler !== "function") return handler;
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = (handler as any)(req, res, next);
      if (result && typeof result.then === "function") {
        Promise.resolve(result).catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
};

for (const method of ["get", "post", "put", "delete", "patch"] as const) {
  const originalMethod = (app as any)[method].bind(app);
  (app as any)[method] = (...args: any[]) => {
    const [pathOrHandler, ...handlers] = args;
    return originalMethod(
      pathOrHandler,
      ...handlers.map((handler: unknown) => wrapRouteHandler(handler)),
    );
  };
}
};

export const installBaseMiddleware = (app: Application): void => {
if (TRUST_PROXY_RAW) {
  if (TRUST_PROXY_RAW === "true") app.set("trust proxy", 1);
  else if (TRUST_PROXY_RAW === "false") app.set("trust proxy", false);
  else if (!Number.isNaN(Number(TRUST_PROXY_RAW)))
    app.set("trust proxy", Number(TRUST_PROXY_RAW));
  else app.set("trust proxy", TRUST_PROXY_RAW);
}

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        ALLOW_ALL_FRONTEND_ORIGINS ||
        FRONTEND_ORIGINS.includes(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(
  compression({
    threshold: 1024,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.set("etag", "strong");
};

export const installRequestMiddleware = (app: Application): void => {
app.use((req: RequestWithAuth, res, next) => {
  const requestId =
    String(req.headers["x-request-id"] || "").trim() || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

app.use((req: RequestWithAuth, res, next) => {
  const originalJson = res.json.bind(res);
  const normalize = (body: any) =>
    normalizeErrorResponseBody(res.statusCode, body, req.requestId);

  res.json = ((body: any) => originalJson(normalize(body))) as typeof res.json;

  next();
});

app.use((req, res, next) => {
  if (isShuttingDown && req.path !== "/api/health") {
    res.setHeader("Connection", "close");
    return res.status(503).json({
      error: "service_unavailable",
      message: "Server is restarting. Please retry shortly.",
      code: "SERVICE_UNAVAILABLE",
      requestId: (req as RequestWithAuth).requestId,
    });
  }
  return next();
});

app.use(async (req: RequestWithAuth, res, next) => {
  try {
    await getRuntimeReady();
    next();
  } catch (error: any) {
    logError("runtime.bootstrap_failed", error, {
      requestId: req.requestId,
      method: req.method,
      path: normalizeMetricPath(toRequestPath(req)),
    });
    res.status(500).json({
      error: "service_initialization_failed",
      message: "Server initialization failed.",
      code: "SERVICE_INITIALIZATION_FAILED",
      requestId: req.requestId,
    });
  }
});

app.use((req, res, next) => {
  if (req.method !== "GET") {
    res.setHeader("Cache-Control", "no-store");
    return next();
  }

  const routePath = req.path || "";
  if (routePath === "/api/health") {
    res.setHeader("Cache-Control", "no-store");
  } else if (routePath === "/api/career/roles") {
    res.setHeader("Cache-Control", "public, max-age=60");
  } else if (
    routePath.startsWith("/api/jobs") ||
    routePath.startsWith("/api/recruiter/overview") ||
    routePath.startsWith("/api/admin/monitoring") ||
    routePath.startsWith("/api/admin/recruiter-requests") ||
    routePath.startsWith("/api/jobs/") ||
    routePath.startsWith("/api/dashboard/stats")
  ) {
    res.setHeader(
      "Cache-Control",
      "private, max-age=8, stale-while-revalidate=20",
    );
  } else {
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
  }
  return next();
});
};

export const installRateLimitMiddleware = (app: Application): void => {
app.use("/api", publicApiLimiter);
};

export const installMetricsMiddleware = (app: Application): void => {
app.use((req: RequestWithAuth, res, next) => {
  const start = Date.now();
  db.requestMetrics.totalRequests += 1;

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const pathPart = normalizeMetricPath(toRequestPath(req));
    const key = `${req.method.toUpperCase()} ${pathPart}`;
    const current = db.requestMetrics.endpoints[key] || {
      count: 0,
      errors: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      slowCount: 0,
      lastStatusCode: 200,
      lastSeenAt: null,
      recentDurationsMs: [] as number[],
    };

    current.count += 1;
    current.totalDurationMs += durationMs;
    current.maxDurationMs = Math.max(current.maxDurationMs, durationMs);
    current.lastStatusCode = res.statusCode;
    current.lastSeenAt = new Date();
    current.recentDurationsMs.push(durationMs);
    if (current.recentDurationsMs.length > METRIC_SAMPLE_LIMIT) {
      current.recentDurationsMs.splice(
        0,
        current.recentDurationsMs.length - METRIC_SAMPLE_LIMIT,
      );
    }
    if (res.statusCode >= 400) {
      current.errors += 1;
      db.requestMetrics.totalErrors += 1;
    }
    if (res.statusCode === 401 || res.statusCode === 403) {
      db.requestMetrics.authFailures += 1;
    }
    if (durationMs >= SLOW_ENDPOINT_THRESHOLD_MS) {
      current.slowCount += 1;
      db.requestMetrics.slowRequests += 1;
    }
    db.requestMetrics.endpoints[key] = current;

    const authenticatedProfile = req.profile || getProfileFromAuth(req);
    logEvent(
      getResponseLogLevel(res.statusCode, durationMs),
      "http.request.completed",
      {
        requestId: req.requestId,
        method: req.method,
        path: pathPart,
        statusCode: res.statusCode,
        latencyMs: durationMs,
        userId: authenticatedProfile?.id || null,
        userRole: authenticatedProfile
          ? toCanonicalRole(authenticatedProfile.role)
          : null,
      },
    );
  });

  next();
});
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

export const RECRUITER_REQUEST_RATE_LIMIT_PER_HOUR = (() => {
  const parsed = Number(process.env.RECRUITER_REQUEST_RATE_LIMIT_PER_HOUR || 8);
  return Math.max(4, Number.isFinite(parsed) ? parsed : 8);
})();

export const recruiterRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: RECRUITER_REQUEST_RATE_LIMIT_PER_HOUR,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many recruiter access requests, please retry later.",
  },
});

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many admin requests, please retry shortly." },
});

export const publicApiLimiter = rateLimit({
  windowMs: GENERAL_RATE_LIMIT_WINDOW_MS,
  max: GENERAL_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health",
  message: { message: "Too many requests, please retry later." },
});

export const expensiveOperationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Math.max(
    10,
    Number(process.env.EXPENSIVE_OPERATION_RATE_LIMIT_PER_MINUTE || 45),
  ),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const authorization = String(req.headers.authorization || "").trim();
    if (authorization) {
      return `auth:${crypto.createHash("sha256").update(authorization).digest("hex")}`;
    }
    return "unauthenticated";
  },
  message: { message: "Too many expensive requests, please retry shortly." },
});
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!isLikelyPdfFile(file)) {
      cb(new Error("Only PDF files are allowed."));
      return;
    }
    cb(null, true);
  },
});

export const resumeUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.single("file")(req, res, (error: any) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `File too large. Maximum size is ${MAX_RESUME_FILE_SIZE_MB}MB.`,
        });
      }
      return res
        .status(400)
        .json({ message: error.message || "Invalid upload payload." });
    }
    return res
      .status(400)
      .json({ message: error?.message || "Invalid upload payload." });
  });
};

export const notFoundMiddleware = (req: RequestWithAuth, res: Response) => {
  res.status(404).json({
    message: `No API route matches ${req.method} ${toRequestPath(req)}`,
  });
};

export const errorHandlerMiddleware = (
  error: any,
  req: RequestWithAuth,
  res: Response,
  _next: NextFunction,
) => {
    const statusCode =
      Number(error?.statusCode || error?.status) >= 400 &&
      Number(error?.statusCode || error?.status) < 600
        ? Number(error?.statusCode || error?.status)
        : 500;
    const message =
      statusCode >= 500
        ? "Internal server error"
        : String(error?.message || "Request failed");
    logError("http.request.failed", error, {
      requestId: req.requestId,
      method: req.method,
      path: normalizeMetricPath(toRequestPath(req)),
      statusCode,
      userId: req.profile?.id || null,
    });

    if (res.headersSent) {
      return;
    }

    res.status(statusCode).json({
      error: statusCode >= 500 ? "internal_server_error" : "request_failed",
      message,
      code: statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED",
      requestId: req.requestId,
    });
};
