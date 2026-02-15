import React, { useMemo, useState } from "react";
import {
	COLOR_PALETTE,
	generateCardFrontSvg,
	generateCardBackSvg,
	svgToDataUri,
} from "./cardGen";
import type { CardDesign } from "./cardGen";

interface CardDesignerProps {
	currentDesign: CardDesign;
	onApply: (design: CardDesign) => void;
	onCancel: () => void;
}

const PREVIEW_CARDS: Array<{ suit: "H" | "D" | "C" | "S"; rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 }> = [
	{ suit: "H", rank: 1 },
	{ suit: "S", rank: 13 },
	{ suit: "D", rank: 10 },
	{ suit: "C", rank: 7 },
];

export function CardDesigner(props: CardDesignerProps) {
	const { currentDesign, onApply, onCancel } = props;
	const [selectedColor, setSelectedColor] = useState(currentDesign.backgroundColor);

	const previewDesign: CardDesign = useMemo(
		() => ({ backgroundColor: selectedColor }),
		[selectedColor]
	);

	const previewFronts = useMemo(
		() =>
			PREVIEW_CARDS.map((c) => ({
				...c,
				uri: svgToDataUri(generateCardFrontSvg(c.suit, c.rank, previewDesign)),
			})),
		[previewDesign]
	);

	const previewBack = useMemo(
		() => svgToDataUri(generateCardBackSvg(previewDesign)),
		[previewDesign]
	);

	return (
		<div className="designer">
			<h2 className="designerTitle">Tail Tale Cards</h2>

			<div className="designerSection">
				<h3 className="designerLabel">Card Background</h3>
				<div className="colorPalette" role="radiogroup" aria-label="Card background color">
					{COLOR_PALETTE.map((color) => (
						<button
							key={color}
							className={`colorSwatch${selectedColor === color ? " selected" : ""}`}
							style={{ backgroundColor: color }}
							onClick={() => setSelectedColor(color)}
							aria-label={`Color ${color}`}
							aria-checked={selectedColor === color}
							role="radio"
						/>
					))}
				</div>
			</div>

			<div className="designerSection">
				<h3 className="designerLabel">Preview</h3>
				<div className="designerPreview">
					{previewFronts.map((c) => (
						<img
							key={`${c.rank}${c.suit}`}
							className="previewCard"
							src={c.uri}
							alt={`${c.rank} of ${c.suit}`}
						/>
					))}
					<img className="previewCard" src={previewBack} alt="Card back" />
				</div>
			</div>

			<div className="designerActions">
				<button onClick={() => onApply({ backgroundColor: selectedColor })}>
					Apply
				</button>
				<button onClick={onCancel}>Cancel</button>
			</div>
		</div>
	);
}
