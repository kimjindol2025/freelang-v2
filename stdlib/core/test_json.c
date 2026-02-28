/**
 * FreeLang core/json - Test Suite
 *
 * Tests for JSON parser and serializer
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

#define ASSERT_EQUAL_INT(actual, expected, message) \
  ASSERT((actual) == (expected), message)

#define ASSERT_EQUAL_STR(actual, expected, message) \
  ASSERT(strcmp((actual), (expected)) == 0, message)

/* ===== PARSER TESTS ===== */

/**
 * Test 1: Parse null value
 */
void test_parse_null(void) {
  fl_json_parser_t *parser = fl_json_parser_create("null");
  ASSERT(parser != NULL, "Parser creation for null");

  fl_json_value_t *val = fl_json_parse_value(parser);
  ASSERT(val != NULL, "Parse null value");
  ASSERT_EQUAL_INT(val->type, FL_JSON_NULL, "Null type check");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 2: Parse true boolean
 */
void test_parse_true(void) {
  fl_json_parser_t *parser = fl_json_parser_create("true");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_BOOL, "True type check");
  ASSERT(val->data.bool_val == 1, "True value is 1");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 3: Parse false boolean
 */
void test_parse_false(void) {
  fl_json_parser_t *parser = fl_json_parser_create("false");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_BOOL, "False type check");
  ASSERT(val->data.bool_val == 0, "False value is 0");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 4: Parse integer
 */
void test_parse_integer(void) {
  fl_json_parser_t *parser = fl_json_parser_create("42");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_NUMBER, "Integer type check");
  ASSERT(val->data.number_val == 42.0, "Integer value 42");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 5: Parse float
 */
void test_parse_float(void) {
  fl_json_parser_t *parser = fl_json_parser_create("3.14");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_NUMBER, "Float type check");
  ASSERT(val->data.number_val > 3.1 && val->data.number_val < 3.2, "Float value ~3.14");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 6: Parse negative number
 */
void test_parse_negative(void) {
  fl_json_parser_t *parser = fl_json_parser_create("-123");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_NUMBER, "Negative type check");
  ASSERT(val->data.number_val == -123.0, "Negative value -123");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 7: Parse string
 */
void test_parse_string(void) {
  fl_json_parser_t *parser = fl_json_parser_create("\"hello\"");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_STRING, "String type check");
  ASSERT_EQUAL_STR(val->data.string_val, "hello", "String value 'hello'");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 8: Parse string with escape sequences
 */
void test_parse_escaped_string(void) {
  fl_json_parser_t *parser = fl_json_parser_create("\"hello\\nworld\"");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_STRING, "Escaped string type check");
  // After unescaping, should contain newline
  ASSERT(strchr(val->data.string_val, '\n') != NULL, "Contains newline");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 9: Parse empty array
 */
void test_parse_empty_array(void) {
  fl_json_parser_t *parser = fl_json_parser_create("[]");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_ARRAY, "Array type check");
  ASSERT(val->data.array_val->count == 0, "Empty array has count 0");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 10: Parse array with values
 */
void test_parse_array(void) {
  fl_json_parser_t *parser = fl_json_parser_create("[1, 2, 3]");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_ARRAY, "Array type check");
  ASSERT(val->data.array_val->count == 3, "Array has 3 elements");

  fl_json_value_t *elem0 = val->data.array_val->elements[0];
  ASSERT(elem0->type == FL_JSON_NUMBER, "First element is number");
  ASSERT(elem0->data.number_val == 1.0, "First element is 1");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 11: Parse empty object
 */
void test_parse_empty_object(void) {
  fl_json_parser_t *parser = fl_json_parser_create("{}");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_OBJECT, "Object type check");
  ASSERT(val->data.object_val->count == 0, "Empty object has count 0");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 12: Parse object with properties
 */
void test_parse_object(void) {
  fl_json_parser_t *parser = fl_json_parser_create("{\"name\": \"John\", \"age\": 30}");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_OBJECT, "Object type check");
  ASSERT(val->data.object_val->count == 2, "Object has 2 properties");

  // Find name property
  int name_found = 0;
  for (int i = 0; i < val->data.object_val->count; i++) {
    if (strcmp(val->data.object_val->keys[i], "name") == 0) {
      name_found = 1;
      fl_json_value_t *name_val = val->data.object_val->values[i];
      ASSERT(name_val->type == FL_JSON_STRING, "Name value is string");
      ASSERT_EQUAL_STR(name_val->data.string_val, "John", "Name is 'John'");
    }
  }
  ASSERT(name_found, "Name property found");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 13: Parse nested structure
 */
void test_parse_nested(void) {
  const char *json = "{\"user\": {\"name\": \"Alice\", \"scores\": [95, 87, 92]}}";
  fl_json_parser_t *parser = fl_json_parser_create(json);
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_OBJECT, "Root is object");
  // Verify nested structure exists
  ASSERT(val->data.object_val->count > 0, "Object has properties");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 14: Parse with whitespace
 */
void test_parse_whitespace(void) {
  const char *json = "  {  \"key\"  :  \"value\"  }  ";
  fl_json_parser_t *parser = fl_json_parser_create(json);
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_OBJECT, "Object parsed despite whitespace");
  ASSERT(val->data.object_val->count > 0, "Object has properties");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 15: Error handling - invalid JSON
 */
void test_error_invalid_json(void) {
  fl_json_parser_t *parser = fl_json_parser_create("{invalid}");
  fl_json_value_t *val = fl_json_parse_value(parser);

  // Parser should handle error gracefully
  ASSERT(parser->error_msg != NULL || val == NULL, "Error detected for invalid JSON");

  if (val) fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 16: Error handling - unclosed string
 */
void test_error_unclosed_string(void) {
  fl_json_parser_t *parser = fl_json_parser_create("\"unclosed");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(parser->error_msg != NULL || val == NULL, "Error detected for unclosed string");

  if (val) fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 17: Parse scientific notation
 */
void test_parse_scientific(void) {
  fl_json_parser_t *parser = fl_json_parser_create("1.23e-4");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_NUMBER, "Scientific notation type check");
  ASSERT(val->data.number_val > 0.0001 && val->data.number_val < 0.0002,
         "Scientific notation value correct");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 18: Parse unicode escape
 */
void test_parse_unicode(void) {
  fl_json_parser_t *parser = fl_json_parser_create("\"\\u0041\"");  // 'A'
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val->type == FL_JSON_STRING, "Unicode escape type check");
  // Value should contain 'A'
  ASSERT(val->data.string_val[0] == 'A', "Unicode escape decoded");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/* ===== SERIALIZER TESTS ===== */

/**
 * Test 19: Serialize null
 */
void test_serialize_null(void) {
  fl_json_value_t val;
  val.type = FL_JSON_NULL;

  char *json = fl_json_serialize(&val);
  ASSERT(json != NULL, "Null serializes to string");
  ASSERT_EQUAL_STR(json, "null", "Null serializes to 'null'");

  free(json);
}

/**
 * Test 20: Serialize boolean
 */
void test_serialize_bool(void) {
  fl_json_value_t val;
  val.type = FL_JSON_BOOL;
  val.data.bool_val = 1;

  char *json = fl_json_serialize(&val);
  ASSERT_EQUAL_STR(json, "true", "True serializes to 'true'");

  free(json);
}

/**
 * Test 21: Serialize number
 */
void test_serialize_number(void) {
  fl_json_value_t val;
  val.type = FL_JSON_NUMBER;
  val.data.number_val = 42.5;

  char *json = fl_json_serialize(&val);
  ASSERT(json != NULL, "Number serializes");
  // Should contain "42.5"
  ASSERT(strstr(json, "42.5") != NULL, "Number value in serialization");

  free(json);
}

/**
 * Test 22: Roundtrip parse-serialize
 */
void test_roundtrip(void) {
  const char *original = "{\"x\": 10, \"y\": 20}";

  // Parse
  fl_json_parser_t *parser = fl_json_parser_create(original);
  fl_json_value_t *val = fl_json_parse_value(parser);

  // Serialize
  char *serialized = fl_json_serialize(val);

  // Parse again
  fl_json_parser_t *parser2 = fl_json_parser_create(serialized);
  fl_json_value_t *val2 = fl_json_parse_value(parser2);

  // Compare
  ASSERT(val->type == val2->type, "Roundtrip preserves type");
  ASSERT(val->data.object_val->count == val2->data.object_val->count,
         "Roundtrip preserves structure");

  fl_json_value_destroy(val);
  fl_json_value_destroy(val2);
  fl_json_parser_destroy(parser);
  fl_json_parser_destroy(parser2);
  free(serialized);
}

/**
 * Test 23: Escape special characters
 */
void test_escape_chars(void) {
  fl_json_value_t val;
  val.type = FL_JSON_STRING;
  val.data.string_val = "hello\nworld\t!";

  char *json = fl_json_serialize(&val);
  ASSERT(json != NULL, "String with escapes serializes");
  // Should contain escaped sequences
  ASSERT(strstr(json, "\\n") != NULL, "Newline escaped");
  ASSERT(strstr(json, "\\t") != NULL, "Tab escaped");

  free(json);
}

/**
 * Test 24: Large JSON parsing
 */
void test_parse_large_json(void) {
  // Create large array JSON
  char large_json[10000] = "[";
  for (int i = 0; i < 100; i++) {
    if (i > 0) strcat(large_json, ",");
    sprintf(large_json + strlen(large_json), "%d", i);
  }
  strcat(large_json, "]");

  fl_json_parser_t *parser = fl_json_parser_create(large_json);
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(val != NULL, "Large JSON parses");
  ASSERT(val->type == FL_JSON_ARRAY, "Large array parses");
  ASSERT(val->data.array_val->count == 100, "Large array has 100 elements");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/**
 * Test 25: Parser position tracking
 */
void test_parser_position(void) {
  fl_json_parser_t *parser = fl_json_parser_create("42");
  fl_json_value_t *val = fl_json_parse_value(parser);

  ASSERT(parser->pos > 0, "Parser position advances");
  ASSERT(parser->line > 0, "Parser line tracking");

  fl_json_value_destroy(val);
  fl_json_parser_destroy(parser);
}

/* ===== MAIN TEST RUNNER ===== */

int main(void) {
  printf("🧪 Running JSON Module Tests\n");
  printf("════════════════════════════════════════\n\n");

  // Parser tests
  printf("📖 Parser Tests (15):\n");
  test_parse_null();
  test_parse_true();
  test_parse_false();
  test_parse_integer();
  test_parse_float();
  test_parse_negative();
  test_parse_string();
  test_parse_escaped_string();
  test_parse_empty_array();
  test_parse_array();
  test_parse_empty_object();
  test_parse_object();
  test_parse_nested();
  test_parse_whitespace();
  test_error_invalid_json();
  test_error_unclosed_string();
  test_parse_scientific();
  test_parse_unicode();

  printf("\n📝 Serializer Tests (7):\n");
  test_serialize_null();
  test_serialize_bool();
  test_serialize_number();
  test_roundtrip();
  test_escape_chars();
  test_parse_large_json();
  test_parser_position();

  // Results
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
