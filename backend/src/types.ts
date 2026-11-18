/** Shared Express request/response types used across the backend. */
import type { Request } from "express";

export type RequestWithAuth = Request & {
  authToken?: string;
  profile?: any;
  requestId?: string;
};

export type LogLevel = "info" | "warn" | "error";

export type RecruiterAccessRequestStatus = "pending" | "approved" | "rejected";

export type CandidateMatchSortBy = "match" | "resume" | "experience";
export type CandidateMatchSortOrder = "asc" | "desc";

export interface CandidateMatchOptions {
  sortBy?: CandidateMatchSortBy;
  order?: CandidateMatchSortOrder;
  limit?: number;
  appliedOnly?: boolean;
}


