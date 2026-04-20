import { describe, it, expect } from "bun:test";
import { auth } from "../src/lib/auth";

describe("getSession", () => {
  it("should return null when no session token is provided", async () => {
    const result = await auth.api.getSession({
      headers: new Headers(),
    });

    expect(result).toBeNull();
  });

  it("should return a session object when a valid session token is provided", async () => {
    // First, create a user to get a valid session
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: "session-test@example.com",
        password: "password123",
        name: "Session Test User",
      },
    });

    expect(signUpResult).not.toBeNull();
    expect(signUpResult?.user.email).toBe("session-test@example.com");

    // Now get the session using the session token from sign up
    const headers = new Headers();
    headers.set(
      "cookie",
      `${signUpResult?.session.sessionToken}`
    );

    const sessionResult = await auth.api.getSession({
      headers,
    });

    expect(sessionResult).not.toBeNull();
    expect(sessionResult?.user.email).toBe("session-test@example.com");
  });
});
