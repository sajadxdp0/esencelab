/** JWT creation/verification and request authentication middleware. */
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { roleMatches, type CanonicalRole } from "./auth/roles";
import { JWT_SECRET } from "./config";
import { db, revokedTokens } from "./state";
import type { RequestWithAuth } from "./types";

export const createToken = (userId: string) =>
  jwt.sign(
    {
      userId,
      sessionId: crypto.randomUUID(),
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

export const parseBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !value) return null;
  return value;
};

export const verifyToken = (token: string) => {
  if (revokedTokens.has(token)) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
};

export const getProfileFromAuth = (req: Request) => {
  const token = parseBearerToken(req);
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const profile = db.profiles.find((p: any) => p.id === decoded.userId);
  if (!profile || profile.isActive === false) return null;

  return profile;
};

export const requireAuth = (
  req: RequestWithAuth,
  res: Response,
  next: NextFunction,
) => {
  const token = parseBearerToken(req);
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  const decoded = verifyToken(token);
  if (!decoded)
    return res.status(401).json({ message: "Invalid or expired token" });

  const profile = db.profiles.find((entry: any) => entry.id === decoded.userId);
  if (!profile || profile.isActive === false) {
    return res.status(401).json({ message: "User not found or disabled" });
  }

  req.authToken = token;
  req.profile = profile;
  return next();
};

export const requireRoles = (...roles: CanonicalRole[]) => {
  return (req: RequestWithAuth, res: Response, next: NextFunction) => {
    const profile = req.profile;
    if (!profile) return res.status(401).json({ message: "Not authenticated" });

    const authorized = roles.some((role) => roleMatches(profile.role, role));
    if (!authorized) return res.status(403).json({ message: "Not authorized" });
    return next();
  };
};
