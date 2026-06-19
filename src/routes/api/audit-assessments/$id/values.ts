import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "#/db/connection";
import {
	assessmentValues,
	auditAssessments,
	businessProcesses,
	processElements,
} from "#/db/schema";

export const Route = createFileRoute("/api/audit-assessments/$id/values")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const assessmentId = parseInt(params.id, 10);
				const url = new URL(request.url);
				const processIdParam = url.searchParams.get("process_id");

				const assessment = db
					.select()
					.from(auditAssessments)
					.where(eq(auditAssessments.id, assessmentId))
					.get();

				if (!assessment) {
					return new Response(
						JSON.stringify({ error: "Audit assessment not found" }),
						{
							status: 404,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				const rows = processIdParam
					? db
							.select({
								assessmentId: assessmentValues.assessmentId,
								attributeId: assessmentValues.attributeId,
								processElementId: assessmentValues.processElementId,
								bpmnElementId: processElements.bpmnElementId,
								elementType: processElements.elementType,
								elementName: processElements.displayName,
								recordedValue: assessmentValues.recordedValue,
							})
							.from(assessmentValues)
							.innerJoin(
								processElements,
								eq(assessmentValues.processElementId, processElements.id),
							)
							.where(
								and(
									eq(assessmentValues.assessmentId, assessmentId),
									eq(processElements.processId, parseInt(processIdParam, 10)),
								),
							)
							.all()
					: db
							.select({
								assessmentId: assessmentValues.assessmentId,
								attributeId: assessmentValues.attributeId,
								processElementId: assessmentValues.processElementId,
								bpmnElementId: processElements.bpmnElementId,
								elementType: processElements.elementType,
								elementName: processElements.displayName,
								recordedValue: assessmentValues.recordedValue,
							})
							.from(assessmentValues)
							.innerJoin(
								processElements,
								eq(assessmentValues.processElementId, processElements.id),
							)
							.where(eq(assessmentValues.assessmentId, assessmentId))
							.all();

				return new Response(JSON.stringify(rows), {
					headers: { "Content-Type": "application/json" },
				});
			},

			PUT: async ({ params, request }) => {
				const assessmentId = parseInt(params.id, 10);
				const body = (await request.json()) as {
					attributeId: number;
					bpmnElementId: string;
					elementType: string;
					elementName: string;
					processId?: number;
					recordedValue: string | null;
				};

				let pmId = body.processId;
				if (!pmId) {
					const latest = db
						.select()
						.from(businessProcesses)
						.orderBy(desc(businessProcesses.id))
						.limit(1)
						.get();
					if (latest) {
						pmId = latest.id;
					} else {
						const created = db
							.insert(businessProcesses)
							.values({ processName: "default" })
							.returning()
							.get();
						pmId = created.id;
					}
				}

				// Upsert process element (scoped to processId)
				let pe = db
					.select()
					.from(processElements)
					.where(
						and(
							eq(processElements.bpmnElementId, body.bpmnElementId),
							eq(processElements.processId, pmId),
						),
					)
					.get();

				if (!pe) {
					pe = db
						.insert(processElements)
						.values({
							processId: pmId,
							elementType: body.elementType,
							bpmnElementId: body.bpmnElementId,
							displayName: body.elementName,
						})
						.returning()
						.get();
				}

				// Upsert assessment value
				const existing = db
					.select()
					.from(assessmentValues)
					.where(
						and(
							eq(assessmentValues.assessmentId, assessmentId),
							eq(assessmentValues.attributeId, body.attributeId),
							eq(assessmentValues.processElementId, pe.id),
						),
					)
					.get();

				if (existing) {
					if (body.recordedValue === null || body.recordedValue === undefined) {
						db.delete(assessmentValues)
							.where(
								and(
									eq(assessmentValues.assessmentId, assessmentId),
									eq(assessmentValues.attributeId, body.attributeId),
									eq(assessmentValues.processElementId, pe.id),
								),
							)
							.run();
					} else {
						db.update(assessmentValues)
							.set({ recordedValue: body.recordedValue })
							.where(
								and(
									eq(assessmentValues.assessmentId, assessmentId),
									eq(assessmentValues.attributeId, body.attributeId),
									eq(assessmentValues.processElementId, pe.id),
								),
							)
							.run();
					}
				} else if (
					body.recordedValue !== null &&
					body.recordedValue !== undefined
				) {
					db.insert(assessmentValues)
						.values({
							assessmentId: assessmentId,
							attributeId: body.attributeId,
							processElementId: pe.id,
							recordedValue: body.recordedValue,
						})
						.run();
				}

				return new Response(JSON.stringify({ ok: true }), {
					headers: { "Content-Type": "application/json" },
				});
			},

			DELETE: async ({ params, request }) => {
				const assessmentId = parseInt(params.id, 10);
				const url = new URL(request.url);
				const processIdParam = url.searchParams.get("process_id");

				if (processIdParam) {
					const pmId = parseInt(processIdParam, 10);
					const elements = db
						.select({ id: processElements.id })
						.from(processElements)
						.where(eq(processElements.processId, pmId))
						.all();

					if (elements.length > 0) {
						const peIds = elements.map((e) => e.id);
						db.delete(assessmentValues)
							.where(
								and(
									eq(assessmentValues.assessmentId, assessmentId),
									inArray(assessmentValues.processElementId, peIds),
								),
							)
							.run();
					}
				} else {
					db.delete(assessmentValues)
						.where(eq(assessmentValues.assessmentId, assessmentId))
						.run();
				}

				return new Response(JSON.stringify({ ok: true }), {
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
