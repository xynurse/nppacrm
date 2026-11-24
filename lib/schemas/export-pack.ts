import { z } from "zod";

export const exportPackSchema = z.object({ eventId: z.uuid() });
