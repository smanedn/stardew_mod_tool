import { useState } from 'react';

export interface OnboardingTutorialProps {
  readonly onComplete: () => void;
  readonly onStartQuickMod: () => void;
}

interface TutorialStep {
  readonly title: string;
  readonly summary: string;
  readonly tip: string;
}

const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: 'Step 1: Pick a Template (30 sec)',
    summary:
      'Start from New Object, New Crop & Seed, Retexture Sprite, or NPC Dialogue on the Dashboard.',
    tip: 'You can also import an existing manifest.json to edit an existing Content Patcher pack.',
  },
  {
    title: 'Step 2: Configure Manifest & UniqueID (30 sec)',
    summary:
      'Enter your Mod Name and Author, then click Auto-Generate to create a valid SMAPI UniqueID.',
    tip: 'Use +Patch / +Minor buttons to increment Semantic Versioning safely.',
  },
  {
    title: 'Step 3: Add Content & Preview Live (45 sec)',
    summary:
      'Create custom items, crops, sprites, or dialogues and preview tooltips or code live.',
    tip: 'All edits support Ctrl+Z / Ctrl+Y Undo & Redo and silent 2-minute crash recovery.',
  },
  {
    title: 'Step 4: Test & Export to Nexus Mods (15 sec)',
    summary:
      'Use Test in Game to monitor SMAPI logs, then export to Mods/ or package a [CP] .zip.',
    tip: 'Every overwrite automatically creates a safety snapshot in .backup/.',
  },
];

export function OnboardingTutorial(props: OnboardingTutorialProps): React.JSX.Element {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const currentStep = TUTORIAL_STEPS[stepIndex] ?? TUTORIAL_STEPS[0];
  const isLast = stepIndex >= TUTORIAL_STEPS.length - 1;

  if (currentStep === undefined) {
    return <></>;
  }

  return (
    <section className="onboarding-banner">
      <div className="module-toolbar">
        <div>
          <span className="template-badge">
            Create Your First Mod in 2 Minutes ({String(stepIndex + 1)}/
            {String(TUTORIAL_STEPS.length)})
          </span>
          <h3>{currentStep.title}</h3>
        </div>
        <button type="button" className="secondary-btn" onClick={props.onComplete}>
          Dismiss
        </button>
      </div>

      <p>{currentStep.summary}</p>
      <p className="muted-text">Tip: {currentStep.tip}</p>

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
          <button type="button" className="launch-btn" onClick={props.onStartQuickMod}>
            Create My First Mod Now
          </button>
        )}
      </div>
    </section>
  );
}
