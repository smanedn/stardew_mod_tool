export interface ShortcutCheatsheetProps {
  readonly onClose: () => void;
}

const SHORTCUTS: ReadonlyArray<{ readonly keys: string; readonly action: string }> = [
  { keys: 'Ctrl / Cmd + Z', action: 'Undo last project edit (when outside text inputs)' },
  { keys: 'Ctrl / Cmd + Y', action: 'Redo last undone project edit' },
  { keys: 'Ctrl / Cmd + Shift + Z', action: 'Redo (alternative shortcut)' },
  { keys: 'Drag / Click Tile', action: 'Place Farmer or Villager on 2D Cutscene Stage' },
  { keys: 'Pointer Drag (Draw Sprite)', action: 'Paint continuous pixel strokes as 1 undo step' },
  { keys: 'Click Pixel (Fill Bucket)', action: 'Flood-fill bounded sprite region' },
];

export function ShortcutCheatsheet(props: ShortcutCheatsheetProps): React.JSX.Element {
  return (
    <section className="module-card" aria-label="Keyboard shortcuts cheatsheet">
      <div className="module-toolbar">
        <h3>Keyboard &amp; Studio Shortcuts (v1.0.0)</h3>
        <button type="button" className="secondary-btn" onClick={props.onClose}>
          Close
        </button>
      </div>
      <ul className="recent-list">
        {SHORTCUTS.map((item) => (
          <li key={item.keys} className="recent-item">
            <strong>{item.keys}</strong>
            <span className="muted-text">{item.action}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
