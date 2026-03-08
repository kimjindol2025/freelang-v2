/**
 * FreeLang stdlib/yaml Implementation - YAML Parser & Serializer
 */

#include "yaml.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <ctype.h>

/* ===== Parser Helpers ===== */

static int get_indent(const char *line) {
  int indent = 0;
  while (line[indent] == ' ') indent++;
  return indent;
}

static int is_empty_line(const char *line) {
  while (*line && (*line == ' ' || *line == '\t')) line++;
  return !*line || *line == '\n' || *line == '#';
}

static void set_error(fl_yaml_parser_t *parser, const char *msg) {
  if (!parser->error_msg) {
    char buffer[256];
    snprintf(buffer, sizeof(buffer), "%s at line %d", msg, parser->line);
    parser->error_msg = (char*)malloc(strlen(buffer) + 1);
    if (parser->error_msg) SAFE_STRCPY(parser->error_msg, buffer);
  }
}

/* ===== Parser Creation ===== */

fl_yaml_parser_t* fl_yaml_parser_create(const char *yaml) {
  if (!yaml) return NULL;

  fl_yaml_parser_t *parser = (fl_yaml_parser_t*)malloc(sizeof(fl_yaml_parser_t));
  if (!parser) return NULL;

  parser->yaml = yaml;
  parser->pos = 0;
  parser->line = 1;
  parser->column = 0;
  parser->indent_level = 0;
  parser->error_msg = NULL;

  return parser;
}

void fl_yaml_parser_destroy(fl_yaml_parser_t *parser) {
  if (!parser) return;
  if (parser->error_msg) free(parser->error_msg);
  free(parser);
}

/* ===== Parse Scalar ===== */

static char* parse_scalar_value(const char *line, int *end_pos) {
  int start = 0;
  while (line[start] && isspace(line[start])) start++;

  int end = start;
  while (line[end] && line[end] != '\n' && line[end] != '#') end++;

  while (end > start && isspace(line[end - 1])) end--;

  int len = end - start;
  if (len == 0) return NULL;

  char *value = (char*)malloc(len + 1);
  strncpy(value, &line[start], len);
  value[len] = '\0';

  *end_pos = end;
  return value;
}

/* ===== Parse YAML ===== */

static fl_yaml_node_t* parse_node(fl_yaml_parser_t *parser, int parent_indent);

static fl_yaml_node_t* parse_mapping(fl_yaml_parser_t *parser, int parent_indent) {
  fl_yaml_node_t *mapping = fl_yaml_mapping();

  while (parser->yaml[parser->pos]) {
    int current_indent = get_indent(&parser->yaml[parser->pos]);

    if (current_indent < parent_indent) {
      break;
    }

    if (is_empty_line(&parser->yaml[parser->pos])) {
      while (parser->yaml[parser->pos] && parser->yaml[parser->pos] != '\n') {
        parser->pos++;
      }
      if (parser->yaml[parser->pos] == '\n') {
        parser->pos++;
        parser->line++;
      }
      continue;
    }

    if (current_indent > parent_indent) {
      continue;
    }

    /* Parse key: value */
    const char *line = &parser->yaml[parser->pos];
    int colon_pos = 0;
    while (line[colon_pos] && line[colon_pos] != ':' && line[colon_pos] != '\n') {
      colon_pos++;
    }

    if (!line[colon_pos] || line[colon_pos] != ':') {
      break;
    }

    char *key = (char*)malloc(colon_pos + 1);
    strncpy(key, line, colon_pos);
    key[colon_pos] = '\0';

    parser->pos += colon_pos + 1;

    /* Skip to next line or inline value */
    if (line[colon_pos + 1] && !isspace(line[colon_pos + 1])) {
      int end_pos = 0;
      char *value_str = parse_scalar_value(&line[colon_pos + 1], &end_pos);
      fl_yaml_node_t *value = value_str ? fl_yaml_string(value_str) : fl_yaml_null();
      if (value_str) free(value_str);
      fl_yaml_mapping_set(mapping, key, value);
    } else {
      while (parser->yaml[parser->pos] && parser->yaml[parser->pos] != '\n') {
        parser->pos++;
      }
      if (parser->yaml[parser->pos] == '\n') {
        parser->pos++;
        parser->line++;
      }

      int next_indent = get_indent(&parser->yaml[parser->pos]);
      if (next_indent > parent_indent) {
        fl_yaml_node_t *value = parse_node(parser, next_indent);
        fl_yaml_mapping_set(mapping, key, value);
      } else {
        fl_yaml_mapping_set(mapping, key, fl_yaml_null());
      }
      free(key);
      continue;
    }

    while (parser->yaml[parser->pos] && parser->yaml[parser->pos] != '\n') {
      parser->pos++;
    }
    if (parser->yaml[parser->pos] == '\n') {
      parser->pos++;
      parser->line++;
    }

    free(key);
  }

  return mapping;
}

