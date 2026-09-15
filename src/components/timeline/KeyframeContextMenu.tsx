"use client";

import {
  Copy,
  ClipboardPaste,
  CopyPlus,
  ListChecks,
  Spline,
  SquarePen,
  Trash2,
} from "lucide-react";
import * as React from "react";

import type { KeyframeMenuRequest } from "@/components/timeline/TimelineTrack";
import {
  copySelectedKeyframes,
  deleteSelectedKeyframes,
  duplicateSelectedKeyframes,
  keyframeCount,
  notifyCopied,
  pasteKeyframes,
  selectAllOnTrack,
} from "@/lib/timeline/keyframe-actions";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

/**
 * The keyframe actions menu.
 *
 * Every item here does something to the real animation. There is no "Edit
 * Value" that opens a panel that does not save, and no greyed-out row kept for
 * symmetry: Paste is disabled with a reason when the clipboard is empty,
 * because a menu item that silently does nothing is worse than one that is
 * honestly unavailable.
 *
 * Positioned from the pointer rather than anchored to the keyframe, which at
 * 11 pixels across is too small to hang a menu off without covering it.
 */
export function KeyframeContextMenu({
  request,
  onClose,
  fps,
}: {
  request: KeyframeMenuRequest | null;
  onClose: () => void;
  fps: number;
}) {
  const selected = useEditorStore((state) => state.selectedKeyframes);
  const clipboard = useEditorStore((state) => state.keyframeClipboard);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!request) return;

    function away(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    // Captured, so a click on a keyframe behind the menu closes it rather than
    // starting a drag underneath it.
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("keydown", escape);
    };
  }, [request, onClose]);

  if (!request) return null;

  const count = selected.length;

  function run(action: () => void) {
    action();
    onClose();
  }

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Keyframe actions"
      className="animate-fade-up fixed z-[90] w-52 rounded-md border border-line-strong bg-surface-raised p-1 shadow-2xl shadow-black/50"
      style={{
        // Kept inside the window: a menu opened near the right edge would
        // otherwise run off it and lose half its items.
        left: Math.min(request.x, window.innerWidth - 220),
        top: Math.min(request.y, window.innerHeight - 260),
      }}
    >
      <p className="px-2 py-1 text-[10px] text-ink-subtle">
        {count > 1 ? `${keyframeCount(count)} selected` : "Keyframe"}
      </p>

      <Item
        icon={SquarePen}
        label="Edit value"
        hint="In properties"
        onSelect={() =>
          run(() => {
            // The inspector is where a value is edited; this puts it in view
            // rather than duplicating the field into a popover that would then
            // need its own validation.
            useEditorStore.getState().toggleRightPanel(true);
            notify.info("Value is in the properties panel", "Under Animation → selected keyframe.");
          })
        }
      />
      <Item
        icon={Spline}
        label="Change easing"
        hint="In properties"
        onSelect={() =>
          run(() => {
            useEditorStore.getState().toggleRightPanel(true);
            notify.info("Easing editor is open", "Properties → Animation.");
          })
        }
      />

      <div className="my-1 h-px bg-line" />

      <Item
        icon={CopyPlus}
        label="Duplicate"
        hint="Alt-drag"
        onSelect={() =>
          run(() => {
            // Half a second forward: far enough to grab, near enough that the
            // copy is obviously related to the original.
            const made = duplicateSelectedKeyframes(Math.max(0.5, 12 / Math.max(1, fps)));
            if (made > 0) notify.success(`${keyframeCount(made)} duplicated`);
          })
        }
      />
      <Item
        icon={Copy}
        label="Copy"
        hint="Ctrl+C"
        onSelect={() => run(() => notifyCopied(copySelectedKeyframes()))}
      />
      <Item
        icon={ClipboardPaste}
        label="Paste at playhead"
        hint="Ctrl+V"
        disabled={clipboard.length === 0}
        disabledHint="Nothing copied yet"
        onSelect={() =>
          run(() => {
            const pasted = pasteKeyframes();
            if (pasted > 0) notify.success(`${keyframeCount(pasted)} pasted`);
          })
        }
      />
      <Item
        icon={ListChecks}
        label="Select all on track"
        onSelect={() => run(() => selectAllOnTrack(request.selection))}
      />

      <div className="my-1 h-px bg-line" />

      <Item
        icon={Trash2}
        label={count > 1 ? `Delete ${count}` : "Delete"}
        hint="Del"
        danger
        onSelect={() =>
          run(() => {
            const removed = deleteSelectedKeyframes();
            if (removed > 0) notify.success(`${keyframeCount(removed)} deleted`, "Ctrl+Z undoes it.");
          })
        }
      />
    </div>
  );
}

function Item({
  icon: Icon,
  label,
  hint,
  onSelect,
  disabled,
  disabledHint,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onSelect: () => void;
  disabled?: boolean;
  disabledHint?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-xs px-2 py-1 text-left text-[11px] transition-colors",
        disabled
          ? "cursor-not-allowed text-ink-subtle/50"
          : danger
            ? "text-danger hover:bg-danger/10"
            : "text-ink-muted hover:bg-surface-hover hover:text-ink",
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint ? <span className="numeric shrink-0 text-ink-subtle">{hint}</span> : null}
    </button>
  );
}
