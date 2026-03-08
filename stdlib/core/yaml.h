/**
 * FreeLang stdlib/yaml - YAML Parsing & Serialization
 * YAML 1.2 compliant, indentation-based, mapping/sequence/scalar support
 */

#ifndef FREELANG_STDLIB_YAML_H
#define FREELANG_STDLIB_YAML_H

#include <stdint.h>

/* ===== YAML Value Types ===== */

typedef enum {
  FL_YAML_NULL = 0,
  FL_YAML_BOOL = 1,
  FL_YAML_INT = 2,
  FL_YAML_FLOAT = 3,
  FL_YAML_STRING = 4,
  FL_YAML_SEQUENCE = 5,    /* Array/List */
  FL_YAML_MAPPING = 6      /* Dict/Object */
} fl_yaml_type_t;

/* Forward declaration */
typedef struct fl_yaml_node fl_yaml_node_t;

typedef struct {
  fl_yaml_node_t *key;
  fl_yaml_node_t *value;
} fl_yaml_pair_t;

/* ===== YAML Node ===== */

typedef struct fl_yaml_node {
  fl_yaml_type_t type;

  union {
    int bool_val;
    int64_t int_val;
    double float_val;
    char *string_val;

    struct {
      fl_yaml_node_t **items;
      int count;
      int capacity;
    } sequence;

    struct {
      fl_yaml_pair_t *pairs;
      int count;
      int capacity;
    } mapping;
  } data;
} fl_yaml_node_t;

/* ===== Parser ===== */

typedef struct {
  const char *yaml;
  int pos;
  int line;
  int column;
  int indent_level;
  char *error_msg;
} fl_yaml_parser_t;

/* ===== Public API ===== */

/* Parser creation */
fl_yaml_parser_t* fl_yaml_parser_create(const char *yaml);
void fl_yaml_parser_destroy(fl_yaml_parser_t *parser);

/* Parsing */
fl_yaml_node_t* fl_yaml_parse(const char *yaml);
fl_yaml_node_t* fl_yaml_parse_ex(fl_yaml_parser_t *parser);
const char* fl_yaml_parser_error(fl_yaml_parser_t *parser);

/* Node creation */
fl_yaml_node_t* fl_yaml_null(void);
fl_yaml_node_t* fl_yaml_bool(int value);
fl_yaml_node_t* fl_yaml_int(int64_t value);
fl_yaml_node_t* fl_yaml_float(double value);
fl_yaml_node_t* fl_yaml_string(const char *value);
fl_yaml_node_t* fl_yaml_sequence(void);
fl_yaml_node_t* fl_yaml_mapping(void);

/* Sequence operations */
int fl_yaml_sequence_push(fl_yaml_node_t *seq, fl_yaml_node_t *value);
fl_yaml_node_t* fl_yaml_sequence_get(fl_yaml_node_t *seq, int index);
int fl_yaml_sequence_size(fl_yaml_node_t *seq);

/* Mapping operations */
int fl_yaml_mapping_set(fl_yaml_node_t *map, const char *key, fl_yaml_node_t *value);
fl_yaml_node_t* fl_yaml_mapping_get(fl_yaml_node_t *map, const char *key);
int fl_yaml_mapping_has(fl_yaml_node_t *map, const char *key);
int fl_yaml_mapping_size(fl_yaml_node_t *map);

/* Type checking */
int fl_yaml_is_null(fl_yaml_node_t *node);
int fl_yaml_is_scalar(fl_yaml_node_t *node);
int fl_yaml_is_sequence(fl_yaml_node_t *node);
int fl_yaml_is_mapping(fl_yaml_node_t *node);

/* Value extraction */
int fl_yaml_as_bool(fl_yaml_node_t *node);
int64_t fl_yaml_as_int(fl_yaml_node_t *node);
double fl_yaml_as_float(fl_yaml_node_t *node);
const char* fl_yaml_as_string(fl_yaml_node_t *node);

/* Serialization */
char* fl_yaml_stringify(fl_yaml_node_t *node);
char* fl_yaml_stringify_pretty(fl_yaml_node_t *node, int indent);

/* Memory management */
void fl_yaml_free(fl_yaml_node_t *node);

#endif /* FREELANG_STDLIB_YAML_H */
