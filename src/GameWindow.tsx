import { useEffect } from "react";

interface GameWindowProps {
	children: React.ReactNode;
	title: string;
}

/**
 * Wraps a screen in a desktop-style window frame with a title bar.
 * Sets the browser / native window document.title to match.
 *
 * When the app is later packaged as an Electron or Tauri .exe,
 * each screen will automatically show the correct title in the
 * OS title bar; the in-page title bar provides a consistent look
 * in both browser and native contexts.
 */
export function GameWindow({ children, title }: GameWindowProps) {
	useEffect(() => {
		document.title = title;
	}, [title]);

	return (
		<div className="appWindow">
			<div className="appWindowTitleBar">
				<span className="appWindowTitle">{title}</span>
			</div>
			<div className="appWindowContent">
				{children}
			</div>
		</div>
	);
}
