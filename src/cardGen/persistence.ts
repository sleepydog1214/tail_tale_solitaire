import type { CardDesign } from "./types";
import { DEFAULT_CARD_DESIGN } from "./types";

const STORAGE_KEY = "taleTailCards.design";

export function saveCardDesign(design: CardDesign): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
	} catch {
		// Silently ignore storage errors (quota, private mode, etc.)
	}
}

export function loadCardDesign(): CardDesign {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return DEFAULT_CARD_DESIGN;
		const parsed = JSON.parse(raw) as Partial<CardDesign>;
		if (typeof parsed.backgroundColor === "string") {
			return { backgroundColor: parsed.backgroundColor };
		}
		return DEFAULT_CARD_DESIGN;
	} catch {
		return DEFAULT_CARD_DESIGN;
	}
}
