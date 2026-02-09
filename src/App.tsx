import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { SolitaireBoard } from "./SolitaireBoard";

export function App() {
	return (
		<DndProvider backend={HTML5Backend}>
			<SolitaireBoard seed={"demo-seed"} />
		</DndProvider>
	);
}
