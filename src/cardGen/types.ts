import type { Suit, Rank } from "../KlondikeGame";

export interface CardDesign {
	backgroundColor: string;
}

export const DEFAULT_CARD_DESIGN: CardDesign = {
	backgroundColor: "#ffffff",
};

export const COLOR_PALETTE: string[] = [
	"#ffffff",
	"#f8f0e3",
	"#e8f5e9",
	"#e3f2fd",
	"#fce4ec",
	"#fff3e0",
	"#f3e5f5",
	"#e0f7fa",
	"#fffde7",
	"#efebe9",
];

export type { Suit, Rank };
