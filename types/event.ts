import { z } from "zod";

export const RelayEventSchema = z.object({
	type: z.enum(["add", "update"]),
	url: z.url(),
});

export type RelayEvent = z.infer<typeof RelayEventSchema>;
