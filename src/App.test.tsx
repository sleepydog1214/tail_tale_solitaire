import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestBackend } from "react-dnd-test-backend";
import { App } from "./App";
import { describe, expect, it } from "vitest";

function parseCount(labelText: string): number {
	const match = labelText.match(/\((\d+)\)/);
	if (!match) throw new Error(`No count in: ${labelText}`);
	return Number(match[1]);
}

describe("Tail Tale Solitaire navigation", () => {
	it("shows Home with New Game", () => {
		render(<App dndBackend={TestBackend} />);
		expect(
			screen.getByRole("heading", { name: /tail tale solitaire/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /new game/i })
		).toBeInTheDocument();
	});

	it("New Game starts the game", async () => {
		const user = userEvent.setup();
		render(<App dndBackend={TestBackend} />);

		await user.click(screen.getByRole("button", { name: /new game/i }));
		expect(screen.getByRole("button", { name: /finish/i })).toBeInTheDocument();
	});

	it("Finish stops the game and swaps to Home/New Game", async () => {
		const user = userEvent.setup();
		render(<App dndBackend={TestBackend} />);

		await user.click(screen.getByRole("button", { name: /new game/i }));

		const wasteBefore = parseCount(screen.getByText(/waste \(\d+\)/i).textContent ?? "");
		await user.click(screen.getByAltText(/stock/i));
		const wasteAfterDraw = parseCount(screen.getByText(/waste \(\d+\)/i).textContent ?? "");
		expect(wasteAfterDraw).toBeGreaterThanOrEqual(wasteBefore);

		await user.click(screen.getByRole("button", { name: /finish/i }));
		expect(screen.queryByRole("button", { name: /finish/i })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /^home$/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /new game/i })).toBeInTheDocument();

		// After finish, Stock clicks should no-op.
		const wasteAfterFinish = parseCount(screen.getByText(/waste \(\d+\)/i).textContent ?? "");
		await user.click(screen.getByAltText(/stock/i));
		const wasteAfterNoop = parseCount(screen.getByText(/waste \(\d+\)/i).textContent ?? "");
		expect(wasteAfterNoop).toBe(wasteAfterFinish);
	});

	it("Home returns to the home page", async () => {
		const user = userEvent.setup();
		render(<App dndBackend={TestBackend} />);

		await user.click(screen.getByRole("button", { name: /new game/i }));
		await user.click(screen.getByRole("button", { name: /finish/i }));
		await user.click(screen.getByRole("button", { name: /^home$/i }));

		expect(
			screen.getByRole("heading", { name: /tail tale solitaire/i })
		).toBeInTheDocument();
	});

	it("New Game from finished restarts a fresh game", async () => {
		const user = userEvent.setup();
		render(<App dndBackend={TestBackend} />);

		await user.click(screen.getByRole("button", { name: /new game/i }));
		await user.click(screen.getByRole("button", { name: /finish/i }));
		await user.click(screen.getByRole("button", { name: /new game/i }));

		expect(screen.getByRole("button", { name: /finish/i })).toBeInTheDocument();
	});

	it("top row order is Foundation, Waste, Stock (waste+stock on the right)", async () => {
		const user = userEvent.setup();
		const { container } = render(<App dndBackend={TestBackend} />);

		await user.click(screen.getByRole("button", { name: /new game/i }));

		const topRow = container.querySelector(".topRow")!;
		expect(topRow).toBeTruthy();

		// The first child of topRow should be .foundations
		const firstChild = topRow.children[0];
		expect(firstChild.classList.contains("foundations")).toBe(true);

		// The second child should be .leftTop (containing Waste then Stock)
		const secondChild = topRow.children[1];
		expect(secondChild.classList.contains("leftTop")).toBe(true);

		// Inside leftTop, Waste comes first, then Stock
		const pileTitles = secondChild.querySelectorAll(".pileTitle");
		expect(pileTitles.length).toBe(2);
		expect(pileTitles[0].textContent).toMatch(/waste/i);
		expect(pileTitles[1].textContent).toMatch(/stock/i);
	});
});
