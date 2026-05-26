import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  enrichmentJobs,
  enrichmentSuggestions,
  prospectuses,
} from "@/lib/db/schema";

export type ProspectusRow = {
  id: string;
  eventId: string;
  blobUrl: string;
  fileName: string;
  fileSize: number;
  textTokenEstimate: number;
  uploadedBy: string | null;
  createdAt: Date;
};

export async function getActiveProspectus(
  eventId: string,
): Promise<ProspectusRow | null> {
  const [row] = await db
    .select({
      id: prospectuses.id,
      eventId: prospectuses.eventId,
      blobUrl: prospectuses.blobUrl,
      fileName: prospectuses.fileName,
      fileSize: prospectuses.fileSize,
      textTokenEstimate: prospectuses.textTokenEstimate,
      uploadedBy: prospectuses.uploadedBy,
      createdAt: prospectuses.createdAt,
    })
    .from(prospectuses)
    .where(
      and(eq(prospectuses.eventId, eventId), isNull(prospectuses.deletedAt)),
    )
    .limit(1);
  return row ?? null;
}

export async function getActiveProspectusText(
  eventId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ text: prospectuses.textContent })
    .from(prospectuses)
    .where(
      and(eq(prospectuses.eventId, eventId), isNull(prospectuses.deletedAt)),
    )
    .limit(1);
  return row?.text ?? null;
}

export type SuggestionRow = {
  id: string;
  jobId: string;
  field: string;
  suggestion: string;
  confidence: string | null;
  sourceUrls: string[];
  reasoning: string | null;
  status: typeof enrichmentSuggestions.$inferSelect.status;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

export async function listSuggestionsForEventCompany(
  eventCompanyId: string,
): Promise<SuggestionRow[]> {
  const rows = await db
    .select({
      id: enrichmentSuggestions.id,
      jobId: enrichmentSuggestions.jobId,
      field: enrichmentSuggestions.field,
      suggestion: enrichmentSuggestions.suggestion,
      confidence: enrichmentSuggestions.confidence,
      sourceUrls: enrichmentSuggestions.sourceUrls,
      reasoning: enrichmentSuggestions.reasoning,
      status: enrichmentSuggestions.status,
      reviewedBy: enrichmentSuggestions.reviewedBy,
      reviewedAt: enrichmentSuggestions.reviewedAt,
      createdAt: enrichmentSuggestions.createdAt,
    })
    .from(enrichmentSuggestions)
    .where(eq(enrichmentSuggestions.eventCompanyId, eventCompanyId))
    .orderBy(desc(enrichmentSuggestions.createdAt))
    .limit(50);
  return rows;
}

export type JobRow = {
  id: string;
  status: typeof enrichmentJobs.$inferSelect.status;
  model: string;
  costUsd: string;
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens: number;
  searchCalls: number;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  requestedBy: string | null;
  createdAt: Date;
};

export async function listRecentJobsForEventCompany(
  eventCompanyId: string,
  limit = 10,
): Promise<JobRow[]> {
  const rows = await db
    .select({
      id: enrichmentJobs.id,
      status: enrichmentJobs.status,
      model: enrichmentJobs.model,
      costUsd: enrichmentJobs.costUsd,
      promptTokens: enrichmentJobs.promptTokens,
      completionTokens: enrichmentJobs.completionTokens,
      cachedPromptTokens: enrichmentJobs.cachedPromptTokens,
      searchCalls: enrichmentJobs.searchCalls,
      error: enrichmentJobs.error,
      startedAt: enrichmentJobs.startedAt,
      finishedAt: enrichmentJobs.finishedAt,
      requestedBy: enrichmentJobs.requestedBy,
      createdAt: enrichmentJobs.createdAt,
    })
    .from(enrichmentJobs)
    .where(eq(enrichmentJobs.eventCompanyId, eventCompanyId))
    .orderBy(desc(enrichmentJobs.createdAt))
    .limit(limit);
  return rows;
}
