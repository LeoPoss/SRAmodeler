import { useState, useEffect, useMemo } from "react";
import { useAtomValue } from "jotai";
import {
	auditAssessmentsAtom,
	businessProcessIdAtom,
	answeredComplianceRequirementsAtom,
	fetchValuesForAssessment,
	createAuditAssessment,
	getElementsWithQuestions,
	getComplianceRequirementsForElement,
	reloadStore,
} from "#/lib/store";
import { 
	Plus, Info, MagnifyingGlass, Warning
} from "@phosphor-icons/react";

type GapStatus = "aligned" | "gap" | "over" | "unassessed" | "exempt" | "na";
type GapSeverity = "critical" | "major" | "minor" | "info";

interface ComparisonItem {
	requirementId: string; externalId: string; label: string; category: string; subcategory?: string;
	inputType: "BooleanToggle" | "Dropdown" | "TextInput"; dropdownOptions: string[] | null;
	toBeValue: string | boolean | null; asIsValue: string | boolean | null;
	isTarget: boolean; isExempt: boolean; status: GapStatus;
	gapSeverity?: GapSeverity; gapDirection?: "under" | "over" | null; gapDelta?: number;
}

interface GroupedComparison {
	elementId: string; elementName: string; elementType: string; items: ComparisonItem[];
	gapCount: number; overCount: number; unassessedCount: number; alignedCount: number;
}

function parseBpmnTemplate(template: string): { inputType: "BooleanToggle" | "Dropdown" | "TextInput"; options: string[] | null } {
	if (!template) return { inputType: "BooleanToggle", options: null };
	if (template.startsWith("Dropdown")) {
		const m = template.match(/\[(.*?)\]/);
		const opts = m ? m[1].split(",").map(s => s.trim()) : [];
		return { inputType: "Dropdown", options: opts.length > 0 ? opts : null };
	}
	if (template.startsWith("TextInput")) return { inputType: "TextInput", options: null };
	return { inputType: "BooleanToggle", options: null };
}

const SEV_ORDER: Record<string, number> = { critical: 0, major: 1, minor: 2, info: 3 };
const STAT_ORDER: Record<string, number> = { gap: 0, unassessed: 1, over: 2, aligned: 3, exempt: 4, na: 5 };

function sortItems(items: ComparisonItem[]): ComparisonItem[] {
	return [...items].sort((a, b) => {
		const sa = STAT_ORDER[a.status] ?? 99, sb = STAT_ORDER[b.status] ?? 99;
		if (sa !== sb) return sa - sb;
		if (a.status === "gap" && b.status === "gap") return (SEV_ORDER[a.gapSeverity ?? "minor"] ?? 99) - (SEV_ORDER[b.gapSeverity ?? "minor"] ?? 99);
		if (a.category !== b.category) return a.category.localeCompare(b.category);
		return a.externalId.localeCompare(b.externalId);
	});
}

