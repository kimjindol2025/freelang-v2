/**
 * FreeLang stdlib/csv - CSV Processing
 * RFC 4180 compliant CSV parser, writer, quote handling, delimiter support
 */

#ifndef FREELANG_STDLIB_CSV_H
#define FREELANG_STDLIB_CSV_H

#include <stdint.h>

/* ===== CSV Row ===== */

typedef struct {
  char **fields;
  int field_count;
  int field_capacity;
} fl_csv_row_t;

/* ===== CSV Document ===== */

typedef struct {
  fl_csv_row_t *rows;
  int row_count;
  int row_capacity;

  char delimiter;           /* Default: ',' */
  char quote_char;          /* Default: '"' */
  int has_header;           /* 1 = first row is header */

  char **headers;           /* Column names if has_header */
  int header_count;
} fl_csv_t;

/* ===== Parser ===== */

typedef struct {
  const char *csv;
  int pos;
  int line;
  char delimiter;
  char quote_char;
  char *error_msg;
} fl_csv_parser_t;

/* ===== Public API ===== */

/* Parser creation */
fl_csv_parser_t* fl_csv_parser_create(const char *csv, char delimiter, char quote_char);
void fl_csv_parser_destroy(fl_csv_parser_t *parser);

/* Parsing */
fl_csv_t* fl_csv_parse(const char *csv);
fl_csv_t* fl_csv_parse_ex(fl_csv_parser_t *parser);
fl_csv_t* fl_csv_parse_with_options(const char *csv, char delimiter, char quote_char, int has_header);
const char* fl_csv_parser_error(fl_csv_parser_t *parser);

/* Row creation */
fl_csv_row_t* fl_csv_row_create(void);
void fl_csv_row_destroy(fl_csv_row_t *row);
int fl_csv_row_push(fl_csv_row_t *row, const char *field);
const char* fl_csv_row_get(fl_csv_row_t *row, int index);
int fl_csv_row_size(fl_csv_row_t *row);

/* CSV Document operations */
fl_csv_t* fl_csv_create(void);
void fl_csv_destroy(fl_csv_t *csv);

int fl_csv_add_row(fl_csv_t *csv, fl_csv_row_t *row);
fl_csv_row_t* fl_csv_get_row(fl_csv_t *csv, int row_index);
int fl_csv_row_count(fl_csv_t *csv);

/* Header access */
const char* fl_csv_get_header(fl_csv_t *csv, int col_index);
int fl_csv_get_column_index(fl_csv_t *csv, const char *header_name);
const char* fl_csv_get_cell_by_header(fl_csv_t *csv, int row_index, const char *header_name);
const char* fl_csv_get_cell(fl_csv_t *csv, int row_index, int col_index);

/* CSV Writing */
char* fl_csv_stringify(fl_csv_t *csv);
char* fl_csv_row_stringify(fl_csv_row_t *row, char delimiter, char quote_char);

/* Statistics */
typedef struct {
  int row_count;
  int column_count;
  int has_header;
} fl_csv_stats_t;

fl_csv_stats_t fl_csv_get_stats(fl_csv_t *csv);

#endif /* FREELANG_STDLIB_CSV_H */
