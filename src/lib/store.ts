import { atom, getDefaultStore } from "jotai";
import type {
	AnsweredComplianceRequirement,
	ComplianceRequirement,
	SelectedElement,
} from "./types";

const BASE_URL = "/modeler/api";

interface ElementRegistry {
	get(id: string): { id: string; type: string; businessObject?: { name?: string; $parent?: any } } | undefined;
	getAll(): { id: string; type: string; businessObject?: { name?: string; $parent?: any } }[];
}

// ─── Jotai Atoms for Fine-Grained Reactive Updates ────────────────
export const complianceRequirementsAtom = atom<ComplianceRequirement[]>([]);
export const answeredComplianceRequirementsAtom = atom<AnsweredComplianceRequirement[]>([]);
export const selectedElementAtom = atom<SelectedElement | null>(null);
export const bpmnXmlAtom = atom<string>("");
export const elementRegistryAtom = atom<ElementRegistry | null>(null);
export const auditAssessmentIdAtom = atom<number | null>(null);
export const auditTypeAtom = atom<string>("To-Be");
export const businessProcessIdAtom = atom<number | null>(null);
export const businessProcessesAtom = atom<{ id: number; name: string; processName: string }[]>([]);
export const auditAssessmentsAtom = atom<
	{
		id: number;
		auditType: string;
		processId: number | null;
		processName: string | null;
	}[]
>([]);
export const loadingAtom = atom<boolean>(false);

const baseStore = getDefaultStore();

class Store {
	constructor() {}

	// ─── Loading State ──────────────────────────────────────────

	isLoading() {
		return baseStore.get(loadingAtom);
	}

	// ─── Initializer & Reload ───────────────────────────────────

	async init(): Promise<void> {
		baseStore.set(loadingAtom, true);
		try {
			await this.fetchComplianceRequirements();
			await this.fetchBusinessProcesses();
			await this.fetchAuditAssessments();

			const bp = await this.loadLatestBusinessProcess();
			if (bp) {
				const auditAssessmentsList = baseStore.get(auditAssessmentsAtom).filter(
					(a) => a.processId === bp.id,
				);
				if (auditAssessmentsList.length > 0) {
					baseStore.set(auditAssessmentIdAtom, auditAssessmentsList[0].id);
					baseStore.set(auditTypeAtom, auditAssessmentsList[0].auditType);
				} else {
					const createdId = await this.createAuditAssessmentSilent("To-Be");
					await this.fetchAuditAssessments();
					baseStore.set(auditAssessmentIdAtom, createdId);
					baseStore.set(auditTypeAtom, "To-Be");
				}
				await this.fetchAssessmentValues();
			} else {
				baseStore.set(businessProcessIdAtom, null);
				baseStore.set(bpmnXmlAtom, "");
				baseStore.set(auditAssessmentIdAtom, null);
			}
		} catch (err) {
			console.error("Store initialization failed:", err);
		} finally {
			baseStore.set(loadingAtom, false);
		}
	}

	async reload(): Promise<void> {
		baseStore.set(loadingAtom, true);
		baseStore.set(selectedElementAtom, null);
		try {
			await this.fetchComplianceRequirements();
			await this.fetchBusinessProcesses();
			await this.fetchAuditAssessments();

			const bpId = baseStore.get(businessProcessIdAtom);
			if (bpId) {
				const bpRes = await fetch(`${BASE_URL}/business-processes/${bpId}`);
				if (bpRes.ok) {
					const bp = await bpRes.json();
					if (bp && bp.bpmnDefinition) {
						baseStore.set(bpmnXmlAtom, bp.bpmnDefinition);
					}
				}
			}

			if (baseStore.get(auditAssessmentIdAtom)) {
				await this.fetchAssessmentValues();
			}
		} catch (err) {
			console.error("Reload failed:", err);
		} finally {
			baseStore.set(loadingAtom, false);
		}
	}

