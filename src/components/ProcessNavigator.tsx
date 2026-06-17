import type { ProcessElement } from "./HomeView";

function ProcessNavigator({
	elements,
	selected,
	onSelect,
	overallProgress,
}: {
	elements: ProcessElement[];
	selected: { id: string; name: string; type: string } | null;
	onSelect: (el: { id: string; name: string; type: string }) => void;
	overallProgress: { answered: number; total: number; percentage: number };
}) {
	const getTypeIcon = (type: string) => {
		if (type.includes("Task")) return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-label="Task"><title>Task</title><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /></svg>;
		if (type.includes("Event")) return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-label="Event"><title>Event</title><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" /></svg>;
		if (type.includes("Participant")) return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-label="Pool"><title>Pool</title><rect x="2" y="6" width="20" height="12" stroke="currentColor" strokeWidth="2" /><line x1="6" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" /></svg>;
		if (type.includes("Lane")) return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-label="Lane"><title>Lane</title><rect x="2" y="4" width="20" height="16" stroke="currentColor" strokeWidth="2" /><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" /></svg>;
		return null;
	};

	return (
		<div className="flex flex-col h-full">
			<div className="px-3 py-3" style={{ borderBottom: '1px solid #ebebeb' }}>
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-xs font-semibold text-[#666666]">Progress</h3>
					{overallProgress.total > 0 && (
						<span className={`text-xs font-medium ${overallProgress.percentage === 100 ? "text-[#22c55e]" : "text-[#666666]"}`}>
							{overallProgress.answered}/{overallProgress.total}
						</span>
					)}
				</div>
				{overallProgress.total > 0 && (
					<div className="flex items-center gap-2">
						<div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#fafafa' }}>
							<div
								className="h-full rounded-full transition-all"
								style={{
									width: `${overallProgress.percentage}%`,
									backgroundColor: overallProgress.percentage === 100 ? "#22c55e" : "#171717",
								}}
							/>
						</div>
						<span className="text-[10px] text-[#666666] tabular-nums">{overallProgress.percentage}%</span>
					</div>
				)}
			</div>
			<div className="flex-1 overflow-y-auto py-1">
				{elements.length === 0 ? (
					<p className="px-3 py-4 text-xs text-[#666666] text-center">
						No elements with requirements
					</p>
				) : (
					<div className="px-2">
						{elements.map((el, idx) => {
							const isSelected = selected?.id === el.id;
							const isComplete = el.answeredCount === el.totalCount && el.totalCount > 0;
							const progress = el.totalCount > 0 ? (el.answeredCount / el.totalCount) * 100 : 0;

							return (
								<button
									key={el.id}
									type="button"
									onClick={() => onSelect(el)}
									className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors ${
										isSelected
											? "bg-[#171717]/10 text-[#171717]"
											: "text-[#666666] hover:bg-[#fafafa] hover:text-[#171717]"
									}`}
								>
									<span className="text-xs font-mono text-[#666666]/60 w-4">{idx + 1}</span>
									<div className="text-[#171717]/70">{getTypeIcon(el.type)}</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate text-[#171717]">{el.name}</p>
										{progress > 0 && (
											<div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: '#fafafa' }}>
												<div
													className="h-full rounded-full transition-all"
													style={{
														width: `${progress}%`,
														backgroundColor: isComplete ? "#22c55e" : "#171717",
													}}
												/>
											</div>
										)}
									</div>
									{isComplete && (
										<span className="text-[#22c55e]">
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-label="Complete">
												<title>Complete</title>
												<path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</span>
									)}
								</button>
							);
						})}
					</div>
				)}
			</div>
			<div className="px-3 py-2 text-[10px] text-[#666666] text-center" style={{ borderTop: '1px solid #ebebeb' }}>
				<kbd className="px-1 py-0.5 mx-0.5 rounded font-mono" style={{ background: '#fafafa', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 0px 0px 1px' }}>←</kbd>
				<kbd className="px-1 py-0.5 mx-0.5 rounded font-mono" style={{ background: '#fafafa', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 0px 0px 1px' }}>→</kbd>
				<span className="ml-1">to navigate</span>
			</div>
		</div>
	);
}

export default ProcessNavigator;