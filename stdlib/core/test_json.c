/**
 * FreeLang core/json - Test Suite
 *
 * Tests for JSON parsing and serialization
 * Total: 25 test cases
 */

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "json.h"

/* ===== Test Framework ===== */

static int test_count = 0;
static int pass_count = 0;
static int fail_count = 0;

#define ASSERT(condition, message) \
  do { \
    test_count++; \
    if (condition) { \
      pass_count++; \
      printf("✓ Test %d: %s\n", test_count, message); \
    } else { \
      fail_count++; \
      printf("✗ Test %d: %s\n", test_count, message); \
    } \
  } while(0)

/* ===== Value Creation Tests ===== */

void test_json_null(void) {
  fl_json_value_t *val = fl_json_null();
  ASSERT(val != NULL, "JSON null created");
  ASSERT(fl_json_is_null(val), "Value is null");
  if (val) fl_json_free(val);
}

void test_json_bool_true(void) {
  fl_json_value_t *val = fl_json_bool(1);
  ASSERT(val != NULL, "JSON bool (true) created");
  ASSERT(fl_json_is_bool(val), "Value is bool");
  ASSERT(fl_json_as_bool(val), "Value is true");
  if (val) fl_json_free(val);
}

void test_json_bool_false(void) {
  fl_json_value_t *val = fl_json_bool(0);
  ASSERT(val != NULL, "JSON bool (false) created");
  ASSERT(!fl_json_as_bool(val), "Value is false");
  if (val) fl_json_free(val);
}

void test_json_number_int(void) {
  fl_json_value_t *val = fl_json_number(42);
  ASSERT(val != NULL, "JSON number created");
  ASSERT(fl_json_is_number(val), "Value is number");
  ASSERT(fl_json_as_number(val) == 42, "Number value correct");
  if (val) fl_json_free(val);
}

void test_json_number_float(void) {
  fl_json_value_t *val = fl_json_number(3.14159);
  ASSERT(val != NULL, "JSON float created");
  double num = fl_json_as_number(val);
  ASSERT(num > 3.1 && num < 3.2, "Float value correct");
  if (val) fl_json_free(val);
}

void test_json_string(void) {
  fl_json_value_t *val = fl_json_string("hello");
  ASSERT(val != NULL, "JSON string created");
  ASSERT(fl_json_is_string(val), "Value is string");
  const char *str = fl_json_as_string(val);
  ASSERT(str != NULL && strcmp(str, "hello") == 0, "String value correct");
  if (val) fl_json_free(val);
}

/* ===== Array Tests ===== */

void test_json_array_create(void) {
  fl_json_value_t *arr = fl_json_array();
  ASSERT(arr != NULL, "JSON array created");
  ASSERT(fl_json_is_array(arr), "Value is array");
  ASSERT(fl_json_array_size(arr) == 0, "Array is empty");
  if (arr) fl_json_free(arr);
}

void test_json_array_push(void) {
  fl_json_value_t *arr = fl_json_array();
  fl_json_value_t *val1 = fl_json_number(1);
  fl_json_value_t *val2 = fl_json_number(2);

  int ret1 = fl_json_array_push(arr, val1);
  int ret2 = fl_json_array_push(arr, val2);

  ASSERT(ret1 == 0 && ret2 == 0, "Values pushed to array");
  ASSERT(fl_json_array_size(arr) == 2, "Array size is 2");

  if (arr) fl_json_free(arr);
}

void test_json_array_get(void) {
  fl_json_value_t *arr = fl_json_array();
  fl_json_value_t *val = fl_json_number(42);
  fl_json_array_push(arr, val);

  fl_json_value_t *retrieved = fl_json_array_get(arr, 0);
  ASSERT(retrieved != NULL, "Array element retrieved");
  ASSERT(fl_json_is_number(retrieved), "Retrieved value is number");

  if (arr) fl_json_free(arr);
}

void test_json_array_nested(void) {
  fl_json_value_t *outer = fl_json_array();
  fl_json_value_t *inner = fl_json_array();
  fl_json_value_t *num = fl_json_number(123);

  fl_json_array_push(inner, num);
  fl_json_array_push(outer, inner);

  ASSERT(fl_json_array_size(outer) == 1, "Outer array size is 1");
  fl_json_value_t *inner_retrieved = fl_json_array_get(outer, 0);
  ASSERT(fl_json_is_array(inner_retrieved), "Retrieved nested array");

  if (outer) fl_json_free(outer);
}

/* ===== Object Tests ===== */

void test_json_object_create(void) {
  fl_json_value_t *obj = fl_json_object();
  ASSERT(obj != NULL, "JSON object created");
  ASSERT(fl_json_is_object(obj), "Value is object");
  ASSERT(fl_json_object_size(obj) == 0, "Object is empty");
  if (obj) fl_json_free(obj);
}

void test_json_object_set(void) {
  fl_json_value_t *obj = fl_json_object();
  fl_json_value_t *val = fl_json_string("John");

  int ret = fl_json_object_set(obj, "name", val);
  ASSERT(ret == 0, "Value set in object");
  ASSERT(fl_json_object_size(obj) == 1, "Object size is 1");

  if (obj) fl_json_free(obj);
}