	// ─── Audit Assessment ────────────────────────────────────────

	getAuditAssessmentId() {
		return baseStore.get(auditAssessmentIdAtom);
	}
	getAuditType() {
		return baseStore.get(auditTypeAtom);
	}
	getAuditAssessments() {
		return baseStore.get(auditAssessmentsAtom);
	}

	// ─── Business Process ────────────────────────────────────────

	getBusinessProcessId() {
		return baseStore.get(businessProcessIdAtom);
	}
	getBusinessProcesses() {
		return baseStore.get(businessProcessesAtom);
	}

	async setBusinessProcessId(id: number | null): Promise<void> {
		baseStore.set(loadingAtom, true);
		baseStore.set(businessProcessIdAtom, id);
		baseStore.set(selectedElementAtom, null);
		baseStore.set(answeredComplianceRequirementsAtom, []);

		if (id) {
			try {
				const bpRes = await fetch(`${BASE_URL}/business-processes/${id}`);
				if (bpRes.ok) {
					const bp = await bpRes.json();
					if (bp && bp.bpmnDefinition) {
						baseStore.set(bpmnXmlAtom, bp.bpmnDefinition);
					}
				}
			} catch (err) {
				console.error("Failed to sync business process XML:", err);
			}

			await this.fetchAuditAssessments();
			const auditAssessmentsList = baseStore.get(auditAssessmentsAtom).filter((a) => a.processId === id);
			if (auditAssessmentsList.length > 0) {
				baseStore.set(auditAssessmentIdAtom, auditAssessmentsList[0].id);
				baseStore.set(auditTypeAtom, auditAssessmentsList[0].auditType);
			} else {
				const createdId = await this.createAuditAssessmentSilent("To-Be");
				await this.fetchAuditAssessments();
				baseStore.set(auditAssessmentIdAtom, createdId);
				baseStore.set(auditTypeAtom, "To-Be");
			}
			await this.fetchAssessmentValues();
		} else {
			baseStore.set(bpmnXmlAtom, "");
			baseStore.set(auditAssessmentIdAtom, null);
		}
		baseStore.set(loadingAtom, false);
	}

	async importBusinessProcess(name: string, xml: string): Promise<number> {
		baseStore.set(loadingAtom, true);
		try {
			const id = await this.saveBusinessProcess(name, xml);
			await this.fetchBusinessProcesses();
			await this.setBusinessProcessId(id);
			return id;
		} catch (err) {
			console.error("Failed to import business process:", err);
			throw err;
		} finally {
			baseStore.set(loadingAtom, false);
		}
	}

	async ensureAuditAssessment(): Promise<number> {
		const auditId = baseStore.get(auditAssessmentIdAtom);
		if (auditId) return auditId;

		try {
			const bpId = baseStore.get(businessProcessIdAtom);
			let existing = baseStore.get(auditAssessmentsAtom).find((a) => a.processId === bpId);
			if (!existing) {
				const list = await this.fetchAuditAssessments();
				existing = list.find((a) => a.processId === bpId);
			}

			if (existing) {
				baseStore.set(auditAssessmentIdAtom, existing.id);
				baseStore.set(auditTypeAtom, existing.auditType);
				return existing.id;
			}

			const createdId = await this.createAuditAssessmentSilent("To-Be");
			await this.fetchAuditAssessments();
			baseStore.set(auditAssessmentIdAtom, createdId);
			baseStore.set(auditTypeAtom, "To-Be");
			return createdId;
		} catch (err) {
			console.error("Failed to ensure audit assessment:", err);
			throw err;
		}
	}

	async fetchAuditAssessments(): Promise<any[]> {
		try {
			const res = await fetch(`${BASE_URL}/audit-assessments`);
			const data = await res.json();
			const mapped = data.map((a: any) => ({
				id: a.id,
				auditType: a.auditType,
				processId: a.processId,
				processName: a.processName,
			}));
			baseStore.set(auditAssessmentsAtom, mapped);
			return mapped;
		} catch (err) {
			console.error("Failed to fetch audit assessments:", err);
			return [];
		}
	}

