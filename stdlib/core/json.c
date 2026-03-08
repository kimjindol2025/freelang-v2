/**
 * FreeLang stdlib/json Implementation - JSON Parser & Serializer
 */

#include "json.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <ctype.h>
#include <math.h>

/* ===== Parser Helpers ===== */

static void skip_whitespace(fl_json_parser_t *parser) {
  while (parser->json[parser->pos] && isspace(parser->json[parser->pos])) {
    if (parser->json[parser->pos] == '\n') {
      parser->line++;
      parser->column = 0;
    } else {
      parser->column++;
    }
    parser->pos++;
  }
}

static int peek(fl_json_parser_t *parser) {
  skip_whitespace(parser);
  return parser->json[parser->pos];
}

static int consume(fl_json_parser_t *parser, char expected) {
  skip_whitespace(parser);
  if (parser->json[parser->pos] == expected) {
    parser->pos++;
    parser->column++;
    return 1;
  }
  return 0;
}

static void set_error(fl_json_parser_t *parser, const char *msg) {
  if (!parser->error_msg) {
    char buffer[256];
    snprintf(buffer, sizeof(buffer), "%s at line %d, col %d", msg, parser->line, parser->column);
    parser->error_msg = (char*)malloc(strlen(buffer) + 1);
    if (parser->error_msg) SAFE_STRCPY(parser->error_msg, buffer);
  }
}

/* ===== Parser Creation ===== */

fl_json_parser_t* fl_json_parser_create(const char *json) {
  if (!json) return NULL;

  fl_json_parser_t *parser = (fl_json_parser_t*)malloc(sizeof(fl_json_parser_t));
  if (!parser) return NULL;

  parser->json = json;
  parser->pos = 0;
  parser->line = 1;
  parser->column = 0;
  parser->error_msg = NULL;

  return parser;
}

void fl_json_parser_destroy(fl_json_parser_t *parser) {
  if (!parser) return;

  if (parser->error_msg) free(parser->error_msg);
  free(parser);
}

/* ===== Forward Declarations ===== */

static fl_json_value_t* parse_value(fl_json_parser_t *parser);

/* ===== Parse Number ===== */

static fl_json_value_t* parse_number(fl_json_parser_t *parser) {
  char *endptr;
  double value = strtod(&parser->json[parser->pos], &endptr);

  parser->pos += (endptr - &parser->json[parser->pos]);

  fl_json_value_t *result = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
  result->type = FL_JSON_NUMBER;
  result->data.number_val = value;

  return result;
}

/* ===== Parse String ===== */

static fl_json_value_t* parse_string(fl_json_parser_t *parser) {
  if (!consume(parser, '"')) {
    set_error(parser, "Expected '\"'");
    return NULL;
  }

  char buffer[4096];
  int len = 0;

  while (parser->json[parser->pos] && parser->json[parser->pos] != '"') {
    if (parser->json[parser->pos] == '\\') {
      parser->pos++;
      switch (parser->json[parser->pos]) {
        case '"': buffer[len++] = '"'; break;
        case '\\': buffer[len++] = '\\'; break;
        case '/': buffer[len++] = '/'; break;
        case 'b': buffer[len++] = '\b'; break;
        case 'f': buffer[len++] = '\f'; break;
        case 'n': buffer[len++] = '\n'; break;
        case 'r': buffer[len++] = '\r'; break;
        case 't': buffer[len++] = '\t'; break;
        default: buffer[len++] = parser->json[parser->pos]; break;
      }
      parser->pos++;
    } else {
      buffer[len++] = parser->json[parser->pos++];
    }
  }

  if (!consume(parser, '"')) {
    set_error(parser, "Unterminated string");
    return NULL;
  }

  buffer[len] = '\0';

  fl_json_value_t *result = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
  result->type = FL_JSON_STRING;
  result->data.string_val = (char*)malloc(strlen(buffer) + 1);
  SAFE_STRCPY(result->data.string_val, buffer);

  return result;
}

/* ===== Parse Array ===== */

