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
  <div className="designer p-6 md:p-8 bg-white/95 backdrop-blur-none rounded-3xl shadow-2xl border border-pink-100/50 shadow-pink-500/20 max-w-4xl mx-auto">
   <h2 className="text-2xl md:text-3xl font-black mb-6 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">Card Designer</h2>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Left Column: Color Selection */}
				<div className="designerSection">
     <h3 className="text-lg font-semibold mb-3 text-pink-600 tracking-wide">Choose Background Color</h3>
     <div className="grid grid-cols-5 gap-3 p-5 rounded-2xl bg-gray-50 border-2 border-pink-200/40 shadow-inner" role="radiogroup" aria-label="Card background color">
  				{COLOR_PALETTE.map((color) => (
  					<button
  						key={color}
        className={`colorSwatch w-14 h-14 md:w-16 md:h-16 rounded-xl border-3 transition-all duration-200 hover:scale-110 active:scale-95 shadow-md ${selectedColor === color ? 'ring-4 ring-pink-500 border-pink-600 shadow-xl scale-105' : 'border-gray-300 hover:border-pink-300'}`}
  						style={{ backgroundColor: color }}
  						onClick={() => setSelectedColor(color)}
  						aria-label={`Color ${color}`}
  						aria-checked={selectedColor === color}
  						role="radio"
  					/>
  				))}
  			</div>
				</div>

				{/* Right Column: Live Preview */}
				<div className="designerSection">
     <h3 className="text-lg font-semibold mb-3 text-pink-600 tracking-wide">Live Preview</h3>
     <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-2xl border-2 border-pink-200/40 shadow-inner items-center justify-center min-h-[280px]">
      <div className="flex flex-wrap gap-4 justify-center items-center">
						{previewFronts.map((c) => (
							<img
								key={`${c.rank}${c.suit}`}
        className="w-18 h-auto md:w-24 shadow-lg rounded-lg border border-pink-200/30"
								src={c.uri}
								alt={`${c.rank} of ${c.suit}`}
							/>
						))}
       <img className="w-18 h-auto md:w-24 shadow-lg rounded-lg border border-pink-200/30" src={previewBack} alt="Card back" />
					</div>
     <p className="text-sm text-pink-400 text-center italic mt-2 font-medium">Cards update in real-time as you select colors</p>
					</div>
				</div>
			</div>

   <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-pink-200/50">
    <button
    					onClick={onCancel}
    					className="px-6 py-2.5 bg-white text-gray-700 font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-105 active:scale-100 transition-all duration-200 border-2 border-gray-300 hover:border-gray-400"
    				>
    					Cancel
    				</button>
    <button
					onClick={() => onApply({ backgroundColor: selectedColor })}
					className="designerApply px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-105 active:scale-100 transition-all duration-200"
				>
					Apply Design
				</button>
			</div>
		</div>
	);
}
