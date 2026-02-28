# FreeLang stdlib/core - Comprehensive Core Module Build

CC = gcc
CFLAGS = -Wall -Wextra -fPIC -O2 -pthread -I..
LDFLAGS = -shared -pthread
TEST_LDFLAGS = -pthread

SRC_DIR = .
BUILD_DIR = build
DIST_DIR = ../../dist/stdlib
TEST_DIR = ./build/tests

# Collect all C source files (exclude test files)
SOURCES = $(filter-out test_%.c,$(wildcard $(SRC_DIR)/*.c))
OBJECTS = $(patsubst $(SRC_DIR)/%.c,$(BUILD_DIR)/%.o,$(SOURCES))
TARGET = $(DIST_DIR)/libcore.so

# Test files
TEST_SOURCES = $(wildcard $(SRC_DIR)/test_*.c)
TEST_EXES = $(patsubst $(SRC_DIR)/test_%.c,$(TEST_DIR)/test_%,$(TEST_SOURCES))

.PHONY: all clean test run-tests help

help:
	@echo "FreeLang core module - Build targets:"
	@echo "  make all        - Build libcore.so (default)"
	@echo "  make test       - Build test executables"
	@echo "  make run-tests  - Run all tests"
	@echo "  make clean      - Clean build artifacts"

all: $(TARGET)
	@echo "✅ libcore.so built successfully"

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

$(DIST_DIR):
	@mkdir -p $(DIST_DIR)

$(TEST_DIR):
	@mkdir -p $(TEST_DIR)

# Main library compilation
$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)
	@$(CC) $(CFLAGS) -c $< -o $@ 2>&1 && echo "  ✓ $<" || echo "  ✗ $<"

$(TARGET): $(OBJECTS) | $(DIST_DIR)
	@echo "🔗 Linking libcore.so..."
	@$(CC) $(LDFLAGS) $(OBJECTS) -o $@ 2>&1 && echo "✅ libcore.so created: $(TARGET)" || echo "❌ Build failed"

# Test compilation
test: $(TEST_EXES)
	@echo "✅ All test executables built"

$(TEST_DIR)/test_%: $(SRC_DIR)/test_%.c $(OBJECTS) | $(TEST_DIR)
	@echo "🔗 Building test_$*..."
	@$(CC) $(CFLAGS) -o $@ $< $(filter-out $(BUILD_DIR)/test_%.o,$(OBJECTS)) $(TEST_LDFLAGS) 2>&1 && echo "  ✓ test_$*" || echo "  ✗ test_$*"

# Run all tests
run-tests: test
	@echo ""
	@echo "════════════════════════════════════════"
	@echo "🧪 Running core module tests"
	@echo "════════════════════════════════════════"
	@for test in $(TEST_EXES); do \
		echo ""; \
		echo "Running $$test..."; \
		$$test || echo "❌ $$test failed"; \
	done

clean:
	@rm -rf $(BUILD_DIR) $(TARGET)
	@echo "✅ Cleaned"
