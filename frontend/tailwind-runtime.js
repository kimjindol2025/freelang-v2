// ============================================================================
// Phase 14: Tailwind Runtime - Dynamic Class Manipulation & CSS Loading
// 클라이언트 측 동적 클래스 조작 및 CSS 로딩
// ============================================================================

/**
 * MiniTailwind Runtime System
 * - 동적 클래스 추가/제거
 * - 반응형 클래스 자동 처리
 * - 테마 전환
 * - 상태 클래스 관리
 */

class TailwindRuntime {
  constructor() {
    this.config = null;
    this.theme = this.getStoredTheme() || 'light';
    this.breakpoint = this.getCurrentBreakpoint();
    this.styleSheet = null;
    this.classList = new Set();
    this.init();
  }

  /**
   * 초기화 - Tailwind CSS 로드 및 설정
   */
  async init() {
    try {
      await this.loadTailwindCSS();
      this.observeDOM();
      this.setupResponsiveListener();
      this.applyTheme();
      console.log('[Tailwind] Runtime initialized successfully');
    } catch (error) {
      console.error('[Tailwind] Initialization failed:', error);
    }
  }

  /**
   * Tailwind CSS 동적 로드
   */
  async loadTailwindCSS() {
    const cssPath = this.theme === 'dark' ? '/styles-dark.css' : '/styles.css';

    if (!document.getElementById('tailwind-css')) {
      const link = document.createElement('link');
      link.id = 'tailwind-css';
      link.rel = 'stylesheet';
      link.href = cssPath;
      document.head.appendChild(link);

      // CSS 로드 완료 대기
      return new Promise((resolve) => {
        link.onload = resolve;
        // 2초 타임아웃
        setTimeout(resolve, 2000);
      });
    }
  }

  /**
   * 현재 테마 반환
   */
  getCurrentTheme() {
    return this.theme;
  }

