import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/types";
import { MockupDevice } from "./schema";

export type Mockup = Database["public"]["Tables"]["mockups"]["Row"];

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadMockupParams {
  ownerId: string;
  projectId: string;
  fileBuffer: Buffer | Uint8Array;
  fileName: string;
  mimeType: string;
  device?: MockupDevice;
  sort?: number;
}

export function validateMockupFile(mimeType: string, sizeInBytes: number): boolean {
  if (sizeInBytes > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 5MB limit (${sizeInBytes} bytes)`);
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`);
  }

  return true;
}

export function sortMockups<T extends { sort: number; id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.sort !== b.sort) {
      return a.sort - b.sort;
    }
    return a.id.localeCompare(b.id);
  });
}

export async function uploadMockup({
  ownerId,
  projectId,
  fileBuffer,
  fileName,
  mimeType,
  device = "browser",
  sort = 0,
}: UploadMockupParams): Promise<Mockup> {
  const byteLength =
    fileBuffer instanceof Buffer
      ? fileBuffer.length
      : fileBuffer.byteLength;

  validateMockupFile(mimeType, byteLength);

  const supabase = await createClient();

  const { data: project, error: projectError } = await (supabase.from("projects") as any)
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error("Project not found or unauthorized");
  }

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `${ownerId}/${projectId}/${Date.now()}-${sanitizedFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("mockups")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error: insertError } = await (supabase.from("mockups") as any)
    .insert({
      project_id: projectId,
      storage_path: storagePath,
      device,
      sort,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return data as Mockup;
}

export async function listMockupsByProject(projectId: string): Promise<Mockup[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("mockups") as any)
    .select("*")
    .eq("project_id", projectId)
    .order("sort", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Mockup[];
}

export async function setMockupDevice({
  id,
  ownerId,
  device,
}: {
  id: string;
  ownerId: string;
  device: MockupDevice;
}): Promise<Mockup> {
  const supabase = await createClient();

  const { data: mockup, error: mockupError } = await (supabase.from("mockups") as any)
    .select("id, project_id")
    .eq("id", id)
    .maybeSingle();

  if (mockupError || !mockup) {
    throw new Error("Mockup not found");
  }

  const { data: project, error: projectError } = await (supabase.from("projects") as any)
    .select("id")
    .eq("id", mockup.project_id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error("Unauthorized to modify this mockup");
  }

  const { data: updated, error: updateError } = await (supabase.from("mockups") as any)
    .update({ device })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return updated as Mockup;
}

export async function reorderMockups({
  ownerId,
  projectId,
  items,
}: {
  ownerId: string;
  projectId: string;
  items: Array<{ id: string; sort: number }>;
}): Promise<Mockup[]> {
  const supabase = await createClient();

  const { data: project, error: projectError } = await (supabase.from("projects") as any)
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error("Project not found or unauthorized");
  }

  await Promise.all(
    items.map((item) =>
      (supabase.from("mockups") as any)
        .update({ sort: item.sort })
        .eq("id", item.id)
        .eq("project_id", projectId)
    )
  );

  return listMockupsByProject(projectId);
}

export async function deleteMockup({
  id,
  ownerId,
}: {
  id: string;
  ownerId: string;
}): Promise<boolean> {
  const supabase = await createClient();

  const { data: mockup, error: mockupError } = await (supabase.from("mockups") as any)
    .select("id, project_id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (mockupError || !mockup) {
    throw new Error("Mockup not found");
  }

  const { data: project, error: projectError } = await (supabase.from("projects") as any)
    .select("id")
    .eq("id", mockup.project_id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error("Unauthorized to delete this mockup");
  }

  if (mockup.storage_path) {
    await supabase.storage.from("mockups").remove([mockup.storage_path]);
  }

  const { error: deleteError } = await (supabase.from("mockups") as any)
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return true;
}
