import api, { cachedGet } from "@/lib/api";
import { ApiErrorLike, invalidateResumeCaches } from "@/lib/dashboardApi/shared";
import { Resume } from "@/types";

export const getResume = async (): Promise<Resume | null> => {
  try {
    const payload = await cachedGet<{ data?: Resume | null }>("/resume", {
      ttlMs: 6000,
    });
    return payload.data || null;
  } catch (error: unknown) {
    const status = (error as ApiErrorLike | null)?.response?.status;
    if (status === 404) return null;
    throw error;
  }
};

export const uploadResume = async (
  file: File,
  onProgress?: (progress: number) => void,
  options?: { replaceExisting?: boolean },
): Promise<Resume> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("replaceExisting", String(options?.replaceExisting ?? true));

  const res = await api.post("/resume/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (!onProgress) return;
      const percent = Math.round((event.loaded * 100) / (event.total || 1));
      onProgress(percent);
    },
  });
  invalidateResumeCaches();
  return res.data.data;
};

export const deleteResume = async (resumeId: string) => {
  await api.delete(`/resume/${resumeId}`);
  invalidateResumeCaches();
};
