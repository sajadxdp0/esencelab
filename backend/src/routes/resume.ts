/** Student resume upload, read and delete routes. */
import crypto from "crypto";
import fs from "fs";
import type { Application } from "express";
import { requireAuth, requireRoles } from "../auth";
import { AI_SERVICE_URL, buildAiServiceHeaders } from "../config";
import { logError, logEvent } from "../logging";
import { expensiveOperationLimiter, resumeUploadMiddleware } from "../middleware";
import { db, supabaseStore } from "../state";
import { ensureResumeScoreHistory, getLatestResumeScore } from "../services/career";
import type { RequestWithAuth } from "../types";
import { buildProcessedFileUrl, normalizeResumeParsedData, normalizeSkillList, safeDeleteTempFile } from "../utils";

export const registerResumeRoutes = (app: Application): void => {
  app.post(
    "/api/resume/upload",
    requireAuth,
    requireRoles("student"),
    expensiveOperationLimiter,
    resumeUploadMiddleware,
    async (req: RequestWithAuth, res) => {
      const profile = req.profile;
      if (!profile) return res.status(401).json({ message: "Not authenticated" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const shouldReplaceExisting =
        String(req.body?.replaceExisting ?? "true").toLowerCase() !== "false";
      const existingResumeIndex = db.resumes.findIndex(
        (entry: any) => entry.userId === profile.id,
      );
      if (existingResumeIndex >= 0 && !shouldReplaceExisting) {
        return res.status(409).json({
          message:
            "A resume already exists. Set replaceExisting=true to replace it.",
        });
      }

      const fallbackParsedData = normalizeResumeParsedData(
        {
          name: profile.name,
          email: profile.email,
          phone: null,
          summary: null,
          education: [],
          experience: [],
          projects: [],
          skills: [],
        },
        profile,
      );
      let parsedData = fallbackParsedData;
      let skills: string[] = normalizeSkillList(fallbackParsedData.skills);

      try {
        try {
          const fileBuffer =
            req.file.buffer && req.file.buffer.length > 0
              ? req.file.buffer
              : req.file.path
                ? await fs.promises.readFile(req.file.path)
                : Buffer.alloc(0);
          const formData = new FormData();
          formData.append(
            "file",
            new Blob([fileBuffer], { type: "application/pdf" }),
            req.file.originalname,
          );

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          try {
            const aiResponse = await fetch(`${AI_SERVICE_URL}/ai/parse-resume`, {
              method: "POST",
              headers: buildAiServiceHeaders(),
              body: formData,
              signal: controller.signal,
            });

            if (aiResponse.ok) {
              const aiData: any = await aiResponse.json();
              parsedData = normalizeResumeParsedData(aiData?.parsedData, profile);
              skills = normalizeSkillList(
                aiData?.skills?.length ? aiData.skills : parsedData.skills,
              );
              parsedData.skills = skills;
            } else {
              logEvent("warn", "ai.resume_parse.degraded", {
                requestId: req.requestId,
                statusCode: aiResponse.status,
              });
            }
          } finally {
            clearTimeout(timeout);
          }
        } catch (aiError) {
          logError("ai.resume_parse.unavailable", aiError, {
            requestId: req.requestId,
          });
        }

        const replaced = existingResumeIndex >= 0;
        const resume = {
          id: replaced ? db.resumes[existingResumeIndex].id : crypto.randomUUID(),
          userId: profile.id,
          fileUrl: buildProcessedFileUrl(profile.id, req.file.originalname),
          fileName: req.file.originalname,
          parsedData,
          skills,
          createdAt: replaced
            ? db.resumes[existingResumeIndex].createdAt
            : new Date(),
          updatedAt: new Date(),
        };

        if (replaced) {
          db.resumes[existingResumeIndex] = resume;
        } else {
          db.resumes.push(resume);
        }
        await supabaseStore.upsertResume(resume);

        let candidate = db.candidates.find(
          (entry: any) => entry.userId === profile.id,
        );
        if (candidate) {
          candidate.skills = JSON.stringify(skills);
          candidate.education = JSON.stringify(parsedData.education || []);
          candidate.experience = JSON.stringify(parsedData.experience || []);
          candidate.parsedData = parsedData;
          candidate.updatedAt = new Date();
          await supabaseStore.upsertCandidate(candidate);
        } else {
          candidate = {
            id: crypto.randomUUID(),
            userId: profile.id,
            name: profile.name,
            email: profile.email,
            role: "Student",
            skills: JSON.stringify(skills),
            education: JSON.stringify(parsedData.education || []),
            experience: JSON.stringify(parsedData.experience || []),
            parsedData,
            matchScore: 0,
            status: "new",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          db.candidates.push(candidate);
          await supabaseStore.upsertCandidate(candidate);
        }

        const latestScore = await ensureResumeScoreHistory(profile.id);

        return res
          .status(replaced ? 200 : 201)
          .json({ data: { ...resume, latestScore, replaced } });
      } catch (error: any) {
        logError("resume.upload.failed", error, {
          requestId: req.requestId,
          userId: profile.id,
        });
        return res
          .status(500)
          .json({ message: error.message || "Failed to upload resume" });
      } finally {
        await safeDeleteTempFile(req.file.path);
      }
    },
  );

  // Get my resume
  app.get(
    "/api/resume",
    requireAuth,
    requireRoles("student"),
    (req: RequestWithAuth, res) => {
      const profile = req.profile;
      if (!profile) return res.status(401).json({ message: "Not authenticated" });

      const resume = db.resumes.find((r: any) => r.userId === profile.id);
      if (!resume) return res.status(404).json({ message: "No resume found" });

      const latestScore = getLatestResumeScore(profile.id);
      res.json({ data: { ...resume, latestScore } });
    },
  );

  // Delete resume
  app.delete(
    "/api/resume/:id",
    requireAuth,
    requireRoles("student"),
    async (req: RequestWithAuth, res) => {
      const profile = req.profile;
      if (!profile) return res.status(401).json({ message: "Not authenticated" });

      const idx = db.resumes.findIndex(
        (r: any) => r.id === req.params.id && r.userId === profile.id,
      );
      if (idx === -1)
        return res.status(404).json({ message: "Resume not found" });

      db.resumes.splice(idx, 1);
      await supabaseStore.deleteResume(req.params.id);
      res.json({ message: "Resume deleted" });
    },
  );
};
