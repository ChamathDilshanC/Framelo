"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  Eye,
  EyeOff,
  Layers,
  Lock,
  LockOpen,
  MoreVertical,
  Pencil,
  Smartphone,
  Trash2,
  Type,
} from "lucide-react";
import * as React from "react";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { Layer, LayerType } from "@/types/layer";

/**
 * The layer list.
 *
 * Ordered back to front, matching the array in the project and the row order in
 * the timeline. Reordering here reorders that array, which is what the scene
 * draws from — so moving a caption above the device moves it in the render,
 * not only in this list (§26, §62).
 */
export function LayerPanel({ layers }: { layers: Layer[] }) {
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const moveLayer = useProjectStore((state) => state.moveLayer);

  function handleDrop(index: number) {
    if (dragId) moveLayer(dragId, index);
    setDragId(null);
    setDropIndex(null);
  }

  return (
    <section className="flex max-h-[42%] shrink-0 flex-col border-b border-line">
      <div className="flex h-9 shrink-0 items-center gap-1.5 px-3">
        <Layers className="h-3 w-3 text-ink-subtle" />
        <h2 className="panel-label">Layers</h2>
        <span className="ml-auto text-[10px] text-ink-subtle">back → front</span>
      </div>

      <ul className="min-h-0 overflow-y-auto space-y-px px-1.5 pb-2">
        {layers.map((layer, index) => (
          <li
            key={layer.id}
            draggable
            onDragStart={() => setDragId(layer.id)}
            onDragEnd={() => {
              setDragId(null);
              setDropIndex(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDropIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(index);
            }}
            className={cn(
              "rounded-sm",
              dropIndex === index && dragId && dragId !== layer.id
                ? "outline-1 outline-accent"
                : "",
              dragId === layer.id ? "opacity-50" : "",
            )}
          >
            <LayerRow
              layer={layer}
              index={index}
              total={layers.length}
              active={layer.id === selectedLayerId}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

const LAYER_ICONS: Partial<Record<LayerType, React.ComponentType<{ className?: string }>>> = {
  device: Smartphone,
  text: Type,
};

function LayerRow({
  layer,
  index,
  total,
  active,
}: {
  layer: Layer;
  index: number;
  total: number;
  active: boolean;
}) {
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const beginTextEditing = useEditorStore((state) => state.beginTextEditing);
  const setLayerVisible = useProjectStore((state) => state.setLayerVisible);
  const setLayerLocked = useProjectStore((state) => state.setLayerLocked);
  const renameLayer = useProjectStore((state) => state.renameLayer);

  const [renaming, setRenaming] = React.useState(false);
  const Icon = LAYER_ICONS[layer.type] ?? Layers;

  return (
    <div
      className={cn(
        "group flex h-7 items-center gap-1 rounded-sm px-1.5 transition-colors duration-150",
        active ? "bg-surface-active" : "hover:bg-surface-hover",
      )}
    >
      {renaming ? (
        <RenameField
          name={layer.name}
          onCommit={(name) => {
            renameLayer(layer.id, name);
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => selectLayer(layer.id)}
          onDoubleClick={() => {
            // Double-clicking text goes straight to editing the words; on
            // anything else there is nothing to edit, so it renames.
            if (layer.type === "text") beginTextEditing(layer.id);
            else setRenaming(true);
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          aria-pressed={active}
        >
          <Icon
            className={cn("h-3 w-3 shrink-0", active ? "text-accent" : "text-ink-subtle")}
          />
          <span
            className={cn(
              "truncate text-[12px]",
              active ? "text-ink" : "text-ink-muted",
              !layer.visible && "line-through opacity-60",
            )}
          >
            {layer.name}
          </span>
        </button>
      )}

      <IconButton
        icon={layer.visible ? Eye : EyeOff}
        label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
        size="sm"
        onClick={() => setLayerVisible(layer.id, !layer.visible)}
        className={cn(!layer.visible && "text-accent")}
        tooltipSide="left"
      />
      <IconButton
        icon={layer.locked ? Lock : LockOpen}
        label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
        size="sm"
        onClick={() => setLayerLocked(layer.id, !layer.locked)}
        className={cn(!layer.locked && "opacity-0 group-hover:opacity-100")}
        tooltipSide="left"
      />
      <LayerMenu
        layer={layer}
        index={index}
        total={total}
        onRename={() => setRenaming(true)}
      />
    </div>
  );
}

function RenameField({
  name,
  onCommit,
  onCancel,
}: {
  name: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = React.useState(name);

  return (
    <input
      autoFocus
      value={draft}
      aria-label="Layer name"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") onCommit(draft);
        if (event.key === "Escape") onCancel();
      }}
      className="h-5 min-w-0 flex-1 rounded-xs border border-accent/60 bg-surface-raised px-1 text-[12px] text-ink outline-none"
    />
  );
}

/**
 * Per-layer actions (§27).
 *
 * A popover rather than a native context menu so the same list is reachable by
 * keyboard and by the three-dot button, not only by right-clicking (§56).
 */
function LayerMenu({
  layer,
  index,
  total,
  onRename,
}: {
  layer: Layer;
  index: number;
  total: number;
  onRename: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const duplicateLayer = useProjectStore((state) => state.duplicateLayer);
  const removeLayer = useProjectStore((state) => state.removeLayer);
  const reorderLayer = useProjectStore((state) => state.reorderLayer);
  const setLayerVisible = useProjectStore((state) => state.setLayerVisible);
  const setLayerLocked = useProjectStore((state) => state.setLayerLocked);
  const selectLayer = useEditorStore((state) => state.selectLayer);

  // The last device is load-bearing: a project is a device mockup, and the
  // rest of the editor assumes one exists.
  const layers = useProjectStore((state) => state.project?.layers ?? []);
  const deviceCount = layers.filter((entry) => entry.type === "device").length;
  const deletable = layer.type !== "device" || deviceCount > 1;

  function run(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${layer.name}`}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-xs text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink",
            !open && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <MoreVertical className="h-3 w-3" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="left"
          align="start"
          sideOffset={6}
          className="z-50 w-44 rounded-md border border-line bg-surface-raised p-1 shadow-xl shadow-black/40"
        >
          <MenuItem icon={Pencil} label="Rename" onSelect={() => run(onRename)} />
          <MenuItem
            icon={Copy}
            label="Duplicate"
            onSelect={() =>
              run(() => {
                const id = duplicateLayer(layer.id);
                if (id) selectLayer(id);
              })
            }
          />
          <MenuItem
            icon={layer.visible ? EyeOff : Eye}
            label={layer.visible ? "Hide" : "Show"}
            onSelect={() => run(() => setLayerVisible(layer.id, !layer.visible))}
          />
          <MenuItem
            icon={layer.locked ? LockOpen : Lock}
            label={layer.locked ? "Unlock" : "Lock"}
            onSelect={() => run(() => setLayerLocked(layer.id, !layer.locked))}
          />

          <div className="my-1 h-px bg-line" />

          <MenuItem
            icon={ArrowUpToLine}
            label="Bring to front"
            disabled={index === total - 1}
            onSelect={() => run(() => reorderLayer(layer.id, "front"))}
          />
          <MenuItem
            icon={ArrowUp}
            label="Bring forward"
            disabled={index === total - 1}
            onSelect={() => run(() => reorderLayer(layer.id, "forward"))}
          />
          <MenuItem
            icon={ArrowDown}
            label="Send backward"
            disabled={index === 0}
            onSelect={() => run(() => reorderLayer(layer.id, "backward"))}
          />
          <MenuItem
            icon={ArrowDownToLine}
            label="Send to back"
            disabled={index === 0}
            onSelect={() => run(() => reorderLayer(layer.id, "back"))}
          />

          <div className="my-1 h-px bg-line" />

          <MenuItem
            icon={Trash2}
            label="Delete"
            danger
            disabled={!deletable}
            hint={deletable ? undefined : "A project needs its device"}
            onSelect={() =>
              run(() => {
                removeLayer(layer.id);
                selectLayer(null);
              })
            }
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onSelect,
  disabled,
  danger,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={hint}
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
      {label}
    </button>
  );
}
