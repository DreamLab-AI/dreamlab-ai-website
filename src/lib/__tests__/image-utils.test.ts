import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateResponsiveSrcSet,
  generateSizes,
  getOptimalImageSize,
  getLQIPUrl,
  generateSVGPlaceholder,
  generateGradientPlaceholder,
  calculateAspectRatio,
  parseImageDimensions,
  debounce,
  throttle,
  supportsWebP,
  getOptimalImageFormat,
  CRITICAL_IMAGES,
  IMAGE_DEFAULTS,
} from "../image-utils";

describe("image-utils :: generateResponsiveSrcSet", () => {
  it("produces srcset with default widths and naming convention", () => {
    const out = generateResponsiveSrcSet("/img/photo.webp", [320, 640, 1024]);
    expect(out).toBe(
      "/img/photo-320w.webp 320w, /img/photo-640w.webp 640w, /img/photo-1024w.webp 1024w"
    );
  });

  it("appends quality query when provided", () => {
    const out = generateResponsiveSrcSet("/img/x.jpg", [400], { quality: 80 });
    expect(out).toBe("/img/x-400w.jpg?q=80 400w");
  });

  it("delegates to a custom path transform when supplied", () => {
    const out = generateResponsiveSrcSet(
      "/img/y.png",
      [200, 400],
      { pathTransform: (src, w) => `${src}?width=${w}` }
    );
    expect(out).toBe("/img/y.png?width=200 200w, /img/y.png?width=400 400w");
  });
});

describe("image-utils :: generateSizes", () => {
  it("produces a sizes string with media queries and a default", () => {
    const out = generateSizes({
      "(max-width: 640px)": "100vw",
      "(max-width: 1024px)": "80vw",
      default: "50vw",
    });
    expect(out).toBe(
      "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
    );
  });

  it("falls back to 100vw when no default is supplied and no queries given", () => {
    const out = generateSizes({});
    expect(out).toBe("100vw");
  });
});

describe("image-utils :: placeholders & geometry", () => {
  it("getLQIPUrl encodes width/quality/blur params on the LQIP path", () => {
    const url = getLQIPUrl("/img/hero.jpg", { width: 16, quality: 30, blur: 8 });
    expect(url).toBe("/img/hero-lqip.jpg?w=16&q=30&blur=8");
  });

  it("generateSVGPlaceholder returns a base64 data URI containing the rect", () => {
    const dataUri = generateSVGPlaceholder(100, 60, "#abcdef");
    expect(dataUri.startsWith("data:image/svg+xml;base64,")).toBe(true);
    const decoded = atob(dataUri.replace("data:image/svg+xml;base64,", ""));
    expect(decoded).toContain('width="100"');
    expect(decoded).toContain('height="60"');
    expect(decoded).toContain("#abcdef");
  });

  it("generateGradientPlaceholder produces a base64 SVG with both colour stops", () => {
    const dataUri = generateGradientPlaceholder(50, 50, ["#111111", "#222222"]);
    const decoded = atob(dataUri.replace("data:image/svg+xml;base64,", ""));
    expect(decoded).toContain("#111111");
    expect(decoded).toContain("#222222");
    expect(decoded).toContain("linearGradient");
  });

  it("calculateAspectRatio produces ratio and CSS padding-bottom", () => {
    const { ratio, paddingBottom } = calculateAspectRatio(16, 9);
    expect(ratio).toBeCloseTo(16 / 9, 5);
    expect(paddingBottom).toBe(`${(9 / 16) * 100}%`);
  });

  it("parseImageDimensions reads {w}x{h} from filename", () => {
    expect(parseImageDimensions("/img/banner-1920x1080.jpg")).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it("parseImageDimensions reads ?w=&h= from query string", () => {
    expect(parseImageDimensions("/img/foo.png?w=400&h=300")).toEqual({
      width: 400,
      height: 300,
    });
  });

  it("parseImageDimensions returns null when no match is found", () => {
    expect(parseImageDimensions("/img/no-dims.png")).toBeNull();
  });
});

describe("image-utils :: getOptimalImageSize (DPR-aware)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: 2,
      configurable: true,
      writable: true,
    });
  });
  afterEach(() => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: 1,
      configurable: true,
      writable: true,
    });
  });

  it("rounds container width up by DPR and rounding factor", () => {
    const out = getOptimalImageSize(350, undefined, { roundToNearest: 100 });
    // 350 * 2 = 700 → already a multiple of 100
    expect(out.width).toBe(700);
  });

  it("clamps the device pixel ratio to maxDpr", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: 4,
      configurable: true,
      writable: true,
    });
    const out = getOptimalImageSize(300, 200, { maxDpr: 2, roundToNearest: 50 });
    expect(out.width).toBe(600);
    expect(out.height).toBe(400);
  });
});

describe("image-utils :: format detection", () => {
  beforeEach(() => {
    // Ensure each test gets a fresh canvas mock.
    vi.restoreAllMocks();
  });

  it("supportsWebP resolves true when toDataURL returns a webp data URI", async () => {
    vi.spyOn(document, "createElement").mockImplementation(
      ((tag: string) => {
        if (tag === "canvas") {
          return {
            toDataURL: () => "data:image/webp;base64,UklGRh4=",
          } as unknown as HTMLCanvasElement;
        }
        // Fall back to the real implementation for non-canvas tags.
        return document.createElementNS("http://www.w3.org/1999/xhtml", tag);
      }) as typeof document.createElement
    );
    await expect(supportsWebP()).resolves.toBe(true);
  });

  it("getOptimalImageFormat returns the webp variant when webp is supported", async () => {
    vi.spyOn(document, "createElement").mockImplementation(
      ((tag: string) => {
        if (tag === "canvas") {
          return {
            toDataURL: () => "data:image/webp;base64,UklGRh4=",
          } as unknown as HTMLCanvasElement;
        }
        return document.createElementNS("http://www.w3.org/1999/xhtml", tag);
      }) as typeof document.createElement
    );
    const out = await getOptimalImageFormat("/img/hero.jpg", {
      checkAvif: false,
      checkWebp: true,
    });
    expect(out).toBe("/img/hero.webp");
  });

  it("getOptimalImageFormat falls through to original when no formats requested", async () => {
    const out = await getOptimalImageFormat("/img/hero.jpg", {
      checkAvif: false,
      checkWebp: false,
    });
    expect(out).toBe("/img/hero.jpg");
  });
});

describe("image-utils :: timing utilities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounce only invokes the function once after the delay", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throttle invokes immediately then suppresses until the limit passes", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("image-utils :: constants", () => {
  it("exports CRITICAL_IMAGES with expected categories", () => {
    expect(Object.keys(CRITICAL_IMAGES)).toEqual(
      expect.arrayContaining(["home", "systemDesign", "residentialTraining", "research"])
    );
  });

  it("IMAGE_DEFAULTS exposes a sensible defaults shape", () => {
    expect(IMAGE_DEFAULTS.formats).toEqual(["avif", "webp", "jpg"]);
    expect(IMAGE_DEFAULTS.breakpoints.lg).toBe(1024);
  });
});