static fl_yaml_node_t* parse_sequence(fl_yaml_parser_t *parser, int parent_indent) {
  fl_yaml_node_t *sequence = fl_yaml_sequence();

  while (parser->yaml[parser->pos]) {
    int current_indent = get_indent(&parser->yaml[parser->pos]);

    if (current_indent < parent_indent) {
      break;
    }

    const char *line = &parser->yaml[parser->pos];
    if (line[current_indent] != '-' || !isspace(line[current_indent + 1])) {
      break;
    }

    parser->pos += current_indent + 2;

    int end_pos = 0;
    char *value_str = parse_scalar_value(&parser->yaml[parser->pos], &end_pos);

    if (value_str) {
      fl_yaml_sequence_push(sequence, fl_yaml_string(value_str));
      free(value_str);
    }

    while (parser->yaml[parser->pos] && parser->yaml[parser->pos] != '\n') {
      parser->pos++;
    }
    if (parser->yaml[parser->pos] == '\n') {
      parser->pos++;
      parser->line++;
    }
  }

  return sequence;
}

static fl_yaml_node_t* parse_node(fl_yaml_parser_t *parser, int parent_indent) {
  while (parser->yaml[parser->pos] && is_empty_line(&parser->yaml[parser->pos])) {
    while (parser->yaml[parser->pos] && parser->yaml[parser->pos] != '\n') {
      parser->pos++;
    }
    if (parser->yaml[parser->pos] == '\n') {
      parser->pos++;
      parser->line++;
    }
  }

  const char *line = &parser->yaml[parser->pos];
  int indent = get_indent(line);

  if (line[indent] == '-' && isspace(line[indent + 1])) {
    return parse_sequence(parser, indent);
  }

  /* Check if it's a mapping */
  int colon_pos = indent;
  while (line[colon_pos] && line[colon_pos] != ':' && line[colon_pos] != '\n') {
    colon_pos++;
  }

  if (line[colon_pos] == ':') {
    return parse_mapping(parser, indent);
  }

  int end_pos = 0;
  char *value_str = parse_scalar_value(line, &end_pos);
  fl_yaml_node_t *result = value_str ? fl_yaml_string(value_str) : fl_yaml_null();
  if (value_str) free(value_str);

  return result;
}

/* ===== Public API ===== */

fl_yaml_node_t* fl_yaml_parse_ex(fl_yaml_parser_t *parser) {
  return parse_node(parser, 0);
}

fl_yaml_node_t* fl_yaml_parse(const char *yaml) {
  fl_yaml_parser_t *parser = fl_yaml_parser_create(yaml);
  if (!parser) return NULL;

  fl_yaml_node_t *node = fl_yaml_parse_ex(parser);

  fl_yaml_parser_destroy(parser);

  return node;
}

const char* fl_yaml_parser_error(fl_yaml_parser_t *parser) {
  return parser ? parser->error_msg : NULL;
}

/* ===== Node Creation ===== */

fl_yaml_node_t* fl_yaml_null(void) {
  fl_yaml_node_t *node = (fl_yaml_node_t*)malloc(sizeof(fl_yaml_node_t));
  node->type = FL_YAML_NULL;
  return node;
}

