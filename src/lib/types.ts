export interface ComplianceRequirement {
	id: string;
	requirement: string;
	question?: string;
	category: string;
	subcategory: string;
	external_id: string;
	bpmn_mapping: {
		task: boolean;
		message_event: boolean;
		pool: boolean;
		lane: boolean;
	};
	further_specification: string;
	bpmn_annotation: string;
	bpmn_template: string;
}

export interface AnsweredComplianceRequirement {
	elementId: string;
	requirementId: string;
	value: string | boolean | null;
}

export interface SelectedElement {
	id: string;
	name: string;
	type: string;
}

export type InputElementType = "BooleanToggle" | "Dropdown" | "TextInput";

export type ProgressStatus = "completed" | "in-progress" | "not-started";