export default function ComparisonView() {
	const activeBusinessProcessId = useAtomValue(businessProcessIdAtom);
	const auditAssessments = useAtomValue(auditAssessmentsAtom);
	const answeredRequirements = useAtomValue(answeredComplianceRequirementsAtom);
	const [toBeId, setToBeId] = useState<number | null>(null);
	const [asIsId, setAsIsId] = useState<number | null>(null);
	const [toBeAnswers, setToBeAnswers] = useState<AnsweredComplianceRequirement[]>([]);
	const [asIsAnswers, setAsIsAnswers] = useState<AnsweredComplianceRequirement[]>([]);
	const [loading, setLoading] = useState(false);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<"all" | "gaps" | "over">("all");

	useEffect(() => {
		const pa = auditAssessments.filter(a => a.processId === activeBusinessProcessId);
		const tb = pa.filter(a => a.auditType === "To-Be");
		const ai = pa.filter(a => a.auditType === "As-Is");
		if (tb.length > 0 && (!toBeId || !tb.some(a => a.id === toBeId))) setToBeId(tb[tb.length - 1].id);
		else if (tb.length === 0) setToBeId(null);
		if (ai.length > 0 && (!asIsId || !ai.some(a => a.id === asIsId))) setAsIsId(ai[ai.length - 1].id);
		else if (ai.length === 0) setAsIsId(null);
	}, [auditAssessments, activeBusinessProcessId]);

	const fetchValues = async () => {
		if (!toBeId && !asIsId) { setToBeAnswers([]); setAsIsAnswers([]); return; }
		setLoading(true);
		try {
			const p: Promise<AnsweredComplianceRequirement[]>[] = [];
			p.push(toBeId ? fetchValuesForAssessment(toBeId) : Promise.resolve([]));
			p.push(asIsId ? fetchValuesForAssessment(asIsId) : Promise.resolve([]));
			const [t, a] = await Promise.all(p); setToBeAnswers(t); setAsIsAnswers(a);
		} catch (e) { console.error(e); } finally { setLoading(false); }
	};
	useEffect(() => { fetchValues(); }, [toBeId, asIsId, answeredRequirements]);

	const create = async (type: "To-Be" | "As-Is") => {
		setLoading(true);
		try { const id = await createAuditAssessment(type); if (type === "To-Be") setToBeId(id); else setAsIsId(id); await reloadStore(); }
		catch (e) { console.error(e); } finally { setLoading(false); }
	};

	const nv = (v: string | boolean | null | undefined): string | boolean | null => {
		if (v === "true" || v === true) return true;
		if (v === "false" || v === false) return false;
		if (v === null || v === undefined || v === "") return null;
		return v;
	};

	const data = useMemo(() => {
		const el = getElementsWithQuestions(); const r: GroupedComparison[] = [];
		for (const e of el) {
			const reqs = getComplianceRequirementsForElement(e.type); if (!reqs.length) continue;
			const items: ComparisonItem[] = []; let gc = 0, oc = 0, uc = 0, ac = 0;
			for (const req of reqs) {
				const { inputType, options } = parseBpmnTemplate(req.bpmn_template);
				const ta = toBeAnswers.find(a => a.elementId === e.id && a.requirementId === req.id);
				const aa = asIsAnswers.find(a => a.elementId === e.id && a.requirementId === req.id);
				const nt = nv(ta?.value), na = nv(aa?.value);
				let status: GapStatus = "na", sev: GapSeverity | undefined, dir: "under" | "over" | null = null, del: number | undefined;
				const xf = nt === false, tg = nt !== null && nt !== false && nt !== undefined;
				if (!tg && !xf) status = "na";
				else if (xf) status = "exempt";
				else if (na === null || na === undefined) { status = "unassessed"; uc++; }
				else if (inputType === "BooleanToggle") {
					if (na === true) { status = "aligned"; ac++; } else { status = "gap"; sev = "critical"; gc++; }
				} else if (inputType === "Dropdown" && options && options.length) {
					const ti = options.indexOf(String(nt)), ai = options.indexOf(String(na));
					if (ti === -1 || ai === -1) { if (nt === na || String(nt) === String(na)) { status = "aligned"; ac++; } else { status = "gap"; sev = "minor"; gc++; } }
					else if (ti === ai) { status = "aligned"; ac++; }
					else if (ai < ti) { status = "gap"; dir = "under"; del = ti - ai; sev = del >= 2 ? "major" : "minor"; gc++; }
					else { status = "over"; dir = "over"; del = ai - ti; sev = "info"; oc++; }
				} else {
					if (String(nt).trim().toLowerCase() === String(na).trim().toLowerCase()) { status = "aligned"; ac++; }
					else { status = "gap"; sev = "minor"; gc++; }
				}
				items.push({ requirementId: req.id, externalId: req.external_id, label: req.bpmn_annotation, category: req.category, subcategory: req.subcategory, inputType, dropdownOptions: options, toBeValue: ta?.value ?? null, asIsValue: aa?.value ?? null, isTarget: tg, isExempt: xf, status, gapSeverity: sev, gapDirection: dir, gapDelta: del });
			}
			r.push({ elementId: e.id, elementName: e.name, elementType: e.type, items: sortItems(items), gapCount: gc, overCount: oc, unassessedCount: uc, alignedCount: ac });
		}
		return r;
	}, [toBeAnswers, asIsAnswers]);

	const filtered = useMemo(() => {
		return data.map(g => {
			const fi = g.items.filter(i => {
				if (search) { const q = search.toLowerCase(); if (!i.requirementId.toLowerCase().includes(q) && !i.label.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q)) return false; }
				if (filter === "gaps") return i.status === "gap";
				if (filter === "over") return i.status === "over";
				return true;
			});
			return { ...g, items: fi };
		}).filter(g => g.items.length > 0);
	}, [data, search, filter]);

	const stats = useMemo(() => {
		let tt = 0, al = 0, gp = 0, ov = 0, un = 0, ex = 0;
		for (const g of data) for (const i of g.items) {
			if (i.isTarget) { tt++; if (i.status === "aligned") al++; else if (i.status === "gap") gp++; else if (i.status === "over") ov++; else if (i.status === "unassessed") un++; }
			else if (i.isExempt) ex++;
		}
		return { tt, al, gp, ov, un, ex, cov: tt > 0 ? Math.round((al / tt) * 100) : 0 };
	}, [data]);

	const pa = auditAssessments.filter(a => a.processId === activeBusinessProcessId);
	const tbo = pa.filter(a => a.auditType === "To-Be");
	const aio = pa.filter(a => a.auditType === "As-Is");

	if (!activeBusinessProcessId) return (
		<div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#fafafa] font-sans">
			<div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white border border-[#ebebeb] mb-4"><Info className="w-6 h-6 text-[#666666]" /></div>
			<h3 className="text-sm font-semibold text-[#171717] mb-1">No Business Process Selected</h3>
			<p className="text-xs text-[#666666] max-w-sm">Select or import a business process model.</p>
		</div>
	);
	if (!tbo.length || !aio.length) return (
		<div className="flex flex-col items-center justify-center h-full p-8 bg-[#fafafa] font-sans">
			<div className="max-w-md w-full bg-white p-6 rounded-lg border border-[#ebebeb] shadow-xs flex flex-col items-center text-center">
				<div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 mb-4"><Warning className="w-5 h-5" /></div>
				<h2 className="text-sm font-bold text-[#171717] tracking-wide mb-1">Assessments Required</h2>
				<p className="text-xs text-[#666666] mb-6 leading-relaxed">Both a <strong>To-Be</strong> and an <strong>As-Is</strong> session are needed for comparison.</p>
				<div className="flex flex-col gap-3 w-full">
					{!tbo.length && <button onClick={() => create("To-Be")} disabled={loading} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#171717] text-white hover:bg-black rounded-md"><Plus className="w-3.5 h-3.5" />Create To-Be Session</button>}
					{!aio.length && <button onClick={() => create("As-Is")} disabled={loading} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#171717] text-white hover:bg-black rounded-md"><Plus className="w-3.5 h-3.5" />Create As-Is Session</button>}
				</div>
			</div>
		</div>
	);

	return (
		<div className="h-full overflow-y-auto bg-white text-[#171717] font-sans">
			<style>{`
				.gap-row td { border-bottom: 0.5px solid #ebebeb; }
				.gap-row:last-child td { border-bottom: none; }
				.mono { font-family: 'Geist Mono','Courier New',monospace; font-size: 11px; }
			`}</style>
			<div className="max-w-3xl mx-auto px-6 py-6">
				<div className="flex items-center justify-end gap-2 text-xs mb-4">
						<span className="text-[#666666]">Target:</span>
						<select value={toBeId || ""} onChange={e => setToBeId(parseInt(e.target.value, 10))} className="bg-transparent border-b border-dashed border-[#171717] font-bold outline-none cursor-pointer">
							{tbo.map((o, i) => {
								const label = tbo.length > 1 ? `To-Be ${i + 1}` : "To-Be";
								return <option key={o.id} value={o.id}>{label}</option>;
							})}
						</select>
						<span className="text-[#ccc]">·</span>
						<span className="text-[#666666]">Actual:</span>
						<select value={asIsId || ""} onChange={e => setAsIsId(parseInt(e.target.value, 10))} className="bg-transparent border-b border-dashed border-[#171717] font-bold outline-none cursor-pointer">
							{aio.map((o, i) => {
								const label = aio.length > 1 ? `As-Is ${i + 1}` : "As-Is";
								return <option key={o.id} value={o.id}>{label}</option>;
							})}
						</select>
					</div>

				<div className="flex items-center justify-between gap-4 mb-4 border-b border-[#ebebeb] pb-2">
					<div className="flex items-center gap-3 text-[10px] font-bold">
						<span>{stats.tt} targets</span>
						<span className="w-[1px] h-3 bg-[#e5e5e5]" />
						<span className="text-[#b91c1c]">{stats.gp} gaps</span>
						<span className="w-[1px] h-3 bg-[#e5e5e5]" />
						<span className="text-[#15803d]">{stats.ov} over</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="relative mr-2">
							<MagnifyingGlass className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-[#ccc]" />
							<input placeholder="Filter..." value={search} onChange={e => setSearch(e.target.value)} className="w-24 pl-6 pr-2 py-0.5 text-[10px] rounded border border-[#e5e5e5] outline-none bg-[#fafafa]" />
						</div>
						{["All", "Gaps", "Over"].map(k => (
							<button key={k} onClick={() => setFilter(k.toLowerCase() as typeof filter)}
								className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors"
								style={filter === k.toLowerCase() ? { color: k === "Gaps" ? "#b91c1c" : k === "Over" ? "#15803d" : "#171717", background: "#fafafa", fontWeight: 700 } : { color: "#999" }}>
								{k} {k === "All" ? stats.tt + stats.ex : k === "Gaps" ? stats.gp : stats.ov}
							</button>
						))}
					</div>
				</div>

				{loading ? (
					<div className="flex flex-col items-center justify-center py-16">
						<div className="w-5 h-5 border-2 border-[#e5e5e5] border-t-[#171717] rounded-full animate-spin mb-2" />
						<p className="text-[10px] text-[#999]">Comparing...</p>
					</div>
				) : filtered.length > 0 ? (
					<div className="space-y-6">
						{filtered.map(g => {
							const ax = g.items.filter(i => i.status !== "na");
							return (
								<div key={g.elementId} className="bg-white rounded-lg border border-[#ebebeb] overflow-hidden" style={{ boxShadow: "rgba(0,0,0,0.04) 0px 1px 3px" }}>
									<div className="flex items-center gap-2 px-4 py-2 bg-[#fafafa] border-b border-[#ebebeb]">
										<TypeIcon type={g.elementType} />
										<span className="text-xs font-bold text-[#171717]">{g.elementName}</span>
										<div className="flex gap-3 ml-auto text-[10px] font-bold">
											{g.gapCount > 0 && <span className="text-[#b91c1c]">{g.gapCount} gap{g.gapCount > 1 ? "s" : ""}</span>}
											{g.overCount > 0 && <span className="text-[#15803d]">{g.overCount} over</span>}
											{g.unassessedCount > 0 && <span className="text-[#9ca3af]">{g.unassessedCount} pending</span>}
											{g.alignedCount > 0 && <span className="text-[#999]">{g.alignedCount}</span>}
										</div>
									</div>
									{ax.length > 0 ? (
										<table className="w-full table-fixed"><tbody>{ax.map(i => <Row key={i.requirementId} item={i} />)}</tbody></table>
									) : null}
								</div>
							);
						})}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<MagnifyingGlass className="w-4 h-4 text-[#ccc] mb-2" />
						<p className="text-[10px] text-[#999]">No matching items.</p>
					</div>
				)}
			</div>
		</div>
	);
}

function Row({ item }: { item: ComparisonItem }) {
	const ac = item.status === "gap" ? (item.gapSeverity === "critical" ? "#991b1b" : "#92400e") : item.status === "over" ? "#166534" : undefined;

	return (
		<tr className="gap-row hover:bg-[#fafafa]/50 transition-colors">
			<td className="py-1.5 pl-4 pr-2 w-[40%]">
				<span className="text-[10px] text-[#999] mono mr-1.5">{item.externalId}</span>
				<span className="font-bold text-[#171717] text-[11px]">{item.label}</span>
			</td>
			<td className="py-1.5 px-2 mono w-[27%]" style={{ color: ac, fontWeight: item.status === "gap" || item.status === "over" ? 600 : undefined }}>
				{item.status === "unassessed" ? "—" : fv(item.asIsValue)}
			</td>
			<td className="py-1.5 px-2 text-[#ccc] text-center w-6">→</td>
			<td className="py-1.5 pr-4 pl-2 mono font-semibold w-[27%]">{fv(item.toBeValue)}</td>
		</tr>
	);
}

function fv(v: string | boolean | null | undefined): string {
	if (v === true || v === "true") return "true";
	if (v === false || v === "false") return "false";
	if (v === null || v === undefined || v === "") return "—";
	return String(v);
}

function TypeIcon({ type }: { type: string }) {
	const cls = "shrink-0 text-[#999]";
	if (type.includes("Task")) return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={cls} aria-label="Task"><title>Task</title><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /></svg>;
	if (type.includes("Event")) return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={cls} aria-label="Event"><title>Event</title><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" /></svg>;
	if (type.includes("Participant")) return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={cls} aria-label="Pool"><title>Pool</title><rect x="2" y="6" width="20" height="12" stroke="currentColor" strokeWidth="2" /><line x1="6" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" /></svg>;
	if (type.includes("Lane")) return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={cls} aria-label="Lane"><title>Lane</title><rect x="2" y="4" width="20" height="16" stroke="currentColor" strokeWidth="2" /><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" /></svg>;
	return null;
}
