import { useState } from 'react';

export interface OnboardingTutorialProps {
  readonly onComplete: () => void;
  readonly onStartQuickMod: () => void;
}

interface TutorialStep {
  readonly icon: string;
  readonly badge: string;
  readonly title: string;
  readonly summary: string;
  readonly tip: string;
  readonly previewTag: string;
}

const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    icon: '🌱',
    badge: '30 sec',
    title: 'Step 1: Pick a Template',
    summary:
      'Start from New Object, New Crop & Seed, Retexture Sprite, or NPC Dialogue on the Dashboard.',
    tip: 'You can also import an existing manifest.json to edit an existing Content Patcher pack.',
    previewTag: 'Templates: Object • Crop • Retexture • Dialogue',
  },
  {
    icon: '📜',
    badge: '30 sec',
    title: 'Step 2: Configure Manifest & UniqueID',
    summary:
      'Enter your Mod Name and Author, then click Auto-Generate to create a valid SMAPI UniqueID.',
    tip: 'Use +Patch / +Minor buttons to increment Semantic Versioning safely.',
    previewTag: 'Author.MyFirstMod  v1.0.0',
  },
  {
    icon: '🎨',
    badge: '45 sec',
    title: 'Step 3: Build & Preview Live',
    summary:
      'Create custom items, crops, sprites, or dialogues with live in-game previews in every tab.',
    tip: 'All edits support Ctrl+Z / Ctrl+Y Undo & Redo and silent 2-minute crash recovery.',
    previewTag: 'Live Tooltip • Portrait Box • Pixel Grid',
  },
  {
    icon: '🚀',
    badge: '15 sec',
    title: 'Step 4: Test & Export to Nexus Mods',
    summary:
      'Use Test in Game to monitor SMAPI logs, then export to Mods/ or package a [CP] .zip.',
    tip: 'Every overwrite automatically creates a safety snapshot in .backup/.',
    previewTag: '[CP] MyFirstMod.zip Ready!',
  },
];

export function OnboardingTutorial(props: OnboardingTutorialProps): React.JSX.Element {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const currentStep = TUTORIAL_STEPS[stepIndex] ?? TUTORIAL_STEPS[0];
  const isLast = stepIndex >= TUTORIAL_STEPS.length - 1;
  const progressPercent = ((stepIndex + 1) / TUTORIAL_STEPS.length) * 100;

  if (currentStep === undefined) {
    return <></>;
  }

  return (
    <section className="onboarding-banner">
      <div className="module-toolbar">
        <div className="inline-row">
          <span className="template-badge">Create Your First Mod in 2 Minutes</span>
          <span className="muted-text">{currentStep.badge}</span>
        </div>
        <button type="button" className="secondary-btn" onClick={props.onComplete}>
          Dismiss
        </button>
      </div>

      <div className="tutorial-progress-track">
        <div className="tutorial-progress-fill" style={{ width: `${String(progressPercent)}%` }} />
      </div>

      <div className="tutorial-dots">
        {TUTORIAL_STEPS.map((step, idx) => (
          <button
            key={step.title}
            type="button"
            className={idx === stepIndex ? 'tutorial-dot active' : 'tutorial-dot'}
            onClick={() => { setStepIndex(idx); }}
          >
            {step.icon} Step {String(idx + 1)}
          </button>
        ))}
      </div>

      <div key={stepIndex} className="tutorial-step-card">
        <div className="tutorial-icon-circle">{currentStep.icon}</div>
        <div className="tutorial-step-body">
          <h3>{currentStep.title}</h3>
          <p>{currentStep.summary}</p>
          <div className="tutorial-preview-pill">{currentStep.previewTag}</div>
          <p className="muted-text">Tip: {currentStep.tip}</p>
        </div>
      </div>

      <div className="inline-row">
        <button
          type="button"
          className="secondary-btn"
          disabled={stepIndex === 0}
          onClick={() => { setStepIndex(Math.max(0, stepIndex - 1)); }}
        >
          Back
        </button>
        {!isLast ? (
          <button
            type="button"
            className="launch-btn"
            onClick={() => { setStepIndex(stepIndex + 1); }}
          >
            Next Step
          </button>
        ) : (
          <button type="button" className="launch-btn pulse-btn" onClick={props.onStartQuickMod}>
            Create My First Mod Now
          </button>
        )}
      </div>
    </section>
  );
}
