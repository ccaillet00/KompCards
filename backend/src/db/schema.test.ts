import { describe, it, expect } from "bun:test";
import { usersTable } from "./schema";

describe("usersTable schema", () => {
  it("should have correct table name", () => {
    expect(usersTable._.name).toBe("users");
  });

  it("should have id column as primary key", () => {
    const columns = usersTable._.columns;
    const idColumn = columns.find((col) => col.name === "id");
    expect(idColumn).toBeDefined();
    expect(idColumn?.primaryKey).toBe(true);
  });

  it("should have name column with length 255", () => {
    const columns = usersTable._.columns;
    const nameColumn = columns.find((col) => col.name === "name");
    expect(nameColumn).toBeDefined();
    expect(nameColumn?.notNull).toBe(true);
  });

  it("should have email column with length 255 and unique constraint", () => {
    const columns = usersTable._.columns;
    const emailColumn = columns.find((col) => col.name === "email");
    expect(emailColumn).toBeDefined();
    expect(emailColumn?.notNull).toBe(true);
  });

  it("should have age column as integer", () => {
    const columns = usersTable._.columns;
    const ageColumn = columns.find((col) => col.name === "age");
    expect(ageColumn).toBeDefined();
    expect(ageColumn?.notNull).toBe(true);
  });
});
