/**
 * Shared constants used across multiple components.
 * Centralised here to avoid duplication.
 */

// ─── BPMN element type definitions ─────────────────────────────────

export interface BpmnType {
	key: string;
	label: string;
	color: string;
}

export const BPMN_TYPES: BpmnType[] = [
	{ key: "task", label: "Task", color: "#3b82f6" },
	{ key: "message_event", label: "Message Event", color: "#8b5cf6" },
	{ key: "pool", label: "Pool", color: "#f59e0b" },
	{ key: "lane", label: "Lane", color: "#10b981" },
];

// ─── Subcategory color palette ─────────────────────────────────────

export const SUBCATEGORY_COLORS: Record<string, string> = {
	"Application and Ecosystem Design": "#6366f1",
	"Device Security": "#ef4444",
	"Data Protection": "#10b981",
	"Communication Security": "#3b82f6",
	"Supply Chain": "#8b5cf6",
	Authentication: "#f59e0b",
	Authorization: "#ec4899",
	General: "#64748b",
};
