import { describe, expect, it } from "vitest";
import { generateCardFrontSvg, generateCardBackSvg, svgToDataUri } from "./generateSvg";
import type { CardDesign } from "./types";
import { DEFAULT_CARD_DESIGN } from "./types";
import type { Suit, Rank } from "../KlondikeGame";

const SUITS: Suit[] = ["H", "D", "C", "S"];

describe("generateCardFrontSvg", () => {
	it("returns a valid SVG string with correct dimensions", () => {
		const svg = generateCardFrontSvg("H", 1, DEFAULT_CARD_DESIGN);
		expect(svg).toContain("<svg");
		expect(svg).toContain('viewBox="0 0 84 114"');
		expect(svg).toContain("</svg>");
	});

	it("uses the design background color", () => {
		const design: CardDesign = { backgroundColor: "#e3f2fd" };
		const svg = generateCardFrontSvg("S", 5, design);
		expect(svg).toContain('fill="#e3f2fd"');
	});

	it("renders red color for hearts and diamonds", () => {
		const svgH = generateCardFrontSvg("H", 7, DEFAULT_CARD_DESIGN);
		const svgD = generateCardFrontSvg("D", 3, DEFAULT_CARD_DESIGN);
		expect(svgH).toContain('fill="#cc0000"');
		expect(svgD).toContain('fill="#cc0000"');
	});

	it("renders black color for clubs and spades", () => {
		const svgC = generateCardFrontSvg("C", 9, DEFAULT_CARD_DESIGN);
		const svgS = generateCardFrontSvg("S", 2, DEFAULT_CARD_DESIGN);
		expect(svgC).toContain('fill="#111111"');
		expect(svgS).toContain('fill="#111111"');
	});

	it("displays correct rank labels for face cards", () => {
		const ace = generateCardFrontSvg("H", 1, DEFAULT_CARD_DESIGN);
		const jack = generateCardFrontSvg("H", 11, DEFAULT_CARD_DESIGN);
		const queen = generateCardFrontSvg("H", 12, DEFAULT_CARD_DESIGN);
		const king = generateCardFrontSvg("H", 13, DEFAULT_CARD_DESIGN);
		expect(ace).toContain(">A<");
		expect(jack).toContain(">J<");
		expect(queen).toContain(">Q<");
		expect(king).toContain(">K<");
	});

	it("displays numeric rank for number cards", () => {
		const svg = generateCardFrontSvg("C", 10, DEFAULT_CARD_DESIGN);
		expect(svg).toContain(">10<");
	});

	it("includes suit symbols", () => {
		const svgH = generateCardFrontSvg("H", 1, DEFAULT_CARD_DESIGN);
		const svgD = generateCardFrontSvg("D", 1, DEFAULT_CARD_DESIGN);
		const svgC = generateCardFrontSvg("C", 1, DEFAULT_CARD_DESIGN);
		const svgS = generateCardFrontSvg("S", 1, DEFAULT_CARD_DESIGN);
		expect(svgH).toContain("\u2665");
		expect(svgD).toContain("\u2666");
		expect(svgC).toContain("\u2663");
		expect(svgS).toContain("\u2660");
	});

	it("generates unique SVGs for all 52 cards", () => {
		const svgs = new Set<string>();
		for (const suit of SUITS) {
			for (let r = 1; r <= 13; r++) {
				svgs.add(generateCardFrontSvg(suit, r as Rank, DEFAULT_CARD_DESIGN));
			}
		}
		expect(svgs.size).toBe(52);
	});

	it("escapes special characters in background color", () => {
		const design: CardDesign = { backgroundColor: '"><script>' };
		const svg = generateCardFrontSvg("H", 1, design);
		expect(svg).not.toContain('"><script>');
		expect(svg).toContain("&quot;&gt;&lt;script&gt;");
	});

	it("includes rotated bottom-right corner", () => {
		const svg = generateCardFrontSvg("H", 1, DEFAULT_CARD_DESIGN);
		expect(svg).toContain('transform="rotate(180');
	});
});

describe("generateCardBackSvg", () => {
	it("returns a valid SVG string with correct dimensions", () => {
		const svg = generateCardBackSvg(DEFAULT_CARD_DESIGN);
		expect(svg).toContain("<svg");
		expect(svg).toContain('viewBox="0 0 84 114"');
		expect(svg).toContain("</svg>");
	});

	it("uses the design background color", () => {
		const design: CardDesign = { backgroundColor: "#fce4ec" };
		const svg = generateCardBackSvg(design);
		expect(svg).toContain('fill="#fce4ec"');
	});

	it("includes a crosshatch pattern", () => {
		const svg = generateCardBackSvg(DEFAULT_CARD_DESIGN);
		expect(svg).toContain("<pattern");
		expect(svg).toContain('id="crosshatch"');
		expect(svg).toContain('url(#crosshatch)');
	});

	it("produces different output than front cards", () => {
		const front = generateCardFrontSvg("H", 1, DEFAULT_CARD_DESIGN);
		const back = generateCardBackSvg(DEFAULT_CARD_DESIGN);
		expect(front).not.toBe(back);
	});
});

describe("svgToDataUri", () => {
	it("returns a data URI with svg+xml content type", () => {
		const svg = "<svg><rect/></svg>";
		const uri = svgToDataUri(svg);
		expect(uri).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
	});

	it("encodes the SVG content", () => {
		const svg = '<svg width="84" height="114"></svg>';
		const uri = svgToDataUri(svg);
		expect(uri).toContain(encodeURIComponent(svg));
	});

	it("round-trips correctly via decodeURIComponent", () => {
		const svg = generateCardFrontSvg("H", 1, DEFAULT_CARD_DESIGN);
		const uri = svgToDataUri(svg);
		const prefix = "data:image/svg+xml;charset=utf-8,";
		const decoded = decodeURIComponent(uri.slice(prefix.length));
		expect(decoded).toBe(svg);
	});
});
