import type { Suit, Rank } from "../KlondikeGame";

export interface CardDesign {
	backgroundColor: string;
}

export const DEFAULT_CARD_DESIGN: CardDesign = {
	backgroundColor: "#ffffff",
};

export const COLOR_PALETTE: string[] = [
	"#ffffff",  // White
	"#fce4ec",  // Soft Pink
	"#e3f2fd",  // Light Blue
	"#e8f5e9",  // Mint Green
	"#fff3e0",  // Peach
	"#f3e5f5",  // Lavender
	"#ffe0b2",  // Light Orange
	"#ffecb3",  // Pale Yellow
	"#b2dfdb",  // Teal
	"#d1c4e9",  // Purple
];

export type { Suit, Rank };
