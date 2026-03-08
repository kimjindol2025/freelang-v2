/**
 * Phase 8: Struct System Tests
 */

import {
  StructManager,
  StructDefinition,
  StructValue,
  initializeSampleStructs,
  testStructSystem,
} from "../src/phase-8/struct-system";

describe("Phase 8: Struct System", () => {
  let manager: StructManager;

  beforeEach(() => {
    manager = new StructManager();
  });

  describe("Struct Definition", () => {
    test("should define a struct", () => {
      const def: StructDefinition = {
        name: "User",
        fields: [
          { name: "id", type: "number" },
          { name: "name", type: "string" },
        ],
      };

      manager.defineStruct(def);
      expect(manager.getStruct("User")).toBeDefined();
    });

    test("should list all structs", () => {
      manager.defineStruct({
        name: "User",
        fields: [{ name: "id", type: "number" }],
      });
      manager.defineStruct({
        name: "Post",
        fields: [{ name: "title", type: "string" }],
      });

      expect(manager.listStructs()).toEqual(["User", "Post"]);
    });

    test("should get struct type info", () => {
      manager.defineStruct({
        name: "Point",
        fields: [
          { name: "x", type: "number" },
          { name: "y", type: "number" },
        ],
      });

      const info = manager.getStructInfo("Point");
      expect(info?.name).toBe("Point");
      expect(info?.fieldCount).toBe(2);
      expect(info?.fields).toEqual(["x: number", "y: number"]);
    });
  });

  describe("Instance Creation", () => {
    beforeEach(() => {
      manager.defineStruct({
        name: "User",
        fields: [
          { name: "id", type: "number" },
          { name: "name", type: "string" },
          { name: "email", type: "string", optional: true },
        ],
      });
    });

    test("should create instance with all fields", () => {
      const user = manager.createInstance("User", {
        id: 1,
        name: "Alice",
        email: "alice@example.com",
      });

      expect(user._type).toBe("struct");
      expect(user._structName).toBe("User");
      expect(user.id).toBe(1);
      expect(user.name).toBe("Alice");
    });

    test("should create instance with optional fields omitted", () => {
      const user = manager.createInstance("User", {
        id: 2,
        name: "Bob",
      });

      expect(user.id).toBe(2);
      expect(user.name).toBe("Bob");
      expect(user.email).toBeNull();
    });

    test("should throw error for missing required field", () => {
      expect(() => {
        manager.createInstance("User", {
          id: 3,
          // missing name
        });
      }).toThrow("Required field 'name' not provided");
    });

    test("should throw error for nonexistent struct", () => {
      expect(() => {
        manager.createInstance("NonExistent", {});
      }).toThrow("Struct 'NonExistent' not found");
    });
  });

  describe("Field Access", () => {
    let user: StructValue;

    beforeEach(() => {
      manager.defineStruct({
        name: "User",
        fields: [
          { name: "id", type: "number" },
          { name: "name", type: "string" },
        ],
      });

      user = manager.createInstance("User", {
        id: 1,
        name: "Alice",
      });
    });

    test("should get field value", () => {
      expect(manager.getField(user, "id")).toBe(1);
      expect(manager.getField(user, "name")).toBe("Alice");
    });

    test("should throw error for nonexistent field", () => {
      expect(() => {
        manager.getField(user, "nonexistent");
      }).toThrow("Field 'nonexistent' not found");
    });

    test("should set field with immutability", () => {
      const updated = manager.setField(user, "name", "Bob");

      // Original unchanged
      expect(manager.getField(user, "name")).toBe("Alice");

      // New instance updated
      expect(manager.getField(updated, "name")).toBe("Bob");
      expect(manager.getField(updated, "id")).toBe(1);
    });

    test("should throw error setting nonexistent field", () => {
      expect(() => {
        manager.setField(user, "nonexistent", "value");
      }).toThrow("Field 'nonexistent' not found");
    });
  });

  describe("Default Values", () => {
    test("should use default values", () => {
      manager.defineStruct({
        name: "Point",
        fields: [
          { name: "x", type: "number", default: 0 },
          { name: "y", type: "number", default: 0 },
        ],
      });

      const point = manager.createInstance("Point", {});
      expect(manager.getField(point, "x")).toBe(0);
      expect(manager.getField(point, "y")).toBe(0);
    });

    test("should override default values", () => {
      manager.defineStruct({
        name: "Config",
        fields: [
          { name: "timeout", type: "number", default: 5000 },
          { name: "retries", type: "number", default: 3 },
        ],
      });

      const config = manager.createInstance("Config", {
        timeout: 10000,
      });

      expect(manager.getField(config, "timeout")).toBe(10000);
      expect(manager.getField(config, "retries")).toBe(3);
    });
  });

  describe("Complex Structs", () => {
    test("should handle nested field references", () => {
      manager.defineStruct({
        name: "Address",
        fields: [
          { name: "street", type: "string" },
          { name: "city", type: "string" },
        ],
      });

      manager.defineStruct({
        name: "User",
        fields: [
          { name: "name", type: "string" },
          { name: "address", type: "Address" },
        ],
      });

      const address = manager.createInstance("Address", {
        street: "123 Main St",
        city: "Seattle",
      });

      const user = manager.createInstance("User", {
        name: "Alice",
        address: address,
      });

      const userAddress = manager.getField(user, "address");
      expect(userAddress.street).toBe("123 Main St");
    });
  });

  describe("Multiple Instances", () => {
    beforeEach(() => {
      manager.defineStruct({
        name: "User",
        fields: [
          { name: "id", type: "number" },
          { name: "name", type: "string" },
        ],
      });
    });

    test("should create multiple independent instances", () => {
      const user1 = manager.createInstance("User", {
        id: 1,
        name: "Alice",
      });

      const user2 = manager.createInstance("User", {
        id: 2,
        name: "Bob",
      });

      expect(manager.getField(user1, "name")).toBe("Alice");
      expect(manager.getField(user2, "name")).toBe("Bob");

      // Modifying one doesn't affect the other
      const updated1 = manager.setField(user1, "name", "Alicia");
      expect(manager.getField(updated1, "name")).toBe("Alicia");
      expect(manager.getField(user2, "name")).toBe("Bob");
    });
  });

  describe("Sample Structs", () => {
    beforeEach(() => {
      // Sample structs need to be defined in the test's manager
      manager.defineStruct({
        name: "User",
        fields: [
          { name: "id", type: "number" },
          { name: "name", type: "string" },
          { name: "email", type: "string", optional: true },
        ],
      });

      manager.defineStruct({
        name: "Point",
        fields: [
          { name: "x", type: "number", default: 0 },
          { name: "y", type: "number", default: 0 },
        ],
      });

      manager.defineStruct({
        name: "Database",
        fields: [
          { name: "name", type: "string" },
          { name: "tables", type: "number", default: 0 },
          { name: "version", type: "string", default: "1.0" },
        ],
      });
    });

    test("should create User from sample structs", () => {
      const user = manager.createInstance("User", {
        id: 1,
        name: "Alice",
      });

      expect(manager.getField(user, "id")).toBe(1);
      expect(manager.getField(user, "name")).toBe("Alice");
    });

    test("should create Point from sample structs", () => {
      const point = manager.createInstance("Point", {
        x: 10,
        y: 20,
      });

      expect(manager.getField(point, "x")).toBe(10);
      expect(manager.getField(point, "y")).toBe(20);
    });

    test("should create Point with defaults", () => {
      const point = manager.createInstance("Point", {});
      expect(manager.getField(point, "x")).toBe(0);
      expect(manager.getField(point, "y")).toBe(0);
    });

    test("should create Database with defaults", () => {
      const db = manager.createInstance("Database", {
        name: "mydb",
      });

      expect(manager.getField(db, "name")).toBe("mydb");
      expect(manager.getField(db, "tables")).toBe(0);
      expect(manager.getField(db, "version")).toBe("1.0");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty struct", () => {
      manager.defineStruct({
        name: "Empty",
        fields: [],
      });

      const instance = manager.createInstance("Empty", {});
      expect(instance._structName).toBe("Empty");
    });

    test("should handle null values", () => {
      manager.defineStruct({
        name: "Nullable",
        fields: [
          { name: "value", type: "string", optional: true },
        ],
      });

      const instance = manager.createInstance("Nullable", {});
      expect(manager.getField(instance, "value")).toBeNull();
    });

    test("should preserve field order", () => {
      manager.defineStruct({
        name: "Ordered",
        fields: [
          { name: "a", type: "number" },
          { name: "b", type: "number" },
          { name: "c", type: "number" },
        ],
      });

      const info = manager.getStructInfo("Ordered");
      expect(info?.fields).toEqual(["a: number", "b: number", "c: number"]);
    });
  });
});

// 통합 테스트
describe("Phase 8: Integration Tests", () => {
  test("should run sample struct system tests", () => {
    expect(() => {
      testStructSystem();
    }).not.toThrow();
  });
});
