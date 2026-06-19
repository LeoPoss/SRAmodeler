import { createFileRoute } from "@tanstack/react-router";
import { db } from "#/db/connection";
import { regulationStandards } from "#/db/schema";

export const Route = createFileRoute("/api/regulation-standards")({
	server: {
		handlers: {
			GET: async () => {
				const rows = db.select().from(regulationStandards).all();
				return new Response(JSON.stringify(rows), {
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
