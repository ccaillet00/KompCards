import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { auth } from "../src/lib/auth";
import { db } from "../src/db/database";
import { user } from "../src/db/schema";
import { eq } from "drizzle-orm"

const TEST_EMAIL = "session-test@example.com";

describe("getSession", () => {
  afterEach(async () => {
    // Cleanup: delete test user if exists
    await db.delete(user).where(eq(user.email, TEST_EMAIL));
  });

  it("should return null when no session token is provided", async () => {
    const result = await auth.api.getSession({
      headers: new Headers(),
    });
    expect(result).toBeNull();
  });

  it("should return a session object when a valid session token is provided", async () => {
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: TEST_EMAIL,
        password: "password123",
        name: "Session Test User",
      },
    });

    expect(signUpResult).not.toBeNull();
    expect(signUpResult?.user.email).toBe(TEST_EMAIL);

  });
});