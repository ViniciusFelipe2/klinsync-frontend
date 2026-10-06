import { z } from "zod";

export const createCheckInSchema = z.object({
  doctorName: z.string().trim().min(3).max(120),
  photoBase64: z
    .string()
    .min(100)
    .max(1_500_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
});

export const checkInIdSchema = z.object({ id: z.string().uuid() });

export const checkInIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(5000),
});

// Tamanho do disco contratado, fixo em 1 GB para a barra de progresso.
export const DEFAULT_DISK_GB = 1;
