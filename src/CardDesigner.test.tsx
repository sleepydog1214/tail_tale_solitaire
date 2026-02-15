import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CardDesigner } from "./CardDesigner";
import { DEFAULT_CARD_DESIGN, COLOR_PALETTE } from "./cardGen";

describe("CardDesigner", () => {
	it("renders the title", () => {
		render(
			<CardDesigner
				currentDesign={DEFAULT_CARD_DESIGN}
				onApply={vi.fn()}
				onCancel={vi.fn()}
			/>
		);
		expect(screen.getByText("Tale Tail Cards")).toBeInTheDocument();
	});

	it("renders all palette color swatches", () => {
		render(
			<CardDesigner
				currentDesign={DEFAULT_CARD_DESIGN}
				onApply={vi.fn()}
				onCancel={vi.fn()}
			/>
		);
		const swatches = screen.getAllByRole("radio");
		expect(swatches.length).toBe(COLOR_PALETTE.length);
	});

	it("marks the current design color as selected", () => {
		const design = { backgroundColor: COLOR_PALETTE[2] };
		render(
			<CardDesigner
				currentDesign={design}
				onApply={vi.fn()}
				onCancel={vi.fn()}
			/>
		);
		const selected = screen.getByRole("radio", { name: `Color ${COLOR_PALETTE[2]}` });
		expect(selected).toHaveAttribute("aria-checked", "true");
	});

	it("renders preview card images", () => {
		render(
			<CardDesigner
				currentDesign={DEFAULT_CARD_DESIGN}
				onApply={vi.fn()}
				onCancel={vi.fn()}
			/>
		);
		const images = screen.getAllByRole("img");
		// 4 front previews + 1 back preview
		expect(images.length).toBe(5);
	});

	it("calls onApply with the selected color when Apply is clicked", async () => {
		const user = userEvent.setup();
		const onApply = vi.fn();
		render(
			<CardDesigner
				currentDesign={DEFAULT_CARD_DESIGN}
				onApply={onApply}
				onCancel={vi.fn()}
			/>
		);

		// Select a different color
		const swatch = screen.getByRole("radio", { name: `Color ${COLOR_PALETTE[3]}` });
		await user.click(swatch);
		await user.click(screen.getByRole("button", { name: /apply/i }));

		expect(onApply).toHaveBeenCalledOnce();
		expect(onApply).toHaveBeenCalledWith({ backgroundColor: COLOR_PALETTE[3] });
	});

	it("calls onCancel when Cancel is clicked", async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();
		render(
			<CardDesigner
				currentDesign={DEFAULT_CARD_DESIGN}
				onApply={vi.fn()}
				onCancel={onCancel}
			/>
		);

		await user.click(screen.getByRole("button", { name: /cancel/i }));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("updates preview images when a new color is selected", async () => {
		const user = userEvent.setup();
		render(
			<CardDesigner
				currentDesign={DEFAULT_CARD_DESIGN}
				onApply={vi.fn()}
				onCancel={vi.fn()}
			/>
		);

		const images = screen.getAllByRole("img");
		const srcsBefore = images.map((img) => img.getAttribute("src"));

		// Click a different color
		const swatch = screen.getByRole("radio", { name: `Color ${COLOR_PALETTE[4]}` });
		await user.click(swatch);

		const imagesAfter = screen.getAllByRole("img");
		const srcsAfter = imagesAfter.map((img) => img.getAttribute("src"));

		// At least some sources should have changed
		const changed = srcsBefore.some((src, i) => src !== srcsAfter[i]);
		expect(changed).toBe(true);
	});

	it("applies the default color if Apply is clicked without changing selection", async () => {
		const user = userEvent.setup();
		const onApply = vi.fn();
		render(
			<CardDesigner
				currentDesign={DEFAULT_CARD_DESIGN}
				onApply={onApply}
				onCancel={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: /apply/i }));
		expect(onApply).toHaveBeenCalledWith(DEFAULT_CARD_DESIGN);
	});
});
