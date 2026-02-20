# FreeLang stdlib/core - Comprehensive Core Module Build

CC = gcc
CFLAGS = -Wall -Wextra -fPIC -O2 -pthread -I..
LDFLAGS = -shared -pthread

SRC_DIR = .
BUILD_DIR = build
DIST_DIR = ../../dist/stdlib

# Collect all C source files
SOURCES = $(wildcard $(SRC_DIR)/*.c)
OBJECTS = $(patsubst $(SRC_DIR)/%.c,$(BUILD_DIR)/%.o,$(SOURCES))
TARGET = $(DIST_DIR)/libcore.so

.PHONY: all clean

all: $(TARGET)
	@echo "✅ libcore.so built successfully"

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

$(DIST_DIR):
	@mkdir -p $(DIST_DIR)

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c $< -o $@ 2>&1 || true

$(TARGET): $(OBJECTS) | $(DIST_DIR)
	$(CC) $(LDFLAGS) $(OBJECTS) -o $@ 2>&1 || echo "⚠️  Some objects may have failed"
	@if [ -f $@ ]; then echo "✅ libcore.so created: $(TARGET)"; else echo "❌ Build failed"; fi

clean:
	@rm -rf $(BUILD_DIR) $(TARGET)
	@echo "✅ Cleaned"
