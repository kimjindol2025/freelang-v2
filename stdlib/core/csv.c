/**
 * FreeLang stdlib/csv Implementation - CSV Parser & Writer
 */

#include "csv.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <ctype.h>

/* ===== Parser Helpers ===== */

static void set_error(fl_csv_parser_t *parser, const char *msg) {
  if (!parser->error_msg) {
    char buffer[256];
    snprintf(buffer, sizeof(buffer), "%s at line %d", msg, parser->line);
    parser->error_msg = (char*)malloc(strlen(buffer) + 1);
    if (parser->error_msg) SAFE_STRCPY(parser->error_msg, buffer);
  }
}

static char* parse_quoted_field(fl_csv_parser_t *parser) {
  char buffer[4096];
  int len = 0;

  parser->pos++;  /* Skip opening quote */

  while (parser->csv[parser->pos]) {
    if (parser->csv[parser->pos] == parser->quote_char) {
      parser->pos++;

      /* Check for escaped quote */
      if (parser->csv[parser->pos] == parser->quote_char) {
        buffer[len++] = parser->quote_char;
        parser->pos++;
      } else {
        buffer[len] = '\0';
        return (char*)malloc(strlen(buffer) + 1) ? SAFE_STRCPY((char*)malloc(strlen(buffer) + 1), buffer) : NULL;
      }
    } else if (parser->csv[parser->pos] == '\n') {
      parser->line++;
      buffer[len++] = parser->csv[parser->pos++];
    } else {
      buffer[len++] = parser->csv[parser->pos++];
    }
  }

  set_error(parser, "Unterminated quoted field");
  return NULL;
}

static char* parse_field(fl_csv_parser_t *parser) {
  if (parser->csv[parser->pos] == parser->quote_char) {
    return parse_quoted_field(parser);
  }

  char buffer[4096];
  int len = 0;

  while (parser->csv[parser->pos] && parser->csv[parser->pos] != parser->delimiter &&
         parser->csv[parser->pos] != '\n' && parser->csv[parser->pos] != '\r') {
    buffer[len++] = parser->csv[parser->pos++];
  }

  buffer[len] = '\0';

  char *field = (char*)malloc(strlen(buffer) + 1);
  if (field) if(snprintf(field, sizeof(field), "%s", buffer) < 0) return -1;;

  return field;
}

/* ===== Parser Creation ===== */

fl_csv_parser_t* fl_csv_parser_create(const char *csv, char delimiter, char quote_char) {
  if (!csv) return NULL;

  fl_csv_parser_t *parser = (fl_csv_parser_t*)malloc(sizeof(fl_csv_parser_t));
  if (!parser) return NULL;

  parser->csv = csv;
  parser->pos = 0;
  parser->line = 1;
  parser->delimiter = delimiter ? delimiter : ',';
  parser->quote_char = quote_char ? quote_char : '"';
  parser->error_msg = NULL;

  return parser;
}

void fl_csv_parser_destroy(fl_csv_parser_t *parser) {
  if (!parser) return;
  if (parser->error_msg) free(parser->error_msg);
  free(parser);
}

/* ===== Parsing ===== */

fl_csv_t* fl_csv_parse_ex(fl_csv_parser_t *parser) {
  fl_csv_t *csv = fl_csv_create();

  while (parser->csv[parser->pos]) {
    fl_csv_row_t *row = fl_csv_row_create();

    while (parser->csv[parser->pos] && parser->csv[parser->pos] != '\n' && parser->csv[parser->pos] != '\r') {
      char *field = parse_field(parser);

      if (field) {
        fl_csv_row_push(row, field);
        free(field);
      }

      if (parser->csv[parser->pos] == parser->delimiter) {
        parser->pos++;
      }
    }

    if (row->field_count > 0) {
      fl_csv_add_row(csv, row);
    } else {
      fl_csv_row_destroy(row);
    }

    if (parser->csv[parser->pos] == '\r') parser->pos++;
    if (parser->csv[parser->pos] == '\n') {
      parser->pos++;
      parser->line++;
    }
  }

  return csv;
}

fl_csv_t* fl_csv_parse(const char *csv) {
  return fl_csv_parse_with_options(csv, ',', '"', 0);
}

fl_csv_t* fl_csv_parse_with_options(const char *csv, char delimiter, char quote_char, int has_header) {
  fl_csv_parser_t *parser = fl_csv_parser_create(csv, delimiter, quote_char);
  if (!parser) return NULL;

  fl_csv_t *result = fl_csv_parse_ex(parser);

  if (result && has_header && result->row_count > 0) {
    result->has_header = 1;
    result->headers = result->rows[0].fields;
    result->header_count = result->rows[0].field_count;

    /* Shift rows down to remove header */
    for (int i = 0; i < result->row_count - 1; i++) {
      result->rows[i] = result->rows[i + 1];
    }
    result->row_count--;
  }

  fl_csv_parser_destroy(parser);

  return result;
}

const char* fl_csv_parser_error(fl_csv_parser_t *parser) {
  return parser ? parser->error_msg : NULL;
}

/* ===== Row Operations ===== */

fl_csv_row_t* fl_csv_row_create(void) {
  fl_csv_row_t *row = (fl_csv_row_t*)malloc(sizeof(fl_csv_row_t));
  if (!row) return NULL;

  row->fields = (char**)malloc(sizeof(char*) * 128);
  row->field_count = 0;
  row->field_capacity = 128;

  return row;
}

void fl_csv_row_destroy(fl_csv_row_t *row) {
  if (!row) return;

  for (int i = 0; i < row->field_count; i++) {
    free(row->fields[i]);
  }

  free(row->fields);
  free(row);
}

