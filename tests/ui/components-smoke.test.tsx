import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../../src/core/index.js';
import { App } from '../../src/ui/app.js';
import {
  ErrorBoundary,
  InGamePreview,
  PixelEditor,
  ProjectDashboard,
} from '../../src/ui/components/index.js';

describe('UI Smoke: App & PixelEditor', () => {
  it('renders App dashboard cleanly on initial load', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Cozy Content Patcher Studio');
    expect(html).toContain('What do you want to create today?');
  });

  it('renders PixelEditor with Fill Bucket, Undo, and 16x16 Starter Outlines', () => {
    const html = renderToStaticMarkup(<PixelEditor />);
    expect(html).toContain('Fill Bucket');
    expect(html).toContain('Undo (0)');
    expect(html).toContain('Berry');
    expect(html).toContain('Gem');
    expect(html).toContain('Potion');
    expect(html).toContain('Sword');
    expect(html).toContain('aria-label="Pixel art sprite canvas"');
  });
});

describe('UI Smoke: Dashboard, Preview & ErrorBoundary', () => {
  it('renders ProjectDashboard import controls', () => {
    const noop = (): void => undefined;
    const dashHtml = renderToStaticMarkup(
      <ProjectDashboard
        recentProjects={[]}
        onCreateFromTemplate={noop}
        onLoadSampleMod={noop}
        onOpenRecent={noop}
        onDeleteRecent={noop}
        onImportManifest={noop}
        onImportModFiles={noop}
        onImportZip={noop}
        onImportProjectBackup={noop}
        importError={null}
      />,
    );
    expect(dashHtml).toContain('Already have a mod or backup?');
  });

  it('renders InGamePreview linter, BBCode, and ErrorBoundary', () => {
    const project = createEmptyProject({
      name: 'Smoke Mod',
      author: 'Smane',
      version: '0.8.0',
      description: 'Smoke test',
      uniqueId: 'Smane.SmokeMod',
    });
    const previewHtml = renderToStaticMarkup(
      <InGamePreview project={project} objects={[]} dialogues={[]} />,
    );
    expect(previewHtml).toContain('Pre-Export Linter:');
    expect(previewHtml).toContain('Nexus Mods Description (BBCode)');

    const boundaryHtml = renderToStaticMarkup(
      <ErrorBoundary>
        <div>Healthy Editor</div>
      </ErrorBoundary>,
    );
    expect(boundaryHtml).toContain('Healthy Editor');
  });
});
