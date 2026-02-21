import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Must be imported dynamically to control NODE_ENV
describe("logger", () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("in development mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("logs info with console.log", async () => {
      // Re-import to pick up env
      const { logger } = await import("./logger");
      logger.info("test message");
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "[INFO]",
        "test message",
        expect.anything()
      );
    });

    it("logs warn with console.warn", async () => {
      const { logger } = await import("./logger");
      logger.warn("warning message");
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        "[WARN]",
        "warning message",
        expect.anything()
      );
    });

    it("logs error with console.error", async () => {
      const { logger } = await import("./logger");
      logger.error("error message");
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "[ERROR]",
        "error message",
        expect.anything()
      );
    });

    it("passes context to console in dev mode", async () => {
      const { logger } = await import("./logger");
      const context = { userId: "123", action: "test" };
      logger.info("with context", context);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "[INFO]",
        "with context",
        context
      );
    });

    it("passes empty string when no context in dev mode", async () => {
      const { logger } = await import("./logger");
      logger.info("no context");
      expect(consoleSpy.log).toHaveBeenCalledWith("[INFO]", "no context", "");
    });
  });

  describe("in production mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("logs as JSON via console.log for info", async () => {
      const { logger } = await import("./logger");
      logger.info("prod info");
      expect(consoleSpy.log).toHaveBeenCalled();
      const arg = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(arg);
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("prod info");
      expect(parsed.timestamp).toBeDefined();
    });

    it("logs as JSON via console.log for error (still console.log in prod)", async () => {
      const { logger } = await import("./logger");
      logger.error("prod error");
      expect(consoleSpy.log).toHaveBeenCalled();
      const arg = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(arg);
      expect(parsed.level).toBe("error");
      expect(parsed.message).toBe("prod error");
    });

    it("includes context in JSON output", async () => {
      const { logger } = await import("./logger");
      logger.info("with ctx", { key: "val" });
      const arg = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(arg);
      expect(parsed.key).toBe("val");
    });
  });
});
