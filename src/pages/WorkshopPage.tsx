// src/pages/WorkshopPage.tsx
import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { fetchMarkdown, getDataPath } from '@/lib/markdown';
import { Header } from '@/components/Header';
import { WorkshopHeader, WorkshopCategory, DifficultyLevel } from '@/components/WorkshopHeader';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOGMeta } from "@/hooks/useOGMeta";
import { getWorkshopOGConfig } from "@/lib/og-meta";

interface WorkshopPageItem {
  slug: string; // e.g., 00_introduction.md
  title: string; // e.g., "Introduction & Workshop Overview"
}

interface WorkshopManifest {
  title: string; // Title of the workshop itself
  pages: WorkshopPageItem[];
  category?: WorkshopCategory;
  description?: string;
  estimatedTime?: string;
  difficulty?: DifficultyLevel;
}

const WorkshopPage = () => {
  const { workshopId, pageSlug } = useParams<{ workshopId: string; pageSlug?: string }>();
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<WorkshopManifest | null>(null);
  const [currentPageContent, setCurrentPageContent] = useState<string>('');
  const [isLoadingManifest, setIsLoadingManifest] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine the actual slug to use, defaulting to README.md or the first page in manifest
  const currentActualSlug = useMemo(() => {
    if (pageSlug) return pageSlug;
    if (manifest && Array.isArray(manifest.pages) && manifest.pages.length > 0) return manifest.pages[0].slug;
    return 'README.md'; // Default fallback
  }, [pageSlug, manifest]);

  // Initialize Mermaid.js (only once)
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
  }, []);

  // Effect to load the workshop manifest (with cancellation support)
  useEffect(() => {
    if (!workshopId) {
      setError("Workshop ID is missing.");
      setIsLoadingManifest(false);
      return;
    }

    let cancelled = false;
    const loadManifest = async () => {
      setIsLoadingManifest(true);
      setError(null);
      try {
        const manifestPath = getDataPath(`/data/workshops/${workshopId}/manifest.json`);
        const response = await fetch(manifestPath);
        if (!response.ok) {
          throw new Error(`Manifest not found for workshop "${workshopId}" (path: ${manifestPath}). Status: ${response.status}`);
        }
        const data: WorkshopManifest = await response.json();
        // Validate manifest structure
        if (!Array.isArray(data.pages)) {
          throw new Error("Malformed manifest: 'pages' field missing or not an array.");
        }
        if (!cancelled) setManifest(data);

        // If no pageSlug is in URL, and manifest has pages, navigate to the first page
        if (!pageSlug && data.pages.length > 0 && data.pages[0].slug) {
          navigate(`/workshops/${workshopId}/${data.pages[0].slug}`, { replace: true });
        } else if (!pageSlug && (data.pages.length === 0 || !data.pages[0]?.slug)) {
          // If no specific page and no pages in manifest (or first page has no slug), try README.md
          navigate(`/workshops/${workshopId}/README.md`, { replace: true });
        }
      } catch (e) {
        console.error("Error loading workshop manifest:", e);
        if (!cancelled) {
          setError(`Could not load workshop data. ${e instanceof Error ? e.message : String(e)}`);
          setManifest(null);
        }
      } finally {
        if (!cancelled) setIsLoadingManifest(false);
      }
    };
    loadManifest();
    return () => { cancelled = true; };
  }, [workshopId, navigate, pageSlug]);

  // Effect to load the content of the current page (with cancellation support)
  useEffect(() => {
    if (!workshopId || !currentActualSlug || isLoadingManifest) {
      return;
    }

    // Check if the currentActualSlug is valid based on the manifest (if manifest is loaded)
    const isValidSlug = currentActualSlug === 'README.md' || (manifest && manifest.pages.some(p => p.slug === currentActualSlug));

    if (!isValidSlug && manifest) {
      setError(`Page "${currentActualSlug}" not found in this workshop.`);
      setCurrentPageContent('');
      setIsLoadingContent(false);
      return;
    }

    let cancelled = false;
    const loadPageContent = async () => {
      setIsLoadingContent(true);
      setError(null);
      try {
        const mdPath = `/data/workshops/${workshopId}/${currentActualSlug}`;
        const content = await fetchMarkdown(mdPath);
        // Check if content is empty, which might be valid or an error
        if (content === "" && !isValidSlug) {
          throw new Error(`Content not found for page "${currentActualSlug}".`);
        }
        if (!cancelled) setCurrentPageContent(content);
      } catch (e) {
        console.error("Error loading page content:", e);
        if (!cancelled) {
          setError(`Could not load content for "${currentActualSlug}". ${e instanceof Error ? e.message : String(e)}`);
          setCurrentPageContent('');
        }
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    };
    loadPageContent();
    return () => { cancelled = true; };
  }, [workshopId, currentActualSlug, manifest, isLoadingManifest]);

  // Update OG meta tags when manifest loads
  useEffect(() => {
    if (manifest && workshopId) {
      const ogConfig = getWorkshopOGConfig(
        workshopId,
        manifest.title,
        manifest.description || `${manifest.title} - DreamLab AI Workshop`
      );
      // Dynamically import to avoid circular dependencies
      import('@/lib/og-meta').then(({ updateOGMetaTags }) => {
        updateOGMetaTags(ogConfig);
      });
    }
  }, [manifest, workshopId]);

  // Effect to render Mermaid diagrams after content is loaded and DOM updated
  useEffect(() => {
    if (!isLoadingContent && currentPageContent) {
      setTimeout(() => {
        try {
          const mermaidElements = document.querySelectorAll('code.language-mermaid');
          if (mermaidElements.length > 0) {
            mermaidElements.forEach((el, i) => {
              const id = `mermaid-diagram-${i}`;
              const graphDefinition = (el as HTMLElement).textContent || '';
              if (document.body.contains(el) && !el.getAttribute('data-mermaid-processed')) {
                try {
                  // Sanitize input to prevent XSS
                  const sanitizedDefinition = graphDefinition.replace(/<script/gi, '&lt;script');
                  mermaid.render(id, sanitizedDefinition).then(({ svg, bindFunctions }) => {
                    if (document.body.contains(el)) {
                      // Sanitize SVG output with DOMPurify to prevent XSS
                      const sanitizedSvg = DOMPurify.sanitize(svg, {
                        USE_PROFILES: { svg: true, svgFilters: true },
                        ADD_TAGS: ['use'],
                        ADD_ATTR: ['xlink:href']
                      });
                      const wrapper = document.createElement('div');
                      wrapper.innerHTML = sanitizedSvg;
                      el.textContent = '';
                      el.appendChild(wrapper);
                      if (bindFunctions) {
                        bindFunctions(el);
                      }
                      el.setAttribute('data-mermaid-processed', 'true');
                    }
                  }).catch(caughtRenderError => {
                    console.error(`Mermaid render error for diagram ${id}:`, caughtRenderError);
                    if (document.body.contains(el)) {
                      // Security: Use textContent instead of innerHTML for error messages
                      const errorMsg = `Error rendering Mermaid diagram: ${caughtRenderError instanceof Error ? caughtRenderError.message : String(caughtRenderError)}`;
                      const pre = document.createElement('pre');
                      pre.textContent = errorMsg;
                      el.textContent = '';
                      el.appendChild(pre);
                    }
                  });
                } catch (initError) {
                  console.error(`Mermaid initial render error for diagram ${id}:`, initError);
                  if (document.body.contains(el)) {
                    // Security: Use textContent instead of innerHTML for error messages
                    const errorMsg = `Error rendering Mermaid diagram: ${initError instanceof Error ? initError.message : String(initError)}`;
                    const pre = document.createElement('pre');
                    pre.textContent = errorMsg;
                    el.textContent = '';
                    el.appendChild(pre);
                  }
                }
              }
            });
          }
        } catch (e) {
          console.error("Mermaid rendering error:", e);
        }
      }, 100);
    }
  }, [isLoadingContent, currentPageContent]);

  // Calculate current chapter index for progress tracking
  const currentChapterIndex = useMemo(() => {
    if (!manifest || !manifest.pages.length) return 0;
    const index = manifest.pages.findIndex((p) => p.slug === currentActualSlug);
    return index >= 0 ? index + 1 : 1;
  }, [manifest, currentActualSlug]);

  // Get current chapter title
  const currentChapterTitle = useMemo(() => {
    if (!manifest || !manifest.pages.length) return undefined;
    const page = manifest.pages.find((p) => p.slug === currentActualSlug);
    return page?.title;
  }, [manifest, currentActualSlug]);

  if (isLoadingManifest) {
    return (
      <>
        <Header />
        <main className="container pt-24 pb-8 text-center">Loading workshop structure...</main>
      </>
    );
  }

  // If manifest loading failed critically
  if (!manifest && error && !isLoadingManifest) {
    return (
      <>
        <Header />
        <main className="container pt-24 pb-8">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error Loading Workshop</h1>
          <p>{error}</p>
          <Link to="/" className="mt-4 inline-block text-blue-500 hover:underline">Go to Homepage</Link>
        </main>
      </>
    );
  }

  const isEffectivelyEmptyWorkshop = manifest && manifest.pages.length === 0;

  return (
    <>
      <Header />
      {/* Workshop Header with Hero Section */}
      {manifest && workshopId && (
        <WorkshopHeader
          title={manifest.title || workshopId.replace('workshop-', '').replace(/-/g, ' ')}
          workshopId={workshopId}
          category={manifest.category}
          currentChapter={currentChapterIndex}
          totalChapters={manifest.pages.length || 1}
          currentChapterTitle={currentChapterTitle}
          moduleCount={manifest.pages.length}
          estimatedTime={manifest.estimatedTime}
          difficulty={manifest.difficulty}
          description={manifest.description}
        />
      )}
      <main className="container pt-8 pb-8 flex flex-col md:flex-row gap-x-8 min-h-screen">
        {manifest && manifest.pages.length > 0 && (
          <aside className="w-full md:w-64 lg:w-72 md:sticky md:top-20 md:h-[calc(100vh-5rem-2rem)] mb-8 md:mb-0">
            <h2 className="text-xl font-semibold mb-4 break-words">
              {manifest.title ||
                (workshopId ? workshopId.replace('workshop-', '').replace('-', ' ') : "Workshop")}
            </h2>
            <ScrollArea className="h-auto md:h-full pr-4 border-r md:border-r-0">
              <nav>
                <ul>
                  {manifest.pages.map((page, index) => (
                    <li key={page.slug} className="mb-1">
                      <Link
                        to={`/workshops/${workshopId}/${page.slug}`}
                        className={`block p-2 rounded-md text-sm hover:bg-muted transition-colors ${
                          page.slug === currentActualSlug
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <span className="mr-2 text-xs opacity-60">{index + 1}.</span>
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </ScrollArea>
          </aside>
        )}

        <article className={`flex-1 ${manifest && manifest.pages.length > 0 ? 'md:pl-0' : 'w-full'}`}>
          {isLoadingContent && <div className="text-center py-10">Loading content...</div>}
          {error && !isLoadingContent && (
            <div className="p-4 my-4 text-red-700 bg-red-100 border border-red-300 rounded-md">
              <h3 className="font-bold">Content Error</h3>
              <p>{error}</p>
            </div>
          )}
          {/* --- To show real content, use ReactMarkdown below. For debugging, the <p>Test Content.../> is fine --- */}
          {!isLoadingContent && !error && currentPageContent && (
            <div className="prose max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentPageContent}
              </ReactMarkdown>
            </div>
            // <p>Test Content: {currentPageContent ? "Content Available" : "No Content"}</p>
          )}
          {!isLoadingContent && !error && !currentPageContent && !isEffectivelyEmptyWorkshop && (
            <div className="text-center py-10">
              <p>No content to display for this page, or the page is empty.</p>
              {currentActualSlug === 'README.md' && manifest?.pages && manifest.pages.length > 0 && manifest.pages[0].slug !== 'README.md' && (
                <p className="mt-2">Try selecting a page from the navigation.</p>
              )}
            </div>
          )}
          {!isLoadingContent && !error && !currentPageContent && isEffectivelyEmptyWorkshop && (
            <div className="text-center py-10">
              <p>This workshop appears to be empty or only contains an empty README file.</p>
              <p className="mt-2">
                Add some Markdown files to the <code>public/data/workshops/{workshopId}</code> directory.
              </p>
            </div>
          )}
        </article>
      </main>
    </>
  );
};

export default WorkshopPage;