static fl_json_value_t* parse_array(fl_json_parser_t *parser) {
  if (!consume(parser, '[')) {
    return NULL;
  }

  fl_json_value_t *array = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
  array->type = FL_JSON_ARRAY;
  array->data.array.items = NULL;
  array->data.array.count = 0;
  array->data.array.capacity = 16;
  array->data.array.items = (fl_json_value_t**)malloc(sizeof(fl_json_value_t*) * 16);

  if (peek(parser) == ']') {
    consume(parser, ']');
    return array;
  }

  while (1) {
    fl_json_value_t *value = parse_value(parser);
    if (!value) {
      fl_json_free(array);
      return NULL;
    }

    if (array->data.array.count >= array->data.array.capacity) {
      array->data.array.capacity *= 2;
      array->data.array.items = (fl_json_value_t**)realloc(array->data.array.items,
                                                           sizeof(fl_json_value_t*) * array->data.array.capacity);
    }

    array->data.array.items[array->data.array.count++] = value;

    if (peek(parser) == ']') {
      consume(parser, ']');
      return array;
    }

    if (!consume(parser, ',')) {
      set_error(parser, "Expected ',' or ']' in array");
      fl_json_free(array);
      return NULL;
    }
  }
}

/* ===== Parse Object ===== */

static fl_json_value_t* parse_object(fl_json_parser_t *parser) {
  if (!consume(parser, '{')) {
    return NULL;
  }

  fl_json_value_t *object = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
  object->type = FL_JSON_OBJECT;
  object->data.object.pairs = NULL;
  object->data.object.count = 0;
  object->data.object.capacity = 16;
  object->data.object.pairs = (fl_json_pair_t*)malloc(sizeof(fl_json_pair_t) * 16);

  if (peek(parser) == '}') {
    consume(parser, '}');
    return object;
  }

  while (1) {
    fl_json_value_t *key_val = parse_string(parser);
    if (!key_val) {
      fl_json_free(object);
      return NULL;
    }

    if (!consume(parser, ':')) {
      set_error(parser, "Expected ':' in object");
      fl_json_free(key_val);
      fl_json_free(object);
      return NULL;
    }

    fl_json_value_t *value = parse_value(parser);
    if (!value) {
      fl_json_free(key_val);
      fl_json_free(object);
      return NULL;
    }

    if (object->data.object.count >= object->data.object.capacity) {
      object->data.object.capacity *= 2;
      object->data.object.pairs = (fl_json_pair_t*)realloc(object->data.object.pairs,
                                                           sizeof(fl_json_pair_t) * object->data.object.capacity);
    }

    object->data.object.pairs[object->data.object.count].key = key_val->data.string_val;
    object->data.object.pairs[object->data.object.count].value = value;
    object->data.object.count++;

    free(key_val);

    if (peek(parser) == '}') {
      consume(parser, '}');
      return object;
    }

    if (!consume(parser, ',')) {
      set_error(parser, "Expected ',' or '}' in object");
      fl_json_free(object);
      return NULL;
    }
  }
}

/* ===== Parse Value ===== */

static fl_json_value_t* parse_value(fl_json_parser_t *parser) {
  int c = peek(parser);

  if (c == '"') {
    return parse_string(parser);
  }

  if (c == '[') {
    return parse_array(parser);
  }

  if (c == '{') {
    return parse_object(parser);
  }

  if (c == 't' || c == 'f') {
    if (strncmp(&parser->json[parser->pos], "true", 4) == 0) {
      parser->pos += 4;
      fl_json_value_t *result = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
      result->type = FL_JSON_BOOL;
      result->data.bool_val = 1;
      return result;
    }
    if (strncmp(&parser->json[parser->pos], "false", 5) == 0) {
      parser->pos += 5;
      fl_json_value_t *result = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
      result->type = FL_JSON_BOOL;
      result->data.bool_val = 0;
      return result;
    }
  }

  if (c == 'n') {
    if (strncmp(&parser->json[parser->pos], "null", 4) == 0) {
      parser->pos += 4;
      return fl_json_null();
    }
  }

  if (c == '-' || isdigit(c)) {
    return parse_number(parser);
  }

  set_error(parser, "Unexpected character");
  return NULL;
}

/* ===== Public Parse API ===== */

fl_json_value_t* fl_json_parse_ex(fl_json_parser_t *parser) {
  fl_json_value_t *value = parse_value(parser);
  return value;
}

