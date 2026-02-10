import { describe, expect, it } from "vitest";
import { createGameSession } from "./session";

describe("createGameSession", () => {
	it("creates a default classic session", () => {
		const s = createGameSession({ seed: "seed-123" });
		expect(s.modeId).toBe("classic");
		expect(s.seed).toBe("seed-123");
	});
});
