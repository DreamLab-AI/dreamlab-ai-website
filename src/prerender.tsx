// Build-only entry: renders the public React pages with their real source data.
// This module is loaded by Vite's SSR transform, never imported by the client.
import { readFileSync, existsSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Routes, Route } from 'react-router-dom';
import { TooltipProvider } from './components/ui/tooltip';
import { StaticMetaContext } from './hooks/useOGMeta';
import { mergeOGConfig, type OGMetaConfig } from './lib/og-meta';
import { parseTeamMarkdown } from './lib/markdown';
import Index from './pages/Index';
import Programmes from './pages/Programmes';
import CoCreate from './pages/CoCreate';
import Research from './pages/Research';
import Ecosystem from './pages/Ecosystem';
import Team from './pages/Team';
import Workshops from './pages/WorkshopIndex';
import WorkshopPage from './pages/WorkshopPage';
import Testimonials from './pages/Testimonials';
import Ventures from './pages/Ventures';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';

const marketing = {
  '/': Index, '/programmes': Programmes, '/co-create': CoCreate,
  '/research': Research, '/ecosystem': Ecosystem, '/team': Team,
  '/workshops': Workshops, '/testimonials': Testimonials, '/ventures': Ventures,
  '/contact': Contact, '/privacy': Privacy,
};
export const marketingPaths = Object.keys(marketing);

export function renderPage(url: string) {
  let config: Partial<OGMetaConfig> | undefined;
  const Page = marketing[url as keyof typeof marketing];
  let element;
  if (url === '/team') {
    const manifest = JSON.parse(readFileSync('public/data/team/manifest.json', 'utf8'));
    const members = manifest.members.map((id: string) => ({
      id,
      imageSrc: `/images/team/${id}.${existsSync(`public/images/team/${id}.webp`) ? 'webp' : 'png'}`,
      ...parseTeamMarkdown(readFileSync(`public/data/team/${id}.md`, 'utf8')),
    }));
    element = <Team initialMembers={members} />;
  } else if (Page) {
    element = <Page />;
  } else {
    const [, , workshopId, pageSlug] = url.split('/');
    const base = `public/data/workshops/${workshopId}`;
    const manifest = JSON.parse(readFileSync(`${base}/manifest.json`, 'utf8'));
    const content = readFileSync(`${base}/${pageSlug || manifest.pages[0].slug}`, 'utf8');
    element = <WorkshopPage initialManifest={manifest} initialContent={content} />;
  }
  const body = renderToString(
    <StaticMetaContext.Provider value={value => { config = value; }}>
      <TooltipProvider><StaticRouter location={url}>
        <Routes>
          <Route path={Page ? url : '/workshops/:workshopId/:pageSlug?'} element={element} />
        </Routes>
      </StaticRouter></TooltipProvider>
    </StaticMetaContext.Provider>,
  );
  if (!config?.title || !config.description) throw new Error(`Missing metadata: ${url}`);
  return { body, meta: mergeOGConfig(config) };
}
