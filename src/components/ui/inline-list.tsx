"use client";

import { Plus, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

interface InlineListProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	onActivate?: () => void;
}

export function InlineList({
	value,
	onChange,
	placeholder = "Add reference",
	disabled = false,
	className,
	onActivate,
}: InlineListProps) {
	const items = value ? value.split(";").filter((c) => c.trim()) : [];
	const [adding, setAdding] = useState(false);
	const [editValue, setEditValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const pendingActivate = useRef(false);

	useEffect(() => {
		if (adding && inputRef.current) {
			inputRef.current.focus();
		}
	}, [adding]);

	useEffect(() => {
		if (!disabled && pendingActivate.current) {
			pendingActivate.current = false;
			setAdding(true);
		}
	}, [disabled]);

	const remove = (index: number) => {
		const next = items.filter((_, i) => i !== index);
		onChange(next.join(";"));
	};

	const commit = () => {
		const trimmed = editValue.trim();
		if (!trimmed) {
			setAdding(false);
			return;
		}
		if (items.includes(trimmed)) {
			setAdding(false);
			return;
		}
		const next = [...items, trimmed];
		onChange(next.join(";"));
		setEditValue("");
		setAdding(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			commit();
		}
		if (e.key === "Escape") {
			setAdding(false);
		}
	};

	const handleAddClick = () => {
		if (disabled) {
			pendingActivate.current = true;
			onActivate?.();
			return;
		}
		setAdding(true);
	};

	return (
		<div className={`space-y-1 ${className || ""}`}>
			{items.length > 0 && (
				<div className="space-y-0.5">
					{items.map((item, i) => (
						<div
							key={`${item}-${i}`}
							className="flex items-center justify-between h-8 group"
						>
							<span className="text-sm text-[#171717]">{item}</span>
							{!disabled && (
								<button
									type="button"
									onClick={() => remove(i)}
									className="p-0.5 text-[#808080] hover:text-[#171717] transition-colors"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
						</div>
					))}
				</div>
			)}

			{adding ? (
				<input
					ref={inputRef}
					type="text"
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={commit}
					placeholder={placeholder}
					className="w-full px-3 h-8 text-xs rounded-md"
					style={{
						background: "#ffffff",
						boxShadow: "rgba(0, 0, 0, 0.08) 0px 0px 0px 1px",
						outline: "none",
						border: "none",
					}}
				/>
			) : (
				<button
					type="button"
					onClick={handleAddClick}
					className="flex items-center gap-1 w-full h-8 px-3 text-xs text-[#808080] hover:text-[#171717] transition-colors rounded-md"
					style={{
						cursor: disabled ? "default" : "pointer",
						opacity: disabled ? 0.5 : 1,
					}}
				>
					<Plus className="w-3 h-3 shrink-0" />
					{items.length === 0 ? placeholder : "Add"}
				</button>
			)}
		</div>
	);
}
