import { describe, expect, it, beforeEach, vi } from "vitest";
import { saveCardDesign, loadCardDesign } from "./persistence";
import { DEFAULT_CARD_DESIGN } from "./types";
import type { CardDesign } from "./types";

describe("persistence", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe("saveCardDesign", () => {
		it("stores the design in localStorage", () => {
			const design: CardDesign = { backgroundColor: "#e3f2fd" };
			saveCardDesign(design);
			const raw = localStorage.getItem("taleTailCards.design");
			expect(raw).not.toBeNull();
			expect(JSON.parse(raw!)).toEqual(design);
		});

		it("overwrites a previously saved design", () => {
			saveCardDesign({ backgroundColor: "#aaa" });
			saveCardDesign({ backgroundColor: "#bbb" });
			const raw = localStorage.getItem("taleTailCards.design");
			expect(JSON.parse(raw!).backgroundColor).toBe("#bbb");
		});

		it("does not throw when localStorage is unavailable", () => {
			const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
				throw new Error("QuotaExceeded");
			});
			expect(() => saveCardDesign({ backgroundColor: "#fff" })).not.toThrow();
			spy.mockRestore();
		});
	});

	describe("loadCardDesign", () => {
		it("returns the default design when nothing is stored", () => {
			expect(loadCardDesign()).toEqual(DEFAULT_CARD_DESIGN);
		});

		it("returns the saved design", () => {
			const design: CardDesign = { backgroundColor: "#fce4ec" };
			saveCardDesign(design);
			expect(loadCardDesign()).toEqual(design);
		});

		it("returns the default when stored JSON is invalid", () => {
			localStorage.setItem("taleTailCards.design", "not-json");
			expect(loadCardDesign()).toEqual(DEFAULT_CARD_DESIGN);
		});

		it("returns the default when stored object lacks backgroundColor", () => {
			localStorage.setItem("taleTailCards.design", JSON.stringify({ foo: "bar" }));
			expect(loadCardDesign()).toEqual(DEFAULT_CARD_DESIGN);
		});

		it("does not throw when localStorage is unavailable", () => {
			const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
				throw new Error("SecurityError");
			});
			expect(() => loadCardDesign()).not.toThrow();
			expect(loadCardDesign()).toEqual(DEFAULT_CARD_DESIGN);
			spy.mockRestore();
		});
	});
});
