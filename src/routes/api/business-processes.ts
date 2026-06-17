import { createFileRoute } from "@tanstack/react-router";
import { desc } from "drizzle-orm";
import { db } from "#/db/connection";
import { businessProcesses } from "#/db/schema";

export const Route = createFileRoute("/api/business-processes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const latest = url.searchParams.get("latest");

        if (latest === "true") {
          const row = db
            .select()
            .from(businessProcesses)
            .orderBy(desc(businessProcesses.id))
            .limit(1)
            .get();
          return new Response(JSON.stringify(row || null), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const rows = db.select().from(businessProcesses).orderBy(desc(businessProcesses.id)).all();
        return new Response(JSON.stringify(rows), {
          headers: { "Content-Type": "application/json" },
        });
      },

      POST: async ({ request }) => {
        const body = await request.json() as { processName: string; bpmnDefinition?: string };
        const created = db.insert(businessProcesses).values({
          processName: body.processName,
          bpmnDefinition: body.bpmnDefinition || null,
        }).returning().get();

        return new Response(JSON.stringify(created), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
