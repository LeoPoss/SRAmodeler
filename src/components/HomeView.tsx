"use client";

import {
	useCallback,
	lazy,
	Suspense,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import AppHeader from "#/components/AppHeader";
import type { BpmnCanvasHandle, BpmnModeler } from "#/components/BpmnCanvas";
import BpmnCanvas from "#/components/BpmnCanvas";
import ProcessNavigator from "#/components/ProcessNavigator";
import RequirementSidebar from "#/components/RequirementSidebar";
import ResetConfirmDialog from "#/components/ResetConfirmDialog";
import { createSecurityDataObject } from "#/lib/bpmn-extensions";
import { useAtomValue } from "jotai";
import {
	answerComplianceRequirement,
	getAnswersForElement,
	getElementsWithQuestions,
	getOverallProgress,
	getComplianceRequirementsForElement,
	setSelectedElement,
	store,
	bpmnXmlAtom,
	loadingAtom,
	businessProcessesAtom,
	auditAssessmentsAtom,
	businessProcessIdAtom,
	auditAssessmentIdAtom,
	selectedElementAtom,
} from "#/lib/store";

const ComplianceMatrix = lazy(() => import("#/components/ComplianceMatrix"));
const ComparisonView = lazy(() => import("#/components/ComparisonView"));

export interface ProcessElement {
	id: string;
	name: string;
	type: string;
	answeredCount: number;
	totalCount: number;
}

export default function Home() {
	const currentXml = useAtomValue(bpmnXmlAtom);
	const businessProcesses = useAtomValue(businessProcessesAtom);
	const activeBusinessProcessId = useAtomValue(businessProcessIdAtom);
	const auditAssessments = useAtomValue(auditAssessmentsAtom);
	const activeAuditAssessmentId = useAtomValue(auditAssessmentIdAtom);
	const isStoreLoading = useAtomValue(loadingAtom);
	const selected = useAtomValue(selectedElementAtom);

	const [modeler, setModeler] = useState<BpmnModeler | null>(null);
	const [activeView, setActiveView] = useState<"editor" | "matrix">("editor");
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
	const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
	const canvasRef = useRef<BpmnCanvasHandle>(null);

	useEffect(() => {
		store.init();
	}, []);

	// Detect mobile
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 1024);
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async (e) => {
			const xml = e.target?.result as string;
			try {
				// DOMPurify converts non-breaking spaces (U+00A0) to &nbsp;
				// which is not a valid XML entity — bpmn-js can't parse it.
				// bpmn-js has its own secure XML parser; skip DOMPurify here.
				await store.importBusinessProcess(file.name.replace(/\.(bpmn|xml)$/, ""), xml);
			} catch (err) {
				console.error("Failed to save uploaded business process:", err);
			}
		};
		reader.readAsText(file);
	};

	const handleExport = async () => {
		const xml = await canvasRef.current?.getXml();
		if (!xml) return;
		const blob = new Blob([xml], { type: "application/xml" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "security-enriched.bpmn";
		a.click();
		URL.revokeObjectURL(url);
	};

	const requirements = useMemo(() => {
		return selected ? getComplianceRequirementsForElement(selected.type) : [];
	}, [selected]);

	const handleAnswer = async (reqId: string, value: string | boolean | null) => {
		if (!selected || !modeler) return;

		const req = store.getComplianceRequirements().find((r) => r.id === reqId);
		if (!req) return;

		answerComplianceRequirement(selected.id, reqId, value, selected.type, selected.name);

		const elementRegistry = modeler.get("elementRegistry") as any;
		const bpmnElement = elementRegistry.get(selected.id);
		if (bpmnElement) {
			await createSecurityDataObject(modeler, bpmnElement, req, value);
		}
	};

	const handleReposition = async () => {
		await canvasRef.current?.repositionAnnotations();
	};

	const handleResetElement = () => {
		if (!selected) return;
		const answers = getAnswersForElement(selected.id);
		for (const a of answers) {
			answerComplianceRequirement(selected.id, a.requirementId, undefined, selected.type, selected.name);
		}
	};

	const handleResetClick = () => {
		setIsResetDialogOpen(true);
	};

	const handleResetConfirm = async () => {
		const pmId = store.getBusinessProcessId();
		const assId = store.getAuditAssessmentId();
		if (!pmId || !assId) return;

		try {
			const res = await fetch(`/modeler/api/audit-assessments/${assId}/values?process_id=${pmId}`, {
				method: "DELETE",
			});
			if (res.ok) {
				store.setAnsweredComplianceRequirements([]);
				if (canvasRef.current) {
					await canvasRef.current.rebuildAnnotations(true);
				}
			} else {
				console.error("Failed to delete assessment values from DB");
			}
		} catch (err) {
			console.error("Failed to reset business process answers:", err);
		}
	};

	const elements = getElementsWithQuestions();
	const progress = getOverallProgress();

	const currentNavIndex = useMemo(() => {
		if (!selected) return -1;
		return elements.findIndex((e) => e.id === selected.id);
	}, [selected, elements]);

	const handleSetSelected = (el: { id: string; name: string; type: string }) => {
		setSelectedElement(el);
		if (isMobile === true) {
			setSidebarOpen(true);
		}
		setTimeout(() => {
			canvasRef.current?.syncSelection();
		}, 100);
	};

	const goToPrevElement = useCallback(() => {
		if (elements.length === 0) return;
		const newIndex =
			currentNavIndex <= 0 ? elements.length - 1 : currentNavIndex - 1;
		const el = elements[newIndex];
		setSelectedElement({ id: el.id, name: el.name, type: el.type });
		setTimeout(() => {
			canvasRef.current?.syncSelection();
		}, 200);
	}, [elements, currentNavIndex]);

	const goToNextElement = useCallback(() => {
		if (elements.length === 0) return;
		const newIndex =
			currentNavIndex >= elements.length - 1 || currentNavIndex === -1
				? 0
				: currentNavIndex + 1;
		const el = elements[newIndex];
		setSelectedElement({ id: el.id, name: el.name, type: el.type });
		setTimeout(() => {
			canvasRef.current?.syncSelection();
		}, 200);
	}, [elements, currentNavIndex]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			if (e.key === "ArrowLeft") {
				e.preventDefault();
				goToPrevElement();
			} else if (e.key === "ArrowRight") {
				e.preventDefault();
				goToNextElement();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [goToPrevElement, goToNextElement]);

	const handleBusinessProcessChange = async (id: number) => {
		await store.setBusinessProcessId(id);
	};

	const handleAuditAssessmentChange = async (id: number) => {
		await store.setAuditAssessment(id);
	};

	const handleCreateAuditAssessment = async (type: "To-Be" | "As-Is") => {
		await store.createAuditAssessment(type);
	};


	return (
		<div className="min-h-screen bg-white text-[#171717]">
			<AppHeader
				activeView={activeView}
				onViewChange={setActiveView}
				onFileImport={handleFileImport}
				onExport={handleExport}
				onReposition={handleReposition}
				onReset={handleResetClick}
				elementsCount={elements.length}
				sidebarOpen={sidebarOpen}
				onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
				businessProcesses={businessProcesses}
				activeBusinessProcessId={activeBusinessProcessId}
				onBusinessProcessChange={handleBusinessProcessChange}
				auditAssessments={auditAssessments}
				activeAuditAssessmentId={activeAuditAssessmentId}
				onAuditAssessmentChange={handleAuditAssessmentChange}
				onCreateAuditAssessment={handleCreateAuditAssessment}
				isLoading={isStoreLoading}
			/>

			<div className="flex h-[calc(100vh-57px)]">
				{activeView === "editor" && (
					<aside className="hidden lg:flex w-64 flex-col bg-white shrink-0" style={{ borderRight: '1px solid #ebebeb' }}>
						<ProcessNavigator
							elements={elements.map((el) => {
								const answers = getAnswersForElement(el.id);
								const reqs = getComplianceRequirementsForElement(el.type);
								return {
									...el,
									answeredCount: answers.length,
									totalCount: reqs.length,
								};
							})}
							selected={selected}
							onSelect={handleSetSelected}
							overallProgress={progress}
						/>
					</aside>
				)}

				<main className="flex-1 relative bg-[#fafafa] min-w-0 flex flex-col h-full">
					<div
						style={{
							display: activeView === "editor" ? "block" : "none",
							width: "100%",
						}}
						className="flex-1 min-h-0"
					>
						<BpmnCanvas
							ref={canvasRef}
							xml={currentXml}
							auditAssessmentId={activeAuditAssessmentId || undefined}
							onReady={(m: BpmnModeler) => setModeler(m)}
						/>
					</div>
					{activeView === "matrix" && (
						<div className="view-transition-enter w-full h-full flex-1">
							<Suspense
								fallback={
									<div className="flex items-center justify-center h-full">
										<div className="w-8 h-8 border-4 border-[#ebebeb] border-t-[#171717] rounded-full animate-spin" />
									</div>
								}
							>
								<ComplianceMatrix />
							</Suspense>
						</div>
					)}
					{activeView === "editor" && (
						<div className="border-t border-[#e5e5e5] bg-white flex flex-col z-20 shrink-0" style={{ height: "340px" }}>
							<div className="h-[38px] px-4 bg-[#fafafa] border-b border-[#ebebeb] flex items-center">
								<span className="text-sm font-semibold text-[#171717]">Comparison</span>
							</div>
							<div className="flex-1 min-h-0 relative">
								<Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-[#cccccc] border-t-[#171717] rounded-full animate-spin" /></div>}>
									<ComparisonView />
								</Suspense>
							</div>
						</div>
					)}
				</main>

				{activeView === "editor" && (
					<aside 
						className="fixed lg:relative inset-y-0 right-0 w-[350px] sm:w-[400px] lg:w-[450px] bg-white p-4 overflow-y-auto flex flex-col z-50 lg:z-auto transition-transform duration-300 ease-in-out"
						style={{ 
							borderLeft: '1px solid #ebebeb',
							transform: isMobile === false ? 'translateX(0)' : isMobile === true && !sidebarOpen ? 'translateX(100%)' : 'translateX(0)',
						}}
					>
						{selected ? (
							<RequirementSidebar
								selected={selected}
								requirements={requirements}
								onAnswer={handleAnswer}
								onResetElement={handleResetElement}
							/>
						) : (
							<div className="flex flex-col items-center justify-center py-16 px-6 text-center">
								<div 
									className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" 
									style={{ background: '#fafafa', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 0px 0px 1px' }}
								>
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#666666]" aria-label="Select element">
										<title>Select element</title>
										<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
										<path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
									</svg>
								</div>
								<p className="text-sm font-medium text-[#171717] mb-1">No Element Selected</p>
								<p className="text-xs text-[#666666] leading-relaxed">
									Click on a BPMN element in the canvas to view and answer its security requirements
								</p>
							</div>
						)}
						<button
							type="button"
							onClick={() => setSidebarOpen(false)}
							className="lg:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-md text-[#666666] hover:text-[#171717] hover:bg-[#fafafa]"
						>
							×
						</button>
					</aside>
				)}
			</div>

			<ResetConfirmDialog
				isOpen={isResetDialogOpen}
				onClose={() => setIsResetDialogOpen(false)}
				onConfirm={handleResetConfirm}
			/>
		</div>
	);
}