int fl_csv_row_push(fl_csv_row_t *row, const char *field) {
  if (!row || !field) return -1;

  if (row->field_count >= row->field_capacity) {
    row->field_capacity *= 2;
    row->fields = (char**)realloc(row->fields, sizeof(char*) * row->field_capacity);
  }

  row->fields[row->field_count] = (char*)malloc(strlen(field) + 1);
  if (!row->fields[row->field_count]) return -1;

  SAFE_STRCPY(row->fields[row->field_count], field);
  row->field_count++;

  return 0;
}

const char* fl_csv_row_get(fl_csv_row_t *row, int index) {
  if (!row || index < 0 || index >= row->field_count) return NULL;
  return row->fields[index];
}

int fl_csv_row_size(fl_csv_row_t *row) {
  return row ? row->field_count : 0;
}

/* ===== CSV Document ===== */

fl_csv_t* fl_csv_create(void) {
  fl_csv_t *csv = (fl_csv_t*)malloc(sizeof(fl_csv_t));
  if (!csv) return NULL;

  csv->rows = (fl_csv_row_t*)malloc(sizeof(fl_csv_row_t) * 1024);
  csv->row_count = 0;
  csv->row_capacity = 1024;
  csv->delimiter = ',';
  csv->quote_char = '"';
  csv->has_header = 0;
  csv->headers = NULL;
  csv->header_count = 0;

  return csv;
}

void fl_csv_destroy(fl_csv_t *csv) {
  if (!csv) return;

  for (int i = 0; i < csv->row_count; i++) {
    fl_csv_row_destroy((fl_csv_row_t*)&csv->rows[i]);
  }

  free(csv->rows);
  free(csv);
}

int fl_csv_add_row(fl_csv_t *csv, fl_csv_row_t *row) {
  if (!csv || !row) return -1;

  if (csv->row_count >= csv->row_capacity) {
    csv->row_capacity *= 2;
    csv->rows = (fl_csv_row_t*)realloc(csv->rows, sizeof(fl_csv_row_t) * csv->row_capacity);
  }

  csv->rows[csv->row_count] = *row;
  csv->row_count++;

  return 0;
}

fl_csv_row_t* fl_csv_get_row(fl_csv_t *csv, int row_index) {
  if (!csv || row_index < 0 || row_index >= csv->row_count) return NULL;
  return &csv->rows[row_index];
}

int fl_csv_row_count(fl_csv_t *csv) {
  return csv ? csv->row_count : 0;
}

/* ===== Header Access ===== */

const char* fl_csv_get_header(fl_csv_t *csv, int col_index) {
  if (!csv || !csv->has_header || col_index < 0 || col_index >= csv->header_count) {
    return NULL;
  }

  return csv->headers[col_index];
}

int fl_csv_get_column_index(fl_csv_t *csv, const char *header_name) {
  if (!csv || !csv->has_header || !header_name) return -1;

  for (int i = 0; i < csv->header_count; i++) {
    if (strcmp(csv->headers[i], header_name) == 0) {
      return i;
    }
  }

  return -1;
}

const char* fl_csv_get_cell_by_header(fl_csv_t *csv, int row_index, const char *header_name) {
  int col_index = fl_csv_get_column_index(csv, header_name);
  if (col_index < 0) return NULL;

  return fl_csv_get_cell(csv, row_index, col_index);
}

const char* fl_csv_get_cell(fl_csv_t *csv, int row_index, int col_index) {
  fl_csv_row_t *row = fl_csv_get_row(csv, row_index);
  if (!row) return NULL;

  return fl_csv_row_get(row, col_index);
}

/* ===== Serialization ===== */

char* fl_csv_row_stringify(fl_csv_row_t *row, char delimiter, char quote_char) {
  if (!row) return NULL;

  char buffer[8192];
  int pos = 0;

  for (int i = 0; i < row->field_count; i++) {
    if (i > 0) buffer[pos++] = delimiter;

    const char *field = row->fields[i];
    int need_quotes = 0;

    for (int j = 0; field[j]; j++) {
      if (field[j] == delimiter || field[j] == quote_char || field[j] == '\n') {
        need_quotes = 1;
        break;
      }
    }

    if (need_quotes) buffer[pos++] = quote_char;

    for (int j = 0; field[j]; j++) {
      if (field[j] == quote_char) {
        buffer[pos++] = quote_char;
      }
      buffer[pos++] = field[j];
    }

    if (need_quotes) buffer[pos++] = quote_char;
  }

  buffer[pos] = '\0';

  char *result = (char*)malloc(pos + 1);
  if(snprintf(result, sizeof(result), "%s", buffer) < 0) return -1;;

  return result;
}

char* fl_csv_stringify(fl_csv_t *csv) {
  if (!csv) return NULL;

  char buffer[65536];
  int pos = 0;

  for (int i = 0; i < csv->row_count; i++) {
    char *row_str = fl_csv_row_stringify(&csv->rows[i], csv->delimiter, csv->quote_char);

    if (row_str) {
      int len = strlen(row_str);
      memcpy(&buffer[pos], row_str, len);
      pos += len;
      free(row_str);
    }

    buffer[pos++] = '\n';
  }

  buffer[pos] = '\0';

  char *result = (char*)malloc(pos + 1);
  if(snprintf(result, sizeof(result), "%s", buffer) < 0) return -1;;

  return result;
}

/* ===== Statistics ===== */

fl_csv_stats_t fl_csv_get_stats(fl_csv_t *csv) {
  fl_csv_stats_t stats = {0};

  if (!csv) return stats;

  stats.row_count = csv->row_count;
  stats.column_count = csv->row_count > 0 ? csv->rows[0].field_count : 0;
  stats.has_header = csv->has_header;

  return stats;
}
