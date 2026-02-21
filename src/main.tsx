import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const isNativeCapacitor =
	typeof window !== "undefined" &&
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	!!(window as any).Capacitor?.isNativePlatform?.();

async function disableServiceWorkersOnNative(): Promise<boolean> {
	if (!isNativeCapacitor) return false;
	if (!("serviceWorker" in navigator)) return false;

	try {
		const regs = await navigator.serviceWorker.getRegistrations();
		if (regs.length === 0) return false;
		await Promise.all(regs.map((r) => r.unregister()));
		return true;
	} catch {
		// ignore
		return false;
	}

	// Best-effort cache purge to avoid stale SW-controlled shells.
	try {
		if ("caches" in window) {
			const keys = await caches.keys();
			await Promise.all(keys.map((k) => caches.delete(k)));
		}
	} catch {
		// ignore
	}

	return true;
}

class RootErrorBoundary extends React.Component<
	React.PropsWithChildren,
	{ error: unknown }
> {
	state: { error: unknown } = { error: null };

	static getDerivedStateFromError(error: unknown) {
		return { error };
	}

	componentDidCatch(error: unknown) {
		console.error("[FATAL] React render error", error);
	}

	render() {
		if (this.state.error) {
			return (
				<pre style={{ whiteSpace: "pre-wrap", padding: 12, margin: 0, color: "#b00020" }}>
					{this.state.error instanceof Error
						? `${this.state.error.name}: ${this.state.error.message}\n${this.state.error.stack ?? ""}`
						: String(this.state.error)}
				</pre>
			);
		}
		return this.props.children;
	}
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<RootErrorBoundary>
			<App />
		</RootErrorBoundary>
	</React.StrictMode>
);

async function bootstrap() {
	const didDisable = await disableServiceWorkersOnNative();
	if (!didDisable) return;

	try {
		const key = "__native_sw_disabled_once";
		if (sessionStorage.getItem(key) !== "1") {
			sessionStorage.setItem(key, "1");
			location.reload();
		}
	} catch {
		// ignore
	}
}

// Ensure SW cleanup runs and (if needed) reloads once.
void bootstrap();
