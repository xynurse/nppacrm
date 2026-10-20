import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, UPLOAD_PREFIX } from "@/lib/blob";
import { env } from "@/lib/env";

export async function POST(request: Request): Promise<NextResponse> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage is not configured" },
      { status: 501 },
    );
  }

  const session = await requireSession();
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(UPLOAD_PREFIX) || pathname.includes("..")) {
          throw new Error("Invalid upload path");
        }
        return {
        allowedContentTypes: [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/webp",
          "text/csv",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: the custom-field write happens client-side via updateCustomField
        // after blob completion, with audit recorded server-side there.
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