void test_json_object_get(void) {
  fl_json_value_t *obj = fl_json_object();
  fl_json_value_t *val = fl_json_number(30);
  fl_json_object_set(obj, "age", val);

  fl_json_value_t *retrieved = fl_json_object_get(obj, "age");
  ASSERT(retrieved != NULL, "Object property retrieved");
  ASSERT(fl_json_is_number(retrieved), "Retrieved value is number");

  if (obj) fl_json_free(obj);
}

void test_json_object_has(void) {
  fl_json_value_t *obj = fl_json_object();
  fl_json_value_t *val = fl_json_string("test");
  fl_json_object_set(obj, "key", val);

  int has_key = fl_json_object_has(obj, "key");
  int no_key = fl_json_object_has(obj, "missing");

  ASSERT(has_key, "Object has key");
  ASSERT(!no_key, "Object doesn't have missing key");

  if (obj) fl_json_free(obj);
}

void test_json_object_nested(void) {
  fl_json_value_t *outer = fl_json_object();
  fl_json_value_t *inner = fl_json_object();
  fl_json_value_t *val = fl_json_string("nested");

  fl_json_object_set(inner, "data", val);
  fl_json_object_set(outer, "inner", inner);

  fl_json_value_t *retrieved = fl_json_object_get(outer, "inner");
  ASSERT(fl_json_is_object(retrieved), "Retrieved nested object");

  if (outer) fl_json_free(outer);
}

/* ===== Parsing Tests ===== */

void test_json_parse_null(void) {
  fl_json_value_t *val = fl_json_parse("null");
  ASSERT(val != NULL, "null parsed");
  ASSERT(fl_json_is_null(val), "Parsed value is null");
  if (val) fl_json_free(val);
}

void test_json_parse_bool(void) {
  fl_json_value_t *val = fl_json_parse("true");
  ASSERT(val != NULL, "true parsed");
  ASSERT(fl_json_as_bool(val), "Parsed bool is true");
  if (val) fl_json_free(val);
}

void test_json_parse_number(void) {
  fl_json_value_t *val = fl_json_parse("123");
  ASSERT(val != NULL, "123 parsed");
  ASSERT(fl_json_as_number(val) == 123, "Parsed number correct");
  if (val) fl_json_free(val);
}

void test_json_parse_string(void) {
  fl_json_value_t *val = fl_json_parse("\"hello\"");
  ASSERT(val != NULL, "String parsed");
  ASSERT(fl_json_is_string(val), "Parsed value is string");
  if (val) fl_json_free(val);
}

void test_json_parse_array(void) {
  fl_json_value_t *val = fl_json_parse("[1, 2, 3]");
  ASSERT(val != NULL, "Array parsed");
  ASSERT(fl_json_is_array(val), "Parsed value is array");
  ASSERT(fl_json_array_size(val) == 3, "Array size is 3");
  if (val) fl_json_free(val);
}

void test_json_parse_object(void) {
  fl_json_value_t *val = fl_json_parse("{\"key\": \"value\"}");
  ASSERT(val != NULL, "Object parsed");
  ASSERT(fl_json_is_object(val), "Parsed value is object");
  if (val) fl_json_free(val);
}

/* ===== Serialization Tests ===== */

void test_json_stringify_null(void) {
  fl_json_value_t *val = fl_json_null();
  char *str = fl_json_stringify(val);
  ASSERT(str != NULL && strcmp(str, "null") == 0, "null serialized");
  if (str) free(str);
  if (val) fl_json_free(val);
}

void test_json_stringify_number(void) {
  fl_json_value_t *val = fl_json_number(42);
  char *str = fl_json_stringify(val);
  ASSERT(str != NULL, "Number serialized");
  if (str) free(str);
  if (val) fl_json_free(val);
}

/* ===== MAIN TEST RUNNER ===== */

int main(void) {
  printf("🧪 Running JSON Module Tests\n");
  printf("════════════════════════════════════════\n\n");

  printf("📦 Value Creation Tests (6):\n");
  test_json_null();
  test_json_bool_true();
  test_json_bool_false();
  test_json_number_int();
  test_json_number_float();
  test_json_string();

  printf("\n📋 Array Tests (4):\n");
  test_json_array_create();
  test_json_array_push();
  test_json_array_get();
  test_json_array_nested();

  printf("\n📘 Object Tests (5):\n");
  test_json_object_create();
  test_json_object_set();
  test_json_object_get();
  test_json_object_has();
  test_json_object_nested();

  printf("\n🔍 Parsing Tests (6):\n");
  test_json_parse_null();
  test_json_parse_bool();
  test_json_parse_number();
  test_json_parse_string();
  test_json_parse_array();
  test_json_parse_object();

  printf("\n💾 Serialization Tests (2):\n");
  test_json_stringify_null();
  test_json_stringify_number();

  printf("\n════════════════════════════════════════\n");
  printf("📊 Test Results:\n");
  printf("  Total:  %d\n", test_count);
  printf("  Passed: %d ✅\n", pass_count);
  printf("  Failed: %d ❌\n", fail_count);
  printf("\n");

  if (fail_count == 0) {
    printf("🎉 All tests passed!\n");
    return 0;
  } else {
    printf("⚠️  %d test(s) failed\n", fail_count);
    return 1;
  }
}