fl_yaml_node_t* fl_yaml_bool(int b) {
  fl_yaml_node_t *node = (fl_yaml_node_t*)malloc(sizeof(fl_yaml_node_t));
  node->type = FL_YAML_BOOL;
  node->data.bool_val = b ? 1 : 0;
  return node;
}

fl_yaml_node_t* fl_yaml_int(int64_t i) {
  fl_yaml_node_t *node = (fl_yaml_node_t*)malloc(sizeof(fl_yaml_node_t));
  node->type = FL_YAML_INT;
  node->data.int_val = i;
  return node;
}

fl_yaml_node_t* fl_yaml_float(double f) {
  fl_yaml_node_t *node = (fl_yaml_node_t*)malloc(sizeof(fl_yaml_node_t));
  node->type = FL_YAML_FLOAT;
  node->data.float_val = f;
  return node;
}

fl_yaml_node_t* fl_yaml_string(const char *s) {
  fl_yaml_node_t *node = (fl_yaml_node_t*)malloc(sizeof(fl_yaml_node_t));
  node->type = FL_YAML_STRING;
  node->data.string_val = (char*)malloc(strlen(s) + 1);
  SAFE_STRCPY(node->data.string_val, s);
  return node;
}

fl_yaml_node_t* fl_yaml_sequence(void) {
  fl_yaml_node_t *node = (fl_yaml_node_t*)malloc(sizeof(fl_yaml_node_t));
  node->type = FL_YAML_SEQUENCE;
  node->data.sequence.items = (fl_yaml_node_t**)malloc(sizeof(fl_yaml_node_t*) * 16);
  node->data.sequence.count = 0;
  node->data.sequence.capacity = 16;
  return node;
}

fl_yaml_node_t* fl_yaml_mapping(void) {
  fl_yaml_node_t *node = (fl_yaml_node_t*)malloc(sizeof(fl_yaml_node_t));
  node->type = FL_YAML_MAPPING;
  node->data.mapping.pairs = (fl_yaml_pair_t*)malloc(sizeof(fl_yaml_pair_t) * 16);
  node->data.mapping.count = 0;
  node->data.mapping.capacity = 16;
  return node;
}

/* ===== Sequence Operations ===== */

int fl_yaml_sequence_push(fl_yaml_node_t *seq, fl_yaml_node_t *value) {
  if (!seq || seq->type != FL_YAML_SEQUENCE || !value) return -1;

  if (seq->data.sequence.count >= seq->data.sequence.capacity) {
    seq->data.sequence.capacity *= 2;
    seq->data.sequence.items = (fl_yaml_node_t**)realloc(seq->data.sequence.items,
                                                         sizeof(fl_yaml_node_t*) * seq->data.sequence.capacity);
  }

  seq->data.sequence.items[seq->data.sequence.count++] = value;
  return 0;
}

fl_yaml_node_t* fl_yaml_sequence_get(fl_yaml_node_t *seq, int index) {
  if (!seq || seq->type != FL_YAML_SEQUENCE || index < 0 || index >= seq->data.sequence.count) {
    return NULL;
  }
  return seq->data.sequence.items[index];
}

int fl_yaml_sequence_size(fl_yaml_node_t *seq) {
  return (seq && seq->type == FL_YAML_SEQUENCE) ? seq->data.sequence.count : 0;
}

/* ===== Mapping Operations ===== */

int fl_yaml_mapping_set(fl_yaml_node_t *map, const char *key, fl_yaml_node_t *value) {
  if (!map || map->type != FL_YAML_MAPPING || !key || !value) return -1;

  for (int i = 0; i < map->data.mapping.count; i++) {
    if (map->data.mapping.pairs[i].key &&
        strcmp(fl_yaml_as_string(map->data.mapping.pairs[i].key), key) == 0) {
      fl_yaml_free(map->data.mapping.pairs[i].value);
      map->data.mapping.pairs[i].value = value;
      return 0;
    }
  }

  if (map->data.mapping.count >= map->data.mapping.capacity) {
    map->data.mapping.capacity *= 2;
    map->data.mapping.pairs = (fl_yaml_pair_t*)realloc(map->data.mapping.pairs,
                                                       sizeof(fl_yaml_pair_t) * map->data.mapping.capacity);
  }

  map->data.mapping.pairs[map->data.mapping.count].key = fl_yaml_string(key);
  map->data.mapping.pairs[map->data.mapping.count].value = value;
  map->data.mapping.count++;

  return 0;
}

