#!/bin/bash

# FreeLang v2 - FFI C 라이브러리 전체 빌드 스크립트
# 사용법: ./scripts/build-ffi-all.sh [debug|release]

set -e

BUILD_MODE="${1:-release}"
BUILD_DIR="./dist/ffi"

echo "╔════════════════════════════════════════════════╗"
echo "║   FreeLang v2 FFI C Library Build ($BUILD_MODE)    ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# 빌드 옵션
if [ "$BUILD_MODE" = "debug" ]; then
  CFLAGS="-O0 -g"
  echo "📍 Debug 모드 (최적화 없음, 디버깅 심볼 포함)"
else
  CFLAGS="-O2"
  echo "📍 Release 모드 (최적화 ON)"
fi

# 디렉토리 생성
mkdir -p "$BUILD_DIR"
echo ""
echo "📁 Build 디렉토리: $BUILD_DIR"
echo ""

# 컴파일 카운터
SUCCESS=0
FAILED=0

compile_module() {
  local name="$1"
  local src="$2"
  local output="$BUILD_DIR/lib${name}.so"

  echo -n "📦 $name... "

  if gcc -fPIC -shared -I/usr/include/node $CFLAGS \
    "$src" \
    stdlib/ffi/freelang_ffi.c \
    -o "$output" \
    /usr/lib/x86_64-linux-gnu/libuv.so.1 \
    -lpthread 2>/dev/null; then

    size=$(ls -lh "$output" | awk '{print $5}')
    symbols=$(nm -D "$output" 2>/dev/null | grep " T " | wc -l)

    echo "✅ OK | $size | $symbols functions"
    ((SUCCESS++))
  else
    echo "❌ FAILED"
    ((FAILED++))
  fi
}

# 모듈별 빌드
echo "🔨 Compiling modules..."
echo ""

compile_module "stream" "stdlib/stream/stream.c"
compile_module "ws" "stdlib/ws/ws.c"
compile_module "http2" "stdlib/http2/http2.c"
compile_module "http" "stdlib/http/http_server_impl.c"
compile_module "event_loop" "stdlib/http/event_loop.c"
compile_module "timer" "stdlib/timer/timer.c"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║                  Build Summary                 ║"
echo "╠════════════════════════════════════════════════╣"
echo "│ Success: $SUCCESS | Failed: $FAILED"
echo "╚════════════════════════════════════════════════╝"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ 모든 모듈 컴파일 성공!"
  echo ""
  echo "📊 생성된 라이브러리:"
  ls -lh "$BUILD_DIR"/*.so | awk '{printf "   %-20s %s\n", $9, $5}'
  echo ""
  echo "🔗 심볼 확인:"
  for lib in "$BUILD_DIR"/*.so; do
    count=$(nm -D "$lib" 2>/dev/null | grep " T " | wc -l)
    printf "   %-20s %3d functions\n" "$(basename $lib)" "$count"
  done
  echo ""
  echo "📥 설치 (선택):"
  echo "   sudo cp $BUILD_DIR/*.so /usr/local/lib/"
  echo "   sudo ldconfig"
  echo ""
  exit 0
else
  echo "❌ 빌드 실패: $FAILED개 모듈"
  exit 1
fi
