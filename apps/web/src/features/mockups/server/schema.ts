import { z } from "zod";

export const ALLOWED_MOCKUP_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

export const MAX_MOCKUP_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const mockupDeviceSchema = z.enum(["browser", "phone", "tablet"]);

export const uploadMockupSchema = z.object({
  project_id: z.string().min(1),
  device: mockupDeviceSchema.default("browser"),
  storage_path: z.string(),
  sort: z.number().int().default(0),
});

export const setDeviceSchema = z.object({
  id: z.string().min(1),
  device: mockupDeviceSchema,
});

export const reorderMockupsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      sort: z.number().int(),
    })
  ),
});

export type MockupDevice = z.infer<typeof mockupDeviceSchema>;
export type UploadMockupInput = z.infer<typeof uploadMockupSchema>;
export type SetDeviceInput = z.infer<typeof setDeviceSchema>;
export type ReorderMockupsInput = z.infer<typeof reorderMockupsSchema>;
