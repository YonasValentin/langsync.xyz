import { describe, it, expect } from "vitest";
import { ApiError } from "./api-error";

describe("ApiError", () => {
  it("is an instance of Error", () => {
    const err = new ApiError("test");
    expect(err).toBeInstanceOf(Error);
  });

  it("has name set to ApiError", () => {
    const err = new ApiError("test");
    expect(err.name).toBe("ApiError");
  });

  it("stores message", () => {
    const err = new ApiError("something failed");
    expect(err.message).toBe("something failed");
  });

  it("stores optional statusCode", () => {
    const err = new ApiError("not found", 404);
    expect(err.statusCode).toBe(404);
  });

  it("stores optional endpoint", () => {
    const err = new ApiError("fail", 500, "/api/test");
    expect(err.endpoint).toBe("/api/test");
  });

  it("stores optional method", () => {
    const err = new ApiError("fail", 500, "/api/test", "POST");
    expect(err.method).toBe("POST");
  });

  it("stores optional details", () => {
    const details = { key: "value" };
    const err = new ApiError("fail", 500, "/api/test", "POST", details);
    expect(err.details).toEqual(details);
  });
});

// ============================================
// getUserMessage
// ============================================
describe("ApiError.getUserMessage", () => {
  it("returns custom message for 400", () => {
    const err = new ApiError("bad input", 400);
    expect(err.getUserMessage()).toBe("bad input");
  });

  it("returns fallback for 400 with empty message", () => {
    const err = new ApiError("", 400);
    expect(err.getUserMessage()).toBe(
      "Invalid request. Please check your input."
    );
  });

  it("returns fixed message for 401", () => {
    const err = new ApiError("unauthorized", 401);
    expect(err.getUserMessage()).toBe(
      "Your session has expired. Please log in again."
    );
  });

  it("returns fixed message for 403", () => {
    const err = new ApiError("forbidden", 403);
    expect(err.getUserMessage()).toBe(
      "You don't have permission to perform this action."
    );
  });

  it("returns fixed message for 404", () => {
    const err = new ApiError("not found", 404);
    expect(err.getUserMessage()).toBe(
      "The requested resource was not found."
    );
  });

  it("returns custom message for 409", () => {
    const err = new ApiError("duplicate entry", 409);
    expect(err.getUserMessage()).toBe("duplicate entry");
  });

  it("returns fallback for 409 with empty message", () => {
    const err = new ApiError("", 409);
    expect(err.getUserMessage()).toBe(
      "This action conflicts with existing data."
    );
  });

  it("returns custom message for 422", () => {
    const err = new ApiError("field X is required", 422);
    expect(err.getUserMessage()).toBe("field X is required");
  });

  it("returns fixed message for 500", () => {
    const err = new ApiError("db connection failed", 500);
    expect(err.getUserMessage()).toBe(
      "An unexpected error occurred. Please try again later."
    );
  });

  it("returns fixed message for 502", () => {
    const err = new ApiError("bad gateway", 502);
    expect(err.getUserMessage()).toBe(
      "The service is temporarily unavailable. Please try again later."
    );
  });

  it("returns fixed message for 503", () => {
    const err = new ApiError("unavailable", 503);
    expect(err.getUserMessage()).toBe(
      "The service is temporarily unavailable. Please try again later."
    );
  });

  it("returns message for unknown status code", () => {
    const err = new ApiError("custom error", 418);
    expect(err.getUserMessage()).toBe("custom error");
  });

  it("returns generic fallback for unknown status with empty message", () => {
    const err = new ApiError("", 418);
    expect(err.getUserMessage()).toBe("An error occurred. Please try again.");
  });

  it("returns message when no status code provided", () => {
    const err = new ApiError("something");
    expect(err.getUserMessage()).toBe("something");
  });
});

// ============================================
// getDebugContext
// ============================================
describe("ApiError.getDebugContext", () => {
  it("returns all context fields", () => {
    const err = new ApiError("fail", 500, "/api/v1/test", "POST", {
      id: "123",
    });
    const ctx = err.getDebugContext();

    expect(ctx).toEqual({
      message: "fail",
      statusCode: 500,
      endpoint: "/api/v1/test",
      method: "POST",
      details: { id: "123" },
    });
  });

  it("returns undefined for missing optional fields", () => {
    const err = new ApiError("oops");
    const ctx = err.getDebugContext();

    expect(ctx.message).toBe("oops");
    expect(ctx.statusCode).toBeUndefined();
    expect(ctx.endpoint).toBeUndefined();
    expect(ctx.method).toBeUndefined();
    expect(ctx.details).toBeUndefined();
  });
});
