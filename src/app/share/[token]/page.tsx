import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicViewer } from "@/components/viewer/PublicViewer";
import { getSharedProject } from "@/lib/projects/public-queries";
import { APP_NAME } from "@/lib/constants";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

/**
 * A shared project.
 *
 * Rendered on the server so the title, description and Open Graph image are in
 * the HTML — a link pasted into Slack or X has to unfurl without running any
 * JavaScript. Revalidated rather than dynamic, because a share link is read far
 * more often than the project behind it changes.
 */
export const revalidate = 60;

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getSharedProject(token);

  if (!data) {
    return { title: "Project not found", robots: { index: false } };
  }

  const title = data.name;
  const description =
    data.description ??
    `An animated device mockup${data.author.name ? ` by ${data.author.name}` : ""}, made with ${APP_NAME}.`;
  const images = data.thumbnailUrl ? [{ url: data.thumbnailUrl }] : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: "website",
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: data.thumbnailUrl ? [data.thumbnailUrl] : undefined,
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const data = await getSharedProject(token);

  if (!data) notFound();

  // Screen media lives in a private bucket, so a public viewer renders the
  // device with its generated placeholder unless the project embedded an asset
  // URL that is already public.
  return <PublicViewer data={data} screenUrl={null} />;
}