	async fetchBusinessProcesses(): Promise<{ id: number; name: string }[]> {
		try {
			const res = await fetch(`${BASE_URL}/business-processes`);
			const data = await res.json();
			const mapped = data.map((bp: any) => ({
				id: bp.id,
				name: bp.processName || bp.name,
				processName: bp.processName || bp.name,
			}));
			baseStore.set(businessProcessesAtom, mapped);
			return mapped;
		} catch (err) {
			console.error("Failed to fetch business processes:", err);
			return [];
		}
	}

	async setAuditAssessment(id: number): Promise<void> {
		baseStore.set(loadingAtom, true);
		baseStore.set(auditAssessmentIdAtom, id);
		baseStore.set(selectedElementAtom, null);
		baseStore.set(answeredComplianceRequirementsAtom, []);

		try {
			let audit = baseStore.get(auditAssessmentsAtom).find((a) => a.id === id);
			if (!audit) {
				const list = await this.fetchAuditAssessments();
				audit = list.find((a) => a.id === id);
			}

			if (audit) {
				baseStore.set(auditTypeAtom, audit.auditType);
				const bpId = baseStore.get(businessProcessIdAtom);
				if (audit.processId && audit.processId !== bpId) {
					const bpRes = await fetch(`${BASE_URL}/business-processes/${audit.processId}`);
					if (bpRes.ok) {
						const bp = await bpRes.json();
						if (bp && bp.bpmnDefinition) {
							baseStore.set(businessProcessIdAtom, bp.id);
							baseStore.set(bpmnXmlAtom, bp.bpmnDefinition);
						}
					}
				}
			}
		} catch (err) {
			console.error("Failed to sync business process on audit assessment change:", err);
		}

		await this.fetchAssessmentValues();
		baseStore.set(loadingAtom, false);
	}

