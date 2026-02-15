import type { Suit, Rank, CardDesign } from "./types";

const CARD_WIDTH = 84;
const CARD_HEIGHT = 114;
const CORNER_RADIUS = 6;

const SUIT_SYMBOLS: Record<Suit, string> = {
	H: "\u2665",
	D: "\u2666",
	C: "\u2663",
	S: "\u2660",
};

const RANK_LABELS: Record<number, string> = {
	1: "A",
	11: "J",
	12: "Q",
	13: "K",
};

function rankLabel(rank: Rank): string {
	return RANK_LABELS[rank] ?? String(rank);
}

function suitColor(suit: Suit): string {
	return suit === "H" || suit === "D" ? "#cc0000" : "#111111";
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function generateCardFrontSvg(
	suit: Suit,
	rank: Rank,
	design: CardDesign
): string {
	const label = rankLabel(rank);
	const symbol = SUIT_SYMBOLS[suit];
	const color = suitColor(suit);
	const bg = escapeXml(design.backgroundColor);

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}">`,
		`<rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="${bg}"/>`,
		`<rect x="1" y="1" width="${CARD_WIDTH - 2}" height="${CARD_HEIGHT - 2}" rx="${CORNER_RADIUS - 1}" ry="${CORNER_RADIUS - 1}" fill="none" stroke="#888888" stroke-width="0.8"/>`,
		// Top-left corner: rank + suit
		`<text x="7" y="18" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="${color}" text-anchor="start">${escapeXml(label)}</text>`,
		`<text x="7" y="38" font-family="Arial,sans-serif" font-size="24" fill="${color}" text-anchor="start">${symbol}</text>`,
		// Center: large rank
		`<text x="${CARD_WIDTH / 2}" y="${CARD_HEIGHT / 2 + 16}" font-family="Arial,sans-serif" font-size="44" font-weight="700" fill="${color}" text-anchor="middle">${escapeXml(label)}</text>`,
		// Bottom-right corner: rank + suit (rotated 180°)
		`<g transform="rotate(180 ${CARD_WIDTH / 2} ${CARD_HEIGHT / 2})">`,
		`<text x="7" y="18" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="${color}" text-anchor="start">${escapeXml(label)}</text>`,
		`<text x="7" y="38" font-family="Arial,sans-serif" font-size="24" fill="${color}" text-anchor="start">${symbol}</text>`,
		`</g>`,
		`</svg>`,
	].join("");
}

export function generateCardBackSvg(design: CardDesign): string {
	const borderColor = "#555555";
	const patternColor = "#6b4c9a";
	const bgColor = escapeXml(design.backgroundColor);

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}">`,
		`<defs>`,
		`<pattern id="crosshatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`,
		`<line x1="0" y1="0" x2="0" y2="8" stroke="${patternColor}" stroke-width="2" opacity="0.4"/>`,
		`</pattern>`,
		`</defs>`,
		`<rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="${bgColor}"/>`,
		`<rect x="4" y="4" width="${CARD_WIDTH - 8}" height="${CARD_HEIGHT - 8}" rx="${CORNER_RADIUS - 2}" ry="${CORNER_RADIUS - 2}" fill="url(#crosshatch)"/>`,
		`<rect x="4" y="4" width="${CARD_WIDTH - 8}" height="${CARD_HEIGHT - 8}" rx="${CORNER_RADIUS - 2}" ry="${CORNER_RADIUS - 2}" fill="none" stroke="${borderColor}" stroke-width="1"/>`,
		`<rect x="1" y="1" width="${CARD_WIDTH - 2}" height="${CARD_HEIGHT - 2}" rx="${CORNER_RADIUS - 1}" ry="${CORNER_RADIUS - 1}" fill="none" stroke="${borderColor}" stroke-width="0.8"/>`,
		`</svg>`,
	].join("");
}

export function svgToDataUri(svg: string): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
