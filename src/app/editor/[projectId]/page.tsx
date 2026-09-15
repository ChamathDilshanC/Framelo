import type { Metadata } from "next";

import { EditorShell } from "@/components/editor/EditorShell";

interface EditorPageProps {
  params: Promise<{ projectId: string }>;
}

export const metadata: Metadata = {
  title: "Editor",
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = await params;
  return <EditorShell projectId={projectId} />;
}