fl_json_value_t* fl_json_parse(const char *json) {
  fl_json_parser_t *parser = fl_json_parser_create(json);
  if (!parser) return NULL;

  fl_json_value_t *value = fl_json_parse_ex(parser);

  fl_json_parser_destroy(parser);

  return value;
}

const char* fl_json_parser_error(fl_json_parser_t *parser) {
  return parser ? parser->error_msg : NULL;
}

/* ===== Value Creation ===== */

fl_json_value_t* fl_json_null(void) {
  fl_json_value_t *value = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
  value->type = FL_JSON_NULL;
  return value;
}

fl_json_value_t* fl_json_bool(int b) {
  fl_json_value_t *value = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
  value->type = FL_JSON_BOOL;
  value->data.bool_val = b ? 1 : 0;
  return value;
}

fl_json_value_t* fl_json_number(double n) {
  fl_json_value_t *value = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
  value->type = FL_JSON_NUMBER;
  value->data.number_val = n;
  return value;
}

fl_json_value_t* fl_json_string(const char *s) {
  fl_json_value_t *value = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
  value->type = FL_JSON_STRING;
  value->data.string_val = (char*)malloc(strlen(s) + 1);
  SAFE_STRCPY(value->data.string_val, s);
  return value;
}

fl_json_value_t* fl_json_array(void) {
  fl_json_value_t *value = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
  value->type = FL_JSON_ARRAY;
  value->data.array.items = (fl_json_value_t**)malloc(sizeof(fl_json_value_t*) * 16);
  value->data.array.count = 0;
  value->data.array.capacity = 16;
  return value;
}

fl_json_value_t* fl_json_object(void) {
  fl_json_value_t *value = (fl_json_value_t*)malloc(sizeof(fl_json_value_t));
  value->type = FL_JSON_OBJECT;
  value->data.object.pairs = (fl_json_pair_t*)malloc(sizeof(fl_json_pair_t) * 16);
  value->data.object.count = 0;
  value->data.object.capacity = 16;
  return value;
}

/* ===== Array Operations ===== */

int fl_json_array_push(fl_json_value_t *array, fl_json_value_t *value) {
  if (!array || array->type != FL_JSON_ARRAY || !value) return -1;

  if (array->data.array.count >= array->data.array.capacity) {
    array->data.array.capacity *= 2;
    array->data.array.items = (fl_json_value_t**)realloc(array->data.array.items,
                                                         sizeof(fl_json_value_t*) * array->data.array.capacity);
  }

  array->data.array.items[array->data.array.count++] = value;
  return 0;
}

fl_json_value_t* fl_json_array_get(fl_json_value_t *array, int index) {
  if (!array || array->type != FL_JSON_ARRAY || index < 0 || index >= array->data.array.count) {
    return NULL;
  }

  return array->data.array.items[index];
}

int fl_json_array_size(fl_json_value_t *array) {
  if (!array || array->type != FL_JSON_ARRAY) return 0;
  return array->data.array.count;
}

/* ===== Object Operations ===== */

int fl_json_object_set(fl_json_value_t *object, const char *key, fl_json_value_t *value) {
  if (!object || object->type != FL_JSON_OBJECT || !key || !value) return -1;

  for (int i = 0; i < object->data.object.count; i++) {
    if (strcmp(object->data.object.pairs[i].key, key) == 0) {
      fl_json_free(object->data.object.pairs[i].value);
      object->data.object.pairs[i].value = value;
      return 0;
    }
  }

  if (object->data.object.count >= object->data.object.capacity) {
    object->data.object.capacity *= 2;
    object->data.object.pairs = (fl_json_pair_t*)realloc(object->data.object.pairs,
                                                         sizeof(fl_json_pair_t) * object->data.object.capacity);
  }

  object->data.object.pairs[object->data.object.count].key = (char*)malloc(strlen(key) + 1);
  strcpy(object->data.object.pairs[object->data.object.count].key, key);
  object->data.object.pairs[object->data.object.count].value = value;
  object->data.object.count++;

  return 0;
}

fl_json_value_t* fl_json_object_get(fl_json_value_t *object, const char *key) {
  if (!object || object->type != FL_JSON_OBJECT || !key) return NULL;

  for (int i = 0; i < object->data.object.count; i++) {
    if (strcmp(object->data.object.pairs[i].key, key) == 0) {
      return object->data.object.pairs[i].value;
    }
  }

  return NULL;
}

