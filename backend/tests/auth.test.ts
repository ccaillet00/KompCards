import { describe, it, expect } from "bun:test";
import { auth } from "../src/lib/auth";

describe("Auth API", () => {
  it("should have signIn.email method available", async () => {
    expect(auth.api.signInEmail).toBeDefined();
    expect(typeof auth.api.signInEmail).toBe("function");
  });

  it("should have signUpEmail method available", async () => {
    expect(auth.api.signUpEmail).toBeDefined();
    expect(typeof auth.api.signUpEmail).toBe("function");
  });

  it("should have getSession method available", async () => {
    expect(auth.api.getSession).toBeDefined();
    expect(typeof auth.api.getSession).toBe("function");
  });
});
