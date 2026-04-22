import { describe, it, expect } from "bun:test";
import { user, session, account, verification } from "../src/db/schema";

describe("user table schema", () => {
  it("should export a valid table object", () => {
    expect(user).toBeDefined();
    expect(typeof user).toBe("object");
  });

  it("should have id column", () => {
    expect("id" in user).toBe(true);
    expect(user.id.notNull).toBe(true);
  });

  it("should have name column as not null", () => {
    expect("name" in user).toBe(true);
    expect(user.name.notNull).toBe(true);
  });

  it("should have email column as not null", () => {
    expect("email" in user).toBe(true);
    expect(user.email.notNull).toBe(true);
  });
});

describe("session table schema", () => {
  it("should export a valid table object", () => {
    expect(session).toBeDefined();
    expect(typeof session).toBe("object");
  });

  it("should have required columns", () => {
    expect("id" in session).toBe(true);
    expect("userId" in session).toBe(true);
    expect("token" in session).toBe(true);
    expect("expiresAt" in session).toBe(true);
  });
});

describe("account table schema", () => {
  it("should export a valid table object", () => {
    expect(account).toBeDefined();
    expect(typeof account).toBe("object");
  });

  it("should have required columns", () => {
    expect("id" in account).toBe(true);
    expect("userId" in account).toBe(true);
    expect("providerId" in account).toBe(true);
  });
});

describe("verification table schema", () => {
  it("should export a valid table object", () => {
    expect(verification).toBeDefined();
    expect(typeof verification).toBe("object");
  });

  it("should have required columns", () => {
    expect("id" in verification).toBe(true);
    expect("identifier" in verification).toBe(true);
    expect("value" in verification).toBe(true);
  });
});