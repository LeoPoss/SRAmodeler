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
	elementType?: string;
	elementName?: string;
}

export interface SelectedElement {
	id: string;
	name: string;
	type: string;
}

export type InputElementType = "BooleanToggle" | "Dropdown" | "TextInput";

export type ProgressStatus = "completed" | "in-progress" | "not-started";

export type GapStatus = "aligned" | "gap" | "na";

export interface ComparisonItem {
	requirementId: string;
	externalId: string;
	label: string;
	category: string;
	subcategory?: string;
	inputType: InputElementType;
	dropdownOptions: string[] | null;
	toBeValue: string | boolean | null;
	asIsValue: string | boolean | null;
	status: GapStatus;
}

export interface GroupedComparison {
	elementId: string;
	elementName: string;
	elementType: string;
	items: ComparisonItem[];
	gapCount: number;
	alignedCount: number;
}

export interface GroupedRequirements {
	[category: string]: ComplianceRequirement[];
}

export interface BusinessProcess {
	id: number;
	name: string;
}

export interface AuditAssessment {
	id: number;
	auditType: string;
	processId: number | null;
	processName: string | null;
}

export interface AppHeaderProps {
	activeView: "editor" | "matrix";
	onViewChange: (view: "editor" | "matrix") => void;
	onFileImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onExport: () => void;
	onReposition: () => void;
	onReset?: () => void;
	elementsCount: number;
	onToggleSidebar?: () => void;
	sidebarOpen?: boolean;
	businessProcesses: BusinessProcess[];
	activeBusinessProcessId: number | null;
	onBusinessProcessChange: (id: number) => void;
	auditAssessments: AuditAssessment[];
	activeAuditAssessmentId: number | null;
	onAuditAssessmentChange: (id: number) => void;
	onCreateAuditAssessment: (type: "To-Be" | "As-Is") => void;
	isLoading: boolean;
}

export type BpmnModeler = InstanceType<
	typeof import("bpmn-js/lib/Modeler").default
>;

export interface BpmnCanvasHandle {
	getModeler: () => BpmnModeler | null;
	getXml: () => Promise<string>;
	syncSelection: () => void;
	repositionAnnotations: () => Promise<void>;
	rebuildAnnotations: (force?: boolean) => Promise<void>;
}

export interface ProcessElement {
	id: string;
	name: string;
	type: string;
	answeredCount: number;
	totalCount: number;
}
