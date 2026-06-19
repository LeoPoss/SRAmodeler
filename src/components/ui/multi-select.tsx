"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useState } from "react";

interface MultiSelectProps {
	value: string;
	onChange: (value: string) => void;
	options: string[];
	placeholder?: string;
}

export function MultiSelect({
	value,
	onChange,
	options,
	placeholder = "Select...",
}: MultiSelectProps) {
	const currentValues = value ? value.split(";").filter((v) => v.trim()) : [];
	const [isOpen, setIsOpen] = useState(false);

	const toggleOption = (option: string) => {
		const newValues = currentValues.includes(option)
			? currentValues.filter((v) => v !== option)
			: [...currentValues, option];
		onChange(newValues.join(";"));
	};

	const removeValue = (option: string) => {
		const newValues = currentValues.filter((v) => v !== option);
		onChange(newValues.join(";"));
	};

	return (
		<div className="space-y-2">
			{currentValues.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{currentValues.map((val) => (
						<span
							key={val}
							className="inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-md"
							style={{ background: "#171717", color: "#ffffff" }}
						>
							{val}
							<button
								type="button"
								onClick={() => removeValue(val)}
								className="ml-1 hover:opacity-70"
							>
								×
							</button>
						</span>
					))}
				</div>
			)}

			<div className="relative">
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left"
					style={{
						background: "#ffffff",
						boxShadow: "rgba(0, 0, 0, 0.08) 0px 0px 0px 1px",
						color: currentValues.length === 0 ? "#808080" : "#171717",
					}}
				>
					<span>
						{currentValues.length === 0
							? placeholder
							: `${currentValues.length} selected`}
					</span>
					<CaretDown
						className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
						style={{ color: "#666666" }}
					/>
				</button>

				{isOpen && (
					<div
						className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-48 overflow-y-auto"
						style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
					>
						{options.map((option) => (
							<button
								key={option}
								type="button"
								onClick={() => toggleOption(option)}
								className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${currentValues.includes(option) ? "" : ""}`}
								style={{
									background: currentValues.includes(option)
										? "#fafafa"
										: "#ffffff",
									color: "#171717",
								}}
							>
								<span
									className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${currentValues.includes(option) ? "" : ""}`}
									style={{
										background: currentValues.includes(option)
											? "#171717"
											: "transparent",
										border: currentValues.includes(option)
											? "none"
											: "1px solid #ebebeb",
									}}
								>
									{currentValues.includes(option) && (
										<svg
											className="w-3 h-3 text-white"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											aria-hidden="true"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={3}
												d="M5 13l4 4L19 7"
											/>
										</svg>
									)}
								</span>
								{option}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