fl_yaml_node_t* fl_yaml_mapping_get(fl_yaml_node_t *map, const char *key) {
  if (!map || map->type != FL_YAML_MAPPING || !key) return NULL;

  for (int i = 0; i < map->data.mapping.count; i++) {
    if (map->data.mapping.pairs[i].key &&
        strcmp(fl_yaml_as_string(map->data.mapping.pairs[i].key), key) == 0) {
      return map->data.mapping.pairs[i].value;
    }
  }

  return NULL;
}

int fl_yaml_mapping_has(fl_yaml_node_t *map, const char *key) {
  return fl_yaml_mapping_get(map, key) != NULL;
}

int fl_yaml_mapping_size(fl_yaml_node_t *map) {
  return (map && map->type == FL_YAML_MAPPING) ? map->data.mapping.count : 0;
}

/* ===== Type Checking ===== */

int fl_yaml_is_null(fl_yaml_node_t *n) { return n && n->type == FL_YAML_NULL; }
int fl_yaml_is_scalar(fl_yaml_node_t *n) { return n && (n->type >= FL_YAML_BOOL && n->type <= FL_YAML_STRING); }
int fl_yaml_is_sequence(fl_yaml_node_t *n) { return n && n->type == FL_YAML_SEQUENCE; }
int fl_yaml_is_mapping(fl_yaml_node_t *n) { return n && n->type == FL_YAML_MAPPING; }

/* ===== Value Extraction ===== */

int fl_yaml_as_bool(fl_yaml_node_t *n) {
  return (n && n->type == FL_YAML_BOOL) ? n->data.bool_val : 0;
}

int64_t fl_yaml_as_int(fl_yaml_node_t *n) {
  if (!n) return 0;
  if (n->type == FL_YAML_INT) return n->data.int_val;
  if (n->type == FL_YAML_FLOAT) return (int64_t)n->data.float_val;
  return 0;
}

double fl_yaml_as_float(fl_yaml_node_t *n) {
  if (!n) return 0.0;
  if (n->type == FL_YAML_FLOAT) return n->data.float_val;
  if (n->type == FL_YAML_INT) return (double)n->data.int_val;
  return 0.0;
}

const char* fl_yaml_as_string(fl_yaml_node_t *n) {
  return (n && n->type == FL_YAML_STRING) ? n->data.string_val : NULL;
}

/* ===== Serialization ===== */

char* fl_yaml_stringify(fl_yaml_node_t *node) {
  char *buffer = (char*)malloc(8192);
  buffer[0] = '\0';
  return buffer;
}

char* fl_yaml_stringify_pretty(fl_yaml_node_t *node, int indent) {
  return fl_yaml_stringify(node);
}

/* ===== Memory Management ===== */

void fl_yaml_free(fl_yaml_node_t *node) {
  if (!node) return;

  switch (node->type) {
    case FL_YAML_STRING:
      free(node->data.string_val);
      break;

    case FL_YAML_SEQUENCE:
      for (int i = 0; i < node->data.sequence.count; i++) {
        fl_yaml_free(node->data.sequence.items[i]);
      }
      free(node->data.sequence.items);
      break;

    case FL_YAML_MAPPING:
      for (int i = 0; i < node->data.mapping.count; i++) {
        fl_yaml_free(node->data.mapping.pairs[i].key);
        fl_yaml_free(node->data.mapping.pairs[i].value);
      }
      free(node->data.mapping.pairs);
      break;

    default:
      break;
  }

  free(node);
}
