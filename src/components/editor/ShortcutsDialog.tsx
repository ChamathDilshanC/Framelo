"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SHORTCUTS } from "@/lib/hooks/use-keyboard-shortcuts";
import { useEditorStore } from "@/store/editor-store";

const GROUPS = ["Playback", "Editing", "Timeline", "View"] as const;

export function ShortcutsDialog() {
  const open = useEditorStore((state) => state.shortcutsOpen);
  const setOpen = useEditorStore((state) => state.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        title="Keyboard shortcuts"
        description="Everything below runs the same commands as the toolbar."
        style={{ ["--dialog-width" as string]: "480px" }}
      >
        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4">
          {GROUPS.map((group) => (
            <section key={group} className="space-y-1.5">
              <h3 className="panel-label">{group}</h3>
              <ul className="space-y-px">
                {SHORTCUTS.filter((shortcut) => shortcut.group === group).map((shortcut) => (
                  <li
                    key={shortcut.keys}
                    className="flex items-center justify-between gap-4 rounded-sm px-1 py-1.5 text-[12px]"
                  >
                    <span className="text-ink-muted">{shortcut.description}</span>
                    <kbd className="numeric shrink-0 rounded-xs border border-line bg-surface-raised px-1.5 py-0.5 text-ink">
                      {shortcut.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
