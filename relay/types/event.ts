import { z } from "npm:zod";

export const RelayEventSchema = z.object({
	type: z.enum(["add", "update"]),
	url: z.string().url(),
});

export type RelayEvent = z.infer<typeof RelayEventSchema>;
