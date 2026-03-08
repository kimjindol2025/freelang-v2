/**
 * FreeLang stdlib/json - JSON Parsing & Serialization
 * RFC 7159 compliant JSON parser, builder, serializer
 */

#ifndef FREELANG_STDLIB_JSON_H
#define FREELANG_STDLIB_JSON_H

#include <stdint.h>
#include <pthread.h>

/* ===== JSON Value Types ===== */

typedef enum {
  FL_JSON_NULL = 0,
  FL_JSON_BOOL = 1,
  FL_JSON_NUMBER = 2,
  FL_JSON_STRING = 3,
  FL_JSON_ARRAY = 4,
  FL_JSON_OBJECT = 5
} fl_json_type_t;

/* Forward declaration */
typedef struct fl_json_value fl_json_value_t;

typedef struct {
  const char *key;
  fl_json_value_t *value;
} fl_json_pair_t;

/* ===== JSON Value ===== */

typedef struct fl_json_value {
  fl_json_type_t type;

  union {
    int bool_val;
    double number_val;
    char *string_val;

    struct {
      fl_json_value_t **items;
      int count;
      int capacity;
    } array;

    struct {
      fl_json_pair_t *pairs;
      int count;
      int capacity;
    } object;
  } data;
} fl_json_value_t;

/* ===== Parser ===== */

typedef struct {
  const char *json;
  int pos;
  int line;
  int column;
  char *error_msg;
} fl_json_parser_t;

/* ===== Public API ===== */

/* Parser creation */
fl_json_parser_t* fl_json_parser_create(const char *json);
void fl_json_parser_destroy(fl_json_parser_t *parser);

/* Parsing */
fl_json_value_t* fl_json_parse(const char *json);
fl_json_value_t* fl_json_parse_ex(fl_json_parser_t *parser);
const char* fl_json_parser_error(fl_json_parser_t *parser);

/* Value creation */
fl_json_value_t* fl_json_null(void);
fl_json_value_t* fl_json_bool(int value);
fl_json_value_t* fl_json_number(double value);
fl_json_value_t* fl_json_string(const char *value);
fl_json_value_t* fl_json_array(void);
fl_json_value_t* fl_json_object(void);

/* Array operations */
int fl_json_array_push(fl_json_value_t *array, fl_json_value_t *value);
fl_json_value_t* fl_json_array_get(fl_json_value_t *array, int index);
int fl_json_array_size(fl_json_value_t *array);

/* Object operations */
int fl_json_object_set(fl_json_value_t *object, const char *key, fl_json_value_t *value);
fl_json_value_t* fl_json_object_get(fl_json_value_t *object, const char *key);
int fl_json_object_has(fl_json_value_t *object, const char *key);
int fl_json_object_size(fl_json_value_t *object);

/* Type checking */
int fl_json_is_null(fl_json_value_t *value);
int fl_json_is_bool(fl_json_value_t *value);
int fl_json_is_number(fl_json_value_t *value);
int fl_json_is_string(fl_json_value_t *value);
int fl_json_is_array(fl_json_value_t *value);
int fl_json_is_object(fl_json_value_t *value);

/* Value extraction */
int fl_json_as_bool(fl_json_value_t *value);
double fl_json_as_number(fl_json_value_t *value);
const char* fl_json_as_string(fl_json_value_t *value);

/* Serialization */
char* fl_json_stringify(fl_json_value_t *value);
char* fl_json_stringify_pretty(fl_json_value_t *value, int indent);

/* Memory management */
void fl_json_free(fl_json_value_t *value);

#endif /* FREELANG_STDLIB_JSON_H */
