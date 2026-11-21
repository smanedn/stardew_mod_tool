import { useState } from 'react';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
  serializeCleanJson,
} from '../../core/engine/browser-compiler.js';
import type { SdvProjectFile } from '../../data/models/index.js';

export type TutorialTargetTab = 'manifest' | 'objects' | 'dialogue' | 'preview';

export interface OnboardingTutorialProps {
  readonly activeProject: SdvProjectFile | null;
  readonly onComplete: () => void;
  readonly onStartTutorialMod: () => void;
  readonly onNavigateTab: (tab: TutorialTargetTab) => void;
  readonly onAddTutorialObject: () => void;
  readonly onAddTutorialDialogue: () => void;
}

interface TutorialStep {
  readonly icon: string;
  readonly title: string;
  readonly summary: string;
  readonly actionLabel: string;
}

const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    icon: '🌱',
    title: 'Step 1: Create Your Starter Mod Project',
    summary:
      'Click "Start Mod Project" to initialize "Golden Starberry" and open the editor.',
    actionLabel: 'Start Mod Project →',
  },
  {
    icon: '📜',
    title: 'Step 2: Configure Manifest & UniqueID',
    summary:
      'Look at the Manifest tab below: your Name, Author, UniqueID, and SemVer are validated live.',
    actionLabel: 'Next: Add Custom Object →',
  },
  {
    icon: '🍓',
    title: 'Step 3: Add a Custom Stardew Item & Recipe',
    summary:
      'In New Items: add "Golden Starberry" (250g, +100 Energy) with searchable vanilla ingredients.',
    actionLabel: 'Add Golden Starberry & Next →',
  },
  {
    icon: '💬',
    title: 'Step 4: Villager Chat, Cutscenes & Custom NPCs',
    summary:
      'Preview official villager portraits, direct 2D Cutscenes, or build your own Custom NPC.',
    actionLabel: 'Add Abigail Dialogue & Preview →',
  },
  {
    icon: '🚀',
    title: 'Step 5: Lint, Conflict-Check & Export (v1.0.0)!',
    summary:
      'Preview your mod, check Mods/ conflicts, generate Nexus BBCode, or export to SVMM!',
    actionLabel: 'Finish Tutorial ✓',
  },
];

function triggerJsonDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function OnboardingTutorial(props: OnboardingTutorialProps): React.JSX.Element {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const currentStep = TUTORIAL_STEPS[stepIndex] ?? TUTORIAL_STEPS[0];
  const progressPercent = ((stepIndex + 1) / TUTORIAL_STEPS.length) * 100;

  if (currentStep === undefined) {
    return <></>;
  }

  const handleStepAction = (): void => {
    if (stepIndex === 0) {
      props.onStartTutorialMod();
      props.onNavigateTab('manifest');
      setStepIndex(1);
    } else if (stepIndex === 1) {
      props.onNavigateTab('objects');
      setStepIndex(2);
    } else if (stepIndex === 2) {
      props.onAddTutorialObject();
      props.onNavigateTab('dialogue');
      setStepIndex(3);
    } else if (stepIndex === 3) {
      props.onAddTutorialDialogue();
      props.onNavigateTab('preview');
      setStepIndex(4);
    } else {
      props.onComplete();
    }
  };

  const handleDownloadModFiles = (): void => {
    if (props.activeProject === null) {
      return;
    }
    const manifestText = serializeCleanJson(compileProjectToManifest(props.activeProject));
    const contentText = serializeCleanJson(compileProjectToContentJson(props.activeProject));
    triggerJsonDownload('manifest.json', manifestText);
    triggerJsonDownload('content.json', contentText);
  };

  return (
    <section className="onboarding-banner">
      <div className="module-toolbar">
        <div className="inline-row">
          <span className="template-badge">Interactive Mod Tutorial</span>
          <span className="muted-text">
            Step {String(stepIndex + 1)} of {String(TUTORIAL_STEPS.length)}
          </span>
        </div>
        <button type="button" className="secondary-btn" onClick={props.onComplete}>
          Close Tutorial
        </button>
      </div>

      <div className="tutorial-progress-track">
        <div className="tutorial-progress-fill" style={{ width: `${String(progressPercent)}%` }} />
      </div>

      <div key={stepIndex} className="tutorial-step-card">
        <div className="tutorial-icon-circle">{currentStep.icon}</div>
        <div className="tutorial-step-body">
          <h3>{currentStep.title}</h3>
          <p>{currentStep.summary}</p>
        </div>
      </div>

      <div className="inline-row">
        {stepIndex === 4 && props.activeProject !== null && (
          <button type="button" className="secondary-btn" onClick={handleDownloadModFiles}>
            Download manifest.json &amp; content.json
          </button>
        )}
        <button type="button" className="launch-btn pulse-btn" onClick={handleStepAction}>
          {currentStep.actionLabel}
        </button>
      </div>
    </section>
  );
}
