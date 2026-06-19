import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#/db/connection";
import { auditAssessments, businessProcesses } from "#/db/schema";

export const Route = createFileRoute("/api/audit-assessments")({
	server: {
		handlers: {
			GET: async () => {
				const rows = db
					.select({
						id: auditAssessments.id,
						auditType: auditAssessments.auditType,
						processId: auditAssessments.processId,
						processName: businessProcesses.processName,
					})
					.from(auditAssessments)
					.leftJoin(
						businessProcesses,
						eq(auditAssessments.processId, businessProcesses.id),
					)
					.all();
				return new Response(JSON.stringify(rows), {
					headers: { "Content-Type": "application/json" },
				});
			},
			POST: async ({ request }) => {
				const body = (await request.json()) as {
					auditType: string;
					processId?: number;
				};

				const created = db
					.insert(auditAssessments)
					.values({
						auditType: body.auditType,
						processId: body.processId || null,
					})
					.returning()
					.get();

				return new Response(JSON.stringify(created), {
					status: 201,
					headers: { "Content-Type": "application/json" },
				});
			},
			PUT: async ({ request }) => {
				const body = (await request.json()) as {
					id: number;
					processId: number;
				};
				db.update(auditAssessments)
					.set({ processId: body.processId })
					.where(eq(auditAssessments.id, body.id))
					.run();
				return new Response(JSON.stringify({ ok: true }), {
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
