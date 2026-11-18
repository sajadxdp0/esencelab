/** Server bootstrap, startup and graceful shutdown. */
import crypto from "crypto";
import { createServer, type Server } from "http";
import type { Socket } from "net";
import type { Application } from "express";
import bcrypt from "bcryptjs";
import { NODE_ENV, PORT, SHUTDOWN_TIMEOUT_MS } from "./config";
import { logError, logEvent } from "./logging";
import { db, supabaseStore } from "./state";
import type { SupportedRole } from "./auth/roles";
import { readOptionalBootstrapUser } from "./utils";

export let isShuttingDown = false;
export let runtimeReady: Promise<void> | null = null;
export let server: Server | null = null;
export const openConnections = new Set<Socket>();



export const ensureBootstrapUsers = async () => {
  const bootstrapUsers = [
    readOptionalBootstrapUser("INITIAL_ADMIN", "admin", "Platform Admin"),
    readOptionalBootstrapUser(
      "INITIAL_RECRUITER",
      "employer",
      "Initial Recruiter",
    ),
  ].filter(Boolean) as Array<{
    email: string;
    password: string;
    name: string;
    role: SupportedRole;
  }>;

  for (const bootstrapUser of bootstrapUsers) {
    const existing = db.profiles.find(
      (entry: any) => entry.email?.toLowerCase() === bootstrapUser.email,
    );

    if (existing) {
      let didChange = false;
      if (existing.role !== bootstrapUser.role) {
        existing.role = bootstrapUser.role;
        didChange = true;
      }
      if (!existing.name && bootstrapUser.name) {
        existing.name = bootstrapUser.name;
        didChange = true;
      }
      if (!existing.passwordHash) {
        existing.passwordHash = await bcrypt.hash(bootstrapUser.password, 10);
        didChange = true;
      } else if (
        !(await bcrypt.compare(bootstrapUser.password, existing.passwordHash))
      ) {
        existing.passwordHash = await bcrypt.hash(bootstrapUser.password, 10);
        didChange = true;
      }
      if (didChange) {
        existing.updatedAt = new Date();
        await supabaseStore.upsertUser(existing);
      }
      continue;
    }

    const profile = {
      id: crypto.randomUUID(),
      email: bootstrapUser.email,
      passwordHash: await bcrypt.hash(bootstrapUser.password, 10),
      name: bootstrapUser.name,
      role: bootstrapUser.role,
      avatarUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.profiles.push(profile);
    await supabaseStore.upsertUser(profile);
  }
};

export const initializeRuntime = async () => {
  const bootstrap = await supabaseStore.bootstrap(db);
  if (bootstrap.loaded) {
    logEvent("info", "runtime.bootstrap.loaded_supabase");
  } else {
    logEvent("info", "runtime.bootstrap.supabase_empty_store");
  }

  await ensureBootstrapUsers();
};

export const getRuntimeReady = () => {
  if (!runtimeReady) {
    runtimeReady = initializeRuntime().catch((err) => {
      logError("runtime.initialization_failed", err);
      throw err;
    });
  }
  return runtimeReady;
};

export const startServer = async (app: Application): Promise<void> => {
  try {
    await getRuntimeReady();
    server = createServer(app);
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;
    server.requestTimeout = 30_000;
    server.on("connection", (socket) => {
      openConnections.add(socket);
      socket.on("close", () => {
        openConnections.delete(socket);
      });
    });
    server.listen(PORT, () => {
      logEvent("info", "server.started", {
        port: Number(PORT),
        nodeEnv: NODE_ENV,
        dataProvider: "supabase",
      });
    });
  } catch (err) {
    logError("server.start_failed", err);
    process.exitCode = 1;
  }
};

export const shutdownServer = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  const exitCode = signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1;
  logEvent("warn", "server.shutdown_requested", {
    signal,
    openConnections: openConnections.size,
  });

  const forceCloseTimer = setTimeout(() => {
    for (const socket of openConnections) {
      socket.destroy();
    }
    logEvent("error", "server.shutdown_forced", {
      signal,
      remainingConnections: openConnections.size,
    });
  }, SHUTDOWN_TIMEOUT_MS);
  forceCloseTimer.unref();

  if (!server) {
    clearTimeout(forceCloseTimer);
    process.exit(exitCode);
  }

  server.close((error) => {
    clearTimeout(forceCloseTimer);
    if (error) {
      logError("server.shutdown_failed", error, { signal });
      process.exit(1);
      return;
    }
    logEvent("info", "server.stopped", { signal });
    process.exit(exitCode);
  });
};
