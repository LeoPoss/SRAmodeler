"use client";

import { CaretRight, Minus, X } from "@phosphor-icons/react";
import { useAtomValue } from "jotai";
import { Fragment, useState } from "react";
import { BPMN_TYPES } from "#/lib/constants";
import { answeredComplianceRequirementsAtom, complianceRequirementsAtom } from "#/lib/store";
import type { ComplianceRequirement } from "#/lib/types";

const BPMN_TYPE_ICONS: Record<string, React.ReactNode> = {
	task: (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Task">
			<title>Task</title>
			<rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
		</svg>
	),
	message_event: (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Message Event">
			<title>Message Event</title>
			<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
			<path d="M7 10l5 3.5L17 10" stroke="currentColor" strokeWidth="2" />
		</svg>
	),
	pool: (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Pool">
			<title>Pool</title>
			<rect x="2" y="6" width="20" height="12" stroke="currentColor" strokeWidth="2" />
			<line x1="6" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" />
		</svg>
	),
	lane: (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Lane">
			<title>Lane</title>
			<rect x="2" y="4" width="20" height="16" stroke="currentColor" strokeWidth="2" />
			<line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
		</svg>
	),
};

interface GroupedRequirements {
	[category: string]: ComplianceRequirement[];
}

export default function ComplianceMatrix() {
	const answeredRequirements = useAtomValue(answeredComplianceRequirementsAtom);
	const requirements = useAtomValue(complianceRequirementsAtom);
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(Object.keys(requirements.reduce((acc, req) => {
			const cat = req.category || "General";
			acc[cat] = true;
			return acc;
		}, {} as Record<string, boolean>)))
	);

	const groupedRequirements: GroupedRequirements = requirements.reduce((acc, req) => {
		const category = req.category || "General";
		if (!acc[category]) acc[category] = [];
		acc[category].push(req);
		return acc;
	}, {} as GroupedRequirements);

	const toggleCategory = (category: string) => {
		const next = new Set(expandedCategories);
		if (next.has(category)) next.delete(category);
		else next.add(category);
		setExpandedCategories(next);
	};

	const isApplicable = (req: ComplianceRequirement, typeKey: string) => {
		return req.bpmn_mapping[typeKey as keyof typeof req.bpmn_mapping] === true;
	};

	return (
		<div className="w-full h-full overflow-auto p-6" style={{ background: '#ffffff' }}>
			<div className="max-w-6xl mx-auto">
				<div className="mb-6">
					<h2 className="text-xl font-semibold text-[#171717] mb-1" style={{ letterSpacing: '-0.96px' }}>Progress Matrix</h2>
				</div>

				<div className="flex flex-col gap-4">
					{Object.entries(groupedRequirements).map(([category, reqs]) => {
						const isExpanded = expandedCategories.has(category);
						const answeredCount = reqs.filter(r => {
							return answeredRequirements.some(a => a.requirementId === r.id);
						}).length;

						return (
							<div
								key={category}
								className="overflow-hidden"
								style={{
									borderRadius: '8px',
									boxShadow: 'rgba(0, 0, 0, 0.08) 0px 0px 0px 1px, rgba(0, 0, 0, 0.04) 0px 2px 2px, #fafafa 0px 0px 0px 1px'
								}}
							>
								<button
									type="button"
									onClick={() => toggleCategory(category)}
									className="w-full flex items-center justify-between px-5 py-4 transition-colors text-sm font-medium text-[#171717]"
									style={{ background: '#fafafa' }}
								>
									<span className="flex items-center gap-3">
										<CaretRight
											className={`w-4 h-4 text-[#666666] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
										/>
										{category}
									</span>
									<span
										className="text-xs px-3 py-1 font-medium"
										style={{
											borderRadius: '9999px',
											backgroundColor: answeredCount === reqs.length ? '#ecfdf5' : answeredCount > 0 ? '#fffbeb' : '#fafafa',
											color: answeredCount === reqs.length ? '#059669' : answeredCount > 0 ? '#d97706' : '#666666'
										}}
									>
										{reqs.length} requirements
									</span>
								</button>

								{isExpanded && (
									<div className="bg-white">
											<div
												className="grid gap-px"
												style={{
													gridTemplateColumns: '1fr repeat(4, 100px)',
												}}
											>
												<div
													className="px-4 py-3 text-xs font-medium text-[#666666]"
													style={{ background: '#fafafa' }}
												>
													Requirement
												</div>
												{BPMN_TYPES.map(type => (
													<div
														key={type.key}
														className="px-4 py-3 text-center"
														style={{ background: '#fafafa' }}
													>
														<div className="flex items-center justify-center gap-2 mb-1">
															<span style={{ color: type.color }}>{BPMN_TYPE_ICONS[type.key]}</span>
														</div>
														<span className="text-xs font-medium" style={{ color: type.color }}>
															{type.label}
														</span>
													</div>
												))}

											{reqs.map((req, idx) => (
												<Fragment key={req.id}>
													<div
														key={`${req.id}-req`}
														className="px-4 py-3"
														style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa/50' }}
													>
														<div className="flex items-center gap-2 mb-1">
															<span className="text-sm font-medium text-[#171717]">
																{req.bpmn_annotation}
															</span>
															{req.external_id && (
																<span className="text-[10px] font-mono text-[#808080]" style={{ background: '#fafafa', padding: '1px 4px', borderRadius: '3px' }}>
																	{req.external_id}
																</span>
															)}
														</div>
														<p className="text-xs text-[#666666] line-clamp-2 mb-2">
															{req.requirement}
														</p>
														<div className="flex items-center gap-2">
															<span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#ebf5ff', color: '#0068d6' }}>
																{req.subcategory || "General"}
															</span>
															<code className="text-[9px] text-[#808080] px-1.5 py-0.5 rounded" style={{ background: '#fafafa', fontFamily: "'Geist Mono', monospace" }}>
																{req.further_specification}
															</code>
															<code className="text-[9px] text-[#808080] px-1.5 py-0.5 rounded" style={{ background: '#fafafa', fontFamily: "'Geist Mono', monospace" }}>
																{req.bpmn_template}
															</code>
														</div>
													</div>
													{BPMN_TYPES.map(type => (
														<div
															key={`${req.id}-${type.key}`}
															className="px-4 py-3 flex items-center justify-center"
															style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa/50' }}
														>
															{isApplicable(req, type.key) ? (
																<div
																	className="w-6 h-6 rounded flex items-center justify-center"
																	style={{ background: '#171717' }}
																>
																	<X className="w-4 h-4 text-white" weight="bold" />
																</div>
															) : (
																<div
																	className="w-6 h-6 rounded flex items-center justify-center"
																	style={{ background: '#fafafa', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 0px 0px 1px' }}
																>
																	<Minus className="w-3 h-3 text-[#808080]" weight="bold" />
																</div>
															)}
														</div>
													))}
												</Fragment>
											))}
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>

				<div className="mt-6 flex items-center gap-6 text-xs text-[#666666]">
					<div className="flex items-center gap-2">
						<div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#171717' }}>
							<X className="w-3 h-3 text-white" weight="bold" />
						</div>
						<span>Applicable</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#fafafa', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 0px 0px 1px' }}>
							<Minus className="w-2 h-2 text-[#808080]" weight="bold" />
						</div>
						<span>Not applicable</span>
					</div>
				</div>
			</div>
		</div>
	);
}