	private async createAuditAssessmentSilent(type: string = "To-Be"): Promise<number> {
		const bpId = baseStore.get(businessProcessIdAtom);
		const res = await fetch(`${BASE_URL}/audit-assessments`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				auditType: type,
				processId: bpId || null,
			}),
		});
		const created: { id: number } = await res.json();
		return created.id;
	}

	async createAuditAssessment(type: "To-Be" | "As-Is" = "To-Be"): Promise<number> {
		baseStore.set(loadingAtom, true);
		try {
			const id = await this.createAuditAssessmentSilent(type);
			await this.fetchAuditAssessments();
			baseStore.set(auditAssessmentIdAtom, id);
			baseStore.set(auditTypeAtom, type);
			baseStore.set(answeredComplianceRequirementsAtom, []);
			await this.fetchAssessmentValues();
		} catch (err) {
			console.error("Failed to create audit assessment:", err);
		} finally {
			baseStore.set(loadingAtom, false);
		}
		return baseStore.get(auditAssessmentIdAtom)!;
	}

	async saveBusinessProcess(name: string, xml?: string): Promise<number> {
		const bpmnXml = xml ?? baseStore.get(bpmnXmlAtom);
		const res = await fetch(`${BASE_URL}/business-processes`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ processName: name, bpmnDefinition: bpmnXml }),
		});
		const created: { id: number } = await res.json();
		return created.id;
	}

	async updateBusinessProcess(id: number, xml?: string): Promise<void> {
		const bpmnXml = xml ?? baseStore.get(bpmnXmlAtom);
		if (xml) baseStore.set(bpmnXmlAtom, xml);
		await fetch(`${BASE_URL}/business-processes/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ bpmnDefinition: bpmnXml }),
		});
	}

	async loadLatestBusinessProcess(): Promise<{ id: number; processName: string; bpmnDefinition: string | null } | null> {
		try {
			const res = await fetch(`${BASE_URL}/business-processes?latest=true`);
			if (!res.ok) return null;
			const bp = await res.json();
			if (bp) {
				baseStore.set(businessProcessIdAtom, bp.id);
				baseStore.set(bpmnXmlAtom, bp.bpmnDefinition || "");
			}
			return bp;
		} catch (err) {
			console.error("Failed to load latest business process:", err);
			return null;
		}
	}

	// ─── Compliance Requirements (Evaluation Attributes from DB) ───────

	getComplianceRequirements() {
		return baseStore.get(complianceRequirementsAtom);
	}

	setComplianceRequirements(data: ComplianceRequirement[]) {
		baseStore.set(complianceRequirementsAtom, data);
	}

	async fetchComplianceRequirements(): Promise<void> {
		try {
			const res = await fetch(`${BASE_URL}/evaluation-attributes`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data: ComplianceRequirement[] = await res.json();
			this.setComplianceRequirements(data);
		} catch (err) {
			console.error("Failed to fetch compliance requirements from API:", err);
		}
	}

	// ─── Assessment Values (answers) ───────────────────────────

	async fetchAssessmentValues(): Promise<void> {
		const auditId = await this.ensureAuditAssessment();
		try {
			const bpId = baseStore.get(businessProcessIdAtom);
			let url = `${BASE_URL}/audit-assessments/${auditId}/values`;
			if (bpId) {
				url += `?process_id=${bpId}`;
			}
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const rows: {
				assessmentId: number;
				attributeId: number;
				processElementId: number;
				bpmnElementId: string;
				recordedValue: string | null;
			}[] = await res.json();

			const answered: AnsweredComplianceRequirement[] = [];
			for (const row of rows) {
				const finalVal = row.recordedValue;
				let parsedValue: string | boolean | null = finalVal;
				if (finalVal === "true") parsedValue = true;
				else if (finalVal === "false") parsedValue = false;

				answered.push({
					elementId: row.bpmnElementId,
					requirementId: String(row.attributeId),
					value: parsedValue,
				});
			}

			baseStore.set(answeredComplianceRequirementsAtom, answered);
		} catch (err) {
			console.error("Failed to fetch assessment values:", err);
		}
	}

	getAnsweredComplianceRequirements() {
		return baseStore.get(answeredComplianceRequirementsAtom);
	}

	setAnsweredComplianceRequirements(data: AnsweredComplianceRequirement[]) {
		baseStore.set(answeredComplianceRequirementsAtom, data);
	}

	async answerComplianceRequirement(
		elementId: string,
		requirementId: string,
		value: string | boolean | null | undefined,
		elementType?: string,
		elementName?: string,
	) {
		const auditId = await this.ensureAuditAssessment();
		const bpId = baseStore.get(businessProcessIdAtom);

		try {
			const wertVal = value === undefined || value === null ? null : String(value);
			const res = await fetch(`${BASE_URL}/audit-assessments/${auditId}/values`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					attributeId: parseInt(requirementId, 10),
					bpmnElementId: elementId,
					elementType: elementType || "",
					elementName: elementName || elementId,
					processId: bpId || undefined,
					recordedValue: wertVal,
				}),
			});
			if (!res.ok) {
				console.error(`Failed to persist answer: HTTP ${res.status}`);
				return;
			}
		} catch (err) {
			console.error("Failed to persist answer:", err);
			return;
		}

		baseStore.set(answeredComplianceRequirementsAtom, (prev) => {
			const idx = prev.findIndex(
				(a) => a.elementId === elementId && a.requirementId === requirementId,
			);
			if (idx >= 0) {
				if (value === undefined) return prev.filter((_, i) => i !== idx);
				return prev.map((a, i) => (i === idx ? { elementId, requirementId, value } : a));
			}
			if (value !== undefined) return [...prev, { elementId, requirementId, value }];
			return prev;
		});
	}

	getAnswer(
		elementId: string,
		requirementId: string,
	): string | boolean | null | undefined {
		const answer = baseStore.get(answeredComplianceRequirementsAtom).find(
			(a) => a.elementId === elementId && a.requirementId === requirementId,
		);
		return answer?.value;
	}

	getAnswersForElement(elementId: string): AnsweredComplianceRequirement[] {
		return baseStore.get(answeredComplianceRequirementsAtom).filter((a) => a.elementId === elementId);
	}

	// ─── Selected Element ──────────────────────────────────────

	getSelectedElement() {
		return baseStore.get(selectedElementAtom);
	}

	setSelectedElement(element: SelectedElement | null) {
		baseStore.set(selectedElementAtom, element);
	}

	// ─── BPMN ──────────────────────────────────────────────────

	getBpmnXml() {
		return baseStore.get(bpmnXmlAtom);
	}

	setBpmnXml(xml: string) {
		baseStore.set(bpmnXmlAtom, xml);
	}

	setElementRegistry(registry: ElementRegistry) {
		baseStore.set(elementRegistryAtom, registry);
	}

	getElementRegistry(): ElementRegistry | null {
		return baseStore.get(elementRegistryAtom);
	}

	getElementsWithQuestions(): { id: string; name: string; type: string }[] {
		const registry = baseStore.get(elementRegistryAtom);
		if (!registry) return [];

		const elements = registry.getAll();
		const result: { id: string; name: string; type: string }[] = [];

		for (const element of elements) {
			if (!element.businessObject) continue;

			const type = element.type;
			const reqs = this.getComplianceRequirementsForElement(type);

			if (reqs.length > 0) {
				result.push({
					id: element.id,
					name: element.businessObject?.name || element.id,
					type,
				});
			}
		}

		return result;
	}

	getOverallProgress(): {
		answered: number;
		total: number;
		percentage: number;
	} {
		const elements = this.getElementsWithQuestions();
		let total = 0;
		let answered = 0;

		for (const element of elements) {
			const reqs = this.getComplianceRequirementsForElement(element.type);
			total += reqs.length;

			const answers = this.getAnswersForElement(element.id);
			answered += answers.length;
		}

		return {
			answered,
			total,
			percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
		};
	}

	getComplianceRequirementsForElement(elementType: string): ComplianceRequirement[] {
		const requirementsList = baseStore.get(complianceRequirementsAtom);
		switch (elementType) {
			case "bpmn:Task":
			case "Task":
				return requirementsList.filter((r) => r.bpmn_mapping.task);
			case "bpmn:IntermediateCatchEvent":
			case "bpmn:IntermediateThrowEvent":
			case "MessageEvent":
				return requirementsList.filter((r) => r.bpmn_mapping.message_event);
			case "bpmn:Participant":
			case "Pool":
			case "bpmn:Lane":
			case "Lane":
				return requirementsList.filter((r) => r.bpmn_mapping.pool);
			default:
				return [];
		}
	}

	getProgressForElement(elementId: string, elementType: string) {
		const reqs = this.getComplianceRequirementsForElement(elementType);
		const answers = this.getAnswersForElement(elementId);

		return {
			answered: answers.length,
			total: reqs.length,
			status:
				reqs.length === 0
					? ("completed" as const)
					: answers.length === 0
						? ("not-started" as const)
						: answers.length === reqs.length
							? ("completed" as const)
							: ("in-progress" as const),
		};
	}

	async fetchValuesForAssessment(assessmentId: number): Promise<AnsweredComplianceRequirement[]> {
		try {
			const bpId = baseStore.get(businessProcessIdAtom);
			let url = `${BASE_URL}/audit-assessments/${assessmentId}/values`;
			if (bpId) {
				url += `?process_id=${bpId}`;
			}
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const rows: {
				assessmentId: number;
				attributeId: number;
				processElementId: number;
				bpmnElementId: string;
				recordedValue: string | null;
			}[] = await res.json();

			const answered: AnsweredComplianceRequirement[] = [];
			for (const row of rows) {
				const finalVal = row.recordedValue;
				let parsedValue: string | boolean | null = finalVal;
				if (finalVal === "true") parsedValue = true;
				else if (finalVal === "false") parsedValue = false;

				answered.push({
					elementId: row.bpmnElementId,
					requirementId: String(row.attributeId),
					value: parsedValue,
				});
			}
			return answered;
		} catch (err) {
			console.error(`Failed to fetch values for assessment ${assessmentId}:`, err);
			return [];
		}
	}

	subscribe(listener: () => void) {
		const unsubAnswered = baseStore.sub(answeredComplianceRequirementsAtom, listener);
		const unsubXml = baseStore.sub(bpmnXmlAtom, listener);
		const unsubLoading = baseStore.sub(loadingAtom, listener);
		return () => {
			unsubAnswered();
			unsubXml();
			unsubLoading();
		};
	}
}

export const store = new Store();

// Export clean API (no legacy fields)
export const complianceRequirements = () => store.getComplianceRequirements();
export const getComplianceRequirementsForElement = (type: string) => store.getComplianceRequirementsForElement(type);
export const answeredComplianceRequirements = () => store.getAnsweredComplianceRequirements();
export const selectedElement = () => store.getSelectedElement();
export const setSelectedElement = (el: SelectedElement | null) =>
	store.setSelectedElement(el);
export const bpmnXml = () => store.getBpmnXml();
export const setBpmnXml = (xml: string) => store.setBpmnXml(xml);
export const fetchComplianceRequirements = () => store.fetchComplianceRequirements();
export const answerComplianceRequirement = (
	elId: string,
	reqId: string,
	val: string | boolean | null | undefined,
	elType?: string,
	elName?: string,
) => store.answerComplianceRequirement(elId, reqId, val, elType, elName);
export const getAnswer = (elId: string, reqId: string) =>
	store.getAnswer(elId, reqId);
export const getAnswersForElement = (elId: string) =>
	store.getAnswersForElement(elId);
export const subscribe = store.subscribe.bind(store);
export const setElementRegistry = (registry: ElementRegistry) =>
	store.setElementRegistry(registry);
export const getElementsWithQuestions = () => store.getElementsWithQuestions();
export const getOverallProgress = () => store.getOverallProgress();
export const fetchAssessmentValues = () => store.fetchAssessmentValues();
export const ensureAuditAssessment = () => store.ensureAuditAssessment();
export const fetchAuditAssessments = () => store.fetchAuditAssessments();
export const setAuditAssessment = (id: number) => store.setAuditAssessment(id);
export const createAuditAssessment = (type: "To-Be" | "As-Is") => store.createAuditAssessment(type);
export const saveBusinessProcess = (name: string, xml?: string) => store.saveBusinessProcess(name, xml);
export const updateBusinessProcess = (id: number, xml?: string) => store.updateBusinessProcess(id, xml);
export const loadLatestBusinessProcess = () => store.loadLatestBusinessProcess();
export const getBusinessProcessId = () => store.getBusinessProcessId();
export const setBusinessProcessId = (id: number | null) => store.setBusinessProcessId(id);

export const isLoading = () => store.isLoading();
export const initStore = () => store.init();
export const reloadStore = () => store.reload();
export const getBusinessProcesses = () => store.getBusinessProcesses();
export const getAuditAssessments = () => store.getAuditAssessments();
export const importBusinessProcess = (name: string, xml: string) => store.importBusinessProcess(name, xml);
export const fetchBusinessProcesses = () => store.fetchBusinessProcesses();
export const getProgressForElement = (elId: string, type: string) => store.getProgressForElement(elId, type);
export const fetchValuesForAssessment = (id: number) => store.fetchValuesForAssessment(id);
