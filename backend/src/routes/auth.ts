/** Authentication and public recruiter-access-request routes. */
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Application } from "express";
import { sanitizeUser, type SupportedRole } from "../auth/roles";
import { createToken, requireAuth } from "../auth";
import { ALLOW_INSECURE_PASSWORD_RESET_TOKEN_RESPONSE } from "../config";
import { authLimiter, recruiterRequestLimiter } from "../middleware";
import { db, resetTokens, revokedTokens, supabaseStore } from "../state";
import { pruneExpiredResetTokens } from "../services/matching";
import type { RecruiterAccessRequestStatus, RequestWithAuth } from "../types";
import { isValidEmail, normalizeCompanyWebsite, normalizeRecruiterAccessRequestStatus, sanitizeRecruiterAccessRequest, truncateForStorage } from "../utils";

export const registerAuthRoutes = (app: Application): void => {
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");
    const name = String(req.body?.name || "").trim();
    const requestedRole = String(req.body?.role || "").toLowerCase();
    const safeRole: SupportedRole = "student";

    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }
    if (requestedRole && requestedRole !== "student") {
      return res.status(403).json({
        message:
          "Only student accounts can register directly. Recruiters must request admin approval before using Esencelab.",
      });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existing = db.profiles.find(
      (p: any) => p.email?.toLowerCase() === email,
    );
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);

    const profile = {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      name,
      role: safeRole,
      avatarUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.profiles.push(profile);
    await supabaseStore.upsertUser(profile);

    const token = createToken(profile.id);
    res.status(201).json({ token, user: sanitizeUser(profile) });
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const profile = db.profiles.find(
      (p: any) => p.email?.toLowerCase() === email,
    );
    if (!profile || profile.isActive === false)
      return res.status(401).json({ message: "Invalid credentials" });

    const isValid = profile.passwordHash
      ? await bcrypt.compare(password, profile.passwordHash)
      : false;
    if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

    const token = createToken(profile.id);
    res.json({ token, user: sanitizeUser(profile) });
  });

  app.get("/api/auth/me", requireAuth, (req: RequestWithAuth, res) => {
    res.json({ user: sanitizeUser(req.profile) });
  });

  app.post("/api/auth/logout", requireAuth, (req: RequestWithAuth, res) => {
    if (req.authToken) revokedTokens.add(req.authToken);
    res.json({ message: "Logged out successfully" });
  });

  app.put("/api/auth/profile", requireAuth, async (req: RequestWithAuth, res) => {
    const profile = req.profile;
    if (!profile) return res.status(401).json({ message: "Not authenticated" });

    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
    const avatarUrl =
      typeof req.body?.avatarUrl === "string"
        ? req.body.avatarUrl.trim()
        : undefined;

    if (name !== undefined && name.length === 0) {
      return res.status(400).json({ message: "name cannot be empty" });
    }

    if (name !== undefined) profile.name = name;
    if (avatarUrl !== undefined) profile.avatarUrl = avatarUrl || null;
    profile.updatedAt = new Date();
    await supabaseStore.upsertUser(profile);

    res.json({ user: sanitizeUser(profile) });
  });

  app.put(
    "/api/auth/password",
    authLimiter,
    requireAuth,
    async (req: RequestWithAuth, res) => {
      const profile = req.profile;
      if (!profile) return res.status(401).json({ message: "Not authenticated" });

      const currentPassword = String(req.body?.currentPassword || "");
      const newPassword = String(req.body?.newPassword || "");
      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ message: "currentPassword and newPassword are required" });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "newPassword must be at least 6 characters" });
      }

      const isValid = profile.passwordHash
        ? await bcrypt.compare(currentPassword, profile.passwordHash)
        : false;
      if (!isValid)
        return res.status(401).json({ message: "Current password is invalid" });

      profile.passwordHash = await bcrypt.hash(newPassword, 10);
      profile.updatedAt = new Date();
      await supabaseStore.upsertUser(profile);

      res.json({ message: "Password updated successfully" });
    },
  );

  app.post("/api/auth/password/forgot", authLimiter, (req, res) => {
    pruneExpiredResetTokens();
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const profile = db.profiles.find(
      (entry: any) => entry.email?.toLowerCase() === email,
    );
    if (profile && profile.isActive !== false) {
      const token = crypto.randomBytes(24).toString("hex");
      const expiresAt = Date.now() + 15 * 60 * 1000;
      resetTokens.set(token, { userId: profile.id, expiresAt });

      if (ALLOW_INSECURE_PASSWORD_RESET_TOKEN_RESPONSE) {
        return res.json({
          message: "Password reset token generated for local-only testing.",
          resetToken: token,
          expiresAt: new Date(expiresAt).toISOString(),
        });
      }
    }

    return res.json({
      message: "If the account exists, a password reset link was sent.",
    });
  });

  app.post("/api/auth/password/reset", authLimiter, async (req, res) => {
    pruneExpiredResetTokens();
    const resetToken = String(req.body?.token || "");
    const newPassword = String(req.body?.newPassword || "");
    if (!resetToken || !newPassword) {
      return res
        .status(400)
        .json({ message: "token and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "newPassword must be at least 6 characters" });
    }

    const tokenPayload = resetTokens.get(resetToken);
    if (!tokenPayload || tokenPayload.expiresAt <= Date.now()) {
      resetTokens.delete(resetToken);
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const profile = db.profiles.find(
      (entry: any) => entry.id === tokenPayload.userId,
    );
    if (!profile || profile.isActive === false) {
      resetTokens.delete(resetToken);
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    profile.passwordHash = await bcrypt.hash(newPassword, 10);
    profile.updatedAt = new Date();
    resetTokens.delete(resetToken);
    await supabaseStore.upsertUser(profile);

    res.json({ message: "Password has been reset" });
  });
  // Recruiter access requests
  // Recruiters cannot self-register into hiring tools. They submit a public request,
  // then an admin approves or rejects it from the authenticated admin workspace.
  app.post(
    "/api/recruiter-requests",
    recruiterRequestLimiter,
    async (req, res) => {
      const name = truncateForStorage(req.body?.name, 120);
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      const companyName = truncateForStorage(req.body?.companyName, 160);
      const companyWebsite = normalizeCompanyWebsite(req.body?.companyWebsite);
      const jobTitle = truncateForStorage(req.body?.jobTitle, 120);
      const message = truncateForStorage(req.body?.message, 2000);

      if (!name || !email || !companyName || !message) {
        return res.status(400).json({
          message:
            "Name, email, company name, and platform use case are required.",
        });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "A valid email is required." });
      }
      if (companyWebsite === null) {
        return res.status(400).json({
          message: "Company website must be a valid http or https URL.",
        });
      }

      const existingProfile = db.profiles.find(
        (entry: any) => entry.email?.toLowerCase() === email,
      );
      if (existingProfile) {
        return res.status(409).json({
          message:
            "An account with this email already exists. Please sign in or contact an admin.",
        });
      }

      const existingPendingRequest = db.recruiterAccessRequests.find(
        (entry: any) =>
          entry.email?.toLowerCase() === email &&
          normalizeRecruiterAccessRequestStatus(entry.status) === "pending",
      );
      if (existingPendingRequest) {
        return res.status(409).json({
          message:
            "A pending recruiter access request already exists for this email.",
        });
      }

      const now = new Date();
      const accessRequest = {
        id: crypto.randomUUID(),
        name,
        email,
        companyName,
        companyWebsite,
        jobTitle,
        message,
        status: "pending" as RecruiterAccessRequestStatus,
        adminNotes: "",
        reviewedBy: null,
        reviewedAt: null,
        userId: null,
        createdAt: now,
        updatedAt: now,
      };

      db.recruiterAccessRequests.unshift(accessRequest);
      await (supabaseStore as any).upsertRecruiterAccessRequest?.(accessRequest);

      return res.status(201).json({
        message:
          "Recruiter access request received. An admin will review it before platform access is enabled.",
        data: sanitizeRecruiterAccessRequest(accessRequest),
      });
    },
  );
};
