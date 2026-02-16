import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readJson<T>(relativePath: string): T {
	const absolutePath = resolve(process.cwd(), relativePath);
	return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

describe("Android build integration", () => {
	it("defines Android build scripts in package.json", () => {
		const pkg = readJson<{ scripts?: Record<string, string> }>("package.json");
		const scripts = pkg.scripts ?? {};

		expect(scripts["android:sync"]).toBe("npm run build && npx cap sync android");
		expect(scripts["android:open"]).toBe("npx cap open android");
		expect(scripts["android:build"]).toBe(
			"npm run android:sync && cd android && gradlew.bat assembleDebug"
		);
	});

	it("has a valid Capacitor config for Android web assets", () => {
		const config = readJson<{
			appId: string;
			appName: string;
			webDir: string;
			bundledWebRuntime: boolean;
		}>("capacitor.config.json");

		expect(config.appId).toBe("com.tailtale.solitaire");
		expect(config.appName).toBe("Tail Tale Solitaire");
		expect(config.webDir).toBe("dist");
		expect(config.bundledWebRuntime).toBe(false);
	});

	it("contains required Android project entry points", () => {
		expect(existsSync(resolve(process.cwd(), "android/gradlew.bat"))).toBe(true);
		expect(existsSync(resolve(process.cwd(), "android/app/build.gradle"))).toBe(true);
		expect(
			existsSync(resolve(process.cwd(), "android/app/src/main/java/com/tailtale/solitaire/MainActivity.java"))
		).toBe(true);
	});
});