  /**
   * 테마 전환
   */
  async switchTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn('[Tailwind] Invalid theme:', theme);
      return;
    }

    this.theme = theme;
    this.saveTheme(theme);
    await this.loadTailwindCSS();
    this.applyTheme();

    // 테마 변경 이벤트 발생
    document.dispatchEvent(new CustomEvent('tailwind:themechange', { detail: { theme } }));
  }

  /**
   * 테마 적용
   */
  applyTheme() {
    const root = document.documentElement;
    if (this.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 저장된 선택 유지
    this.saveTheme(this.theme);
  }

  /**
   * 저장된 테마 반환
   */
  getStoredTheme() {
    try {
      return localStorage.getItem('tailwind-theme');
    } catch {
      return null;
    }
  }

  /**
   * 테마 저장
   */
  saveTheme(theme) {
    try {
      localStorage.setItem('tailwind-theme', theme);
    } catch {
      console.warn('[Tailwind] localStorage not available');
    }
  }

  /**
   * 현재 breakpoint 감지
   */
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 640) return 'sm';
    return 'xs';
  }

  /**
   * 반응형 리스너 설정
   */
  setupResponsiveListener() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newBreakpoint = this.getCurrentBreakpoint();
        if (newBreakpoint !== this.breakpoint) {
          this.breakpoint = newBreakpoint;
          document.dispatchEvent(new CustomEvent('tailwind:breakpoint', {
            detail: { breakpoint: newBreakpoint }
          }));
        }
      }, 200);
    });
  }

  /**
   * 요소에 Tailwind 클래스 추가
   */
  addClass(element, className) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (!element) return;

    const classes = className.split(' ').filter(c => c.trim());
    classes.forEach(cls => {
      element.classList.add(cls);
      this.classList.add(cls);
    });

    return element;
  }

  /**
   * 요소에서 Tailwind 클래스 제거
   */
  removeClass(element, className) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (!element) return;

    const classes = className.split(' ').filter(c => c.trim());
    classes.forEach(cls => {
      element.classList.remove(cls);
    });

    return element;
  }

  /**
   * 요소에서 Tailwind 클래스 전환
   */
  toggleClass(element, className) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (!element) return;

    element.classList.toggle(className);
    if (element.classList.contains(className)) {
      this.classList.add(className);
    }

    return element;
  }

  /**
   * 조건부 클래스 적용
   */
  applyClass(element, className, condition) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (!element) return;

    if (condition) {
      this.addClass(element, className);
    } else {
      this.removeClass(element, className);
    }

    return element;
  }

  /**
   * 반응형 클래스 자동 적용
   */
  applyResponsiveClass(element, baseClass) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (!element) return;

    // 기존 반응형 클래스 제거
    const responsive = ['sm-', 'md-', 'lg-', 'xl-'];
    element.classList.forEach(cls => {
      responsive.forEach(prefix => {
        if (cls.startsWith(prefix + baseClass.replace(/^\./, ''))) {
          element.classList.remove(cls);
        }
      });
    });

    // 현재 breakpoint에 맞는 클래스 추가
    const responsiveClass = `${this.breakpoint}-${baseClass}`;
    this.addClass(element, responsiveClass);

    return element;
  }

  /**
   * 상태 클래스 관리 (hover, focus, active)
   */
  addStateClass(element, state) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (!element) return;

    const stateClassMap = {
      'hover': 'hover:',
      'focus': 'focus:',
      'active': 'active:',
      'disabled': 'disabled:'
    };

    const prefix = stateClassMap[state];
    if (!prefix) {
      console.warn(`[Tailwind] Unknown state: ${state}`);
      return;
    }

    // 상태 클래스는 data 속성으로 추적
    element.dataset.tailwindState = (element.dataset.tailwindState || '') + state + ' ';

    return element;
  }

  /**
   * DOM 변경 감시 (동적으로 추가된 요소의 Tailwind 클래스 감지)
   */
  observeDOM() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              this.scanElementClasses(node);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  /**
   * 요소의 Tailwind 클래스 스캔
   */
  scanElementClasses(element) {
    if (element.classList) {
      element.classList.forEach(cls => {
        // Tailwind 클래스 패턴 감지
        if (this.isTailwindClass(cls)) {
          this.classList.add(cls);
        }
      });
    }

    // 자식 요소 재귀 스캔
    if (element.children) {
      Array.from(element.children).forEach(child => {
        this.scanElementClasses(child);
      });
    }
  }

  /**
   * Tailwind 클래스 패턴 감지
   */
  isTailwindClass(className) {
    const tailwindPatterns = [
      /^(sm-|md-|lg-|xl-)?flex/,
      /^(sm-|md-|lg-|xl-)?grid/,
      /^(sm-|md-|lg-|xl-)?block/,
      /^(sm-|md-|lg-|xl-)?hidden/,
      /^(sm-|md-|lg-|xl-)?p-/,
      /^(sm-|md-|lg-|xl-)?m-/,
      /^(sm-|md-|lg-|xl-)?gap-/,
      /^(sm-|md-|lg-|xl-)?w-/,
      /^(sm-|md-|lg-|xl-)?h-/,
      /^(sm-|md-|lg-|xl-)?text-/,
      /^(sm-|md-|lg-|xl-)?bg-/,
      /^(sm-|md-|lg-|xl-)?border/,
      /^(sm-|md-|lg-|xl-)?rounded/,
      /^(sm-|md-|lg-|xl-)?shadow/,
      /^hover-/,
      /^focus-/,
      /^active-/,
      /^disabled-/,
      /^transition/,
      /^duration-/,
      /^ease-/
    ];

    return tailwindPatterns.some(pattern => pattern.test(className));
  }

  /**
   * 사용된 Tailwind 클래스 목록
   */
  getUsedClasses() {
    return Array.from(this.classList);
  }

  /**
   * 통계 정보
   */
  getStats() {
    return {
      theme: this.theme,
      breakpoint: this.breakpoint,
      usedClasses: this.classList.size,
      classes: this.getUsedClasses()
    };
  }

  /**
   * 디버그 모드 활성화
   */
  enableDebugMode() {
    window.tailwind = {
      theme: this.getCurrentTheme(),
      switchTheme: (theme) => this.switchTheme(theme),
      addClass: (el, cls) => this.addClass(el, cls),
      removeClass: (el, cls) => this.removeClass(el, cls),
      toggleClass: (el, cls) => this.toggleClass(el, cls),
      getBreakpoint: () => this.breakpoint,
      getStats: () => this.getStats(),
      toggleDarkMode: () => this.switchTheme(this.theme === 'dark' ? 'light' : 'dark')
    };

    console.log('[Tailwind] Debug mode enabled. Use window.tailwind to access runtime.');
  }
}

// ============================================================================
// 초기화 및 전역 인스턴스
// ============================================================================

let tailwindRuntime = null;

document.addEventListener('DOMContentLoaded', () => {
  tailwindRuntime = new TailwindRuntime();
  tailwindRuntime.enableDebugMode();
});

// 편의 함수
window.tailwindSetTheme = (theme) => {
  if (tailwindRuntime) {
    tailwindRuntime.switchTheme(theme);
  }
};

window.tailwindToggleDarkMode = () => {
  if (tailwindRuntime) {
    const newTheme = tailwindRuntime.getCurrentTheme() === 'dark' ? 'light' : 'dark';
    tailwindRuntime.switchTheme(newTheme);
  }
};

window.tailwindAddClass = (selector, className) => {
  if (tailwindRuntime) {
    tailwindRuntime.addClass(selector, className);
  }
};

window.tailwindRemoveClass = (selector, className) => {
  if (tailwindRuntime) {
    tailwindRuntime.removeClass(selector, className);
  }
};

window.tailwindToggleClass = (selector, className) => {
  if (tailwindRuntime) {
    tailwindRuntime.toggleClass(selector, className);
  }
};

// 이벤트 리스너 예제
document.addEventListener('tailwind:themechange', (event) => {
  console.log('[Tailwind Event] Theme changed to:', event.detail.theme);
});

document.addEventListener('tailwind:breakpoint', (event) => {
  console.log('[Tailwind Event] Breakpoint changed to:', event.detail.breakpoint);
});

// Export (모듈 환경에서)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TailwindRuntime;
}