int fl_json_object_has(fl_json_value_t *object, const char *key) {
  return fl_json_object_get(object, key) != NULL;
}

int fl_json_object_size(fl_json_value_t *object) {
  if (!object || object->type != FL_JSON_OBJECT) return 0;
  return object->data.object.count;
}

/* ===== Type Checking ===== */

int fl_json_is_null(fl_json_value_t *v) { return v && v->type == FL_JSON_NULL; }
int fl_json_is_bool(fl_json_value_t *v) { return v && v->type == FL_JSON_BOOL; }
int fl_json_is_number(fl_json_value_t *v) { return v && v->type == FL_JSON_NUMBER; }
int fl_json_is_string(fl_json_value_t *v) { return v && v->type == FL_JSON_STRING; }
int fl_json_is_array(fl_json_value_t *v) { return v && v->type == FL_JSON_ARRAY; }
int fl_json_is_object(fl_json_value_t *v) { return v && v->type == FL_JSON_OBJECT; }

/* ===== Value Extraction ===== */

int fl_json_as_bool(fl_json_value_t *v) {
  return (v && v->type == FL_JSON_BOOL) ? v->data.bool_val : 0;
}

double fl_json_as_number(fl_json_value_t *v) {
  return (v && v->type == FL_JSON_NUMBER) ? v->data.number_val : 0.0;
}

const char* fl_json_as_string(fl_json_value_t *v) {
  return (v && v->type == FL_JSON_STRING) ? v->data.string_val : NULL;
}

/* ===== Serialization ===== */

static void stringify_helper(fl_json_value_t *value, char *buffer, int *pos, int max_size) {
  if (*pos >= max_size - 1) return;

  switch (value->type) {
    case FL_JSON_NULL:
      *pos += snprintf(&buffer[*pos], max_size - *pos, "null");
      break;

    case FL_JSON_BOOL:
      *pos += snprintf(&buffer[*pos], max_size - *pos, "%s", value->data.bool_val ? "true" : "false");
      break;

    case FL_JSON_NUMBER:
      *pos += snprintf(&buffer[*pos], max_size - *pos, "%g", value->data.number_val);
      break;

    case FL_JSON_STRING:
      *pos += snprintf(&buffer[*pos], max_size - *pos, "\"%s\"", value->data.string_val);
      break;

    case FL_JSON_ARRAY:
      buffer[(*pos)++] = '[';
      for (int i = 0; i < value->data.array.count; i++) {
        if (i > 0) buffer[(*pos)++] = ',';
        stringify_helper(value->data.array.items[i], buffer, pos, max_size);
      }
      buffer[(*pos)++] = ']';
      break;

    case FL_JSON_OBJECT:
      buffer[(*pos)++] = '{';
      for (int i = 0; i < value->data.object.count; i++) {
        if (i > 0) buffer[(*pos)++] = ',';
        *pos += snprintf(&buffer[*pos], max_size - *pos, "\"%s\":", value->data.object.pairs[i].key);
        stringify_helper(value->data.object.pairs[i].value, buffer, pos, max_size);
      }
      buffer[(*pos)++] = '}';
      break;
  }
}

char* fl_json_stringify(fl_json_value_t *value) {
  char *buffer = (char*)malloc(16384);
  int pos = 0;
  stringify_helper(value, buffer, &pos, 16384);
  buffer[pos] = '\0';
  return buffer;
}

char* fl_json_stringify_pretty(fl_json_value_t *value, int indent) {
  /* Simplified: same as stringify */
  return fl_json_stringify(value);
}

/* ===== Memory Management ===== */

void fl_json_free(fl_json_value_t *value) {
  if (!value) return;

  switch (value->type) {
    case FL_JSON_STRING:
      free(value->data.string_val);
      break;

    case FL_JSON_ARRAY:
      for (int i = 0; i < value->data.array.count; i++) {
        fl_json_free(value->data.array.items[i]);
      }
      free(value->data.array.items);
      break;

    case FL_JSON_OBJECT:
      for (int i = 0; i < value->data.object.count; i++) {
        free((char*)value->data.object.pairs[i].key);
        fl_json_free(value->data.object.pairs[i].value);
      }
      free(value->data.object.pairs);
      break;

    default:
      break;
  }

  free(value);
}
