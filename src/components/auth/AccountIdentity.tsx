"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Who you are signed in as.
 *
 * Avatar, name, email, provider — grouped, because they are one fact about one
 * person rather than four settings that happen to be nearby. Anywhere the
 * account appears it should appear like this.
 *
 * ## The avatar
 *
 * If the provider gave us a picture, that picture is shown. If it did not, the
 * fallback is the person's **initials** — never a generated pattern, a
 * gravatar, or an identicon derived from their email. A made-up image is
 * indistinguishable from a real one at 40px, so someone who has never set a
 * picture would believe Framelo had found one somewhere, and someone whose
 * Google picture failed to load would have no way to tell that it had.
 *
 * Which is also why a failed image load falls back rather than showing a broken
 * frame: `onError` flips to the initials and the component carries on.
 */

export interface AccountIdentityProps {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  /** "google", "email", … — whatever the session says signed this person in. */
  provider?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function AccountIdentity({
  name,
  email,
  avatarUrl,
  provider,
  size = "md",
  className,
}: AccountIdentityProps) {
  const label = name?.trim() || email?.split("@")[0] || "Your account";

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Avatar name={label} url={avatarUrl} size={size} />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium text-ink",
            size === "sm" ? "text-[12px]" : "text-[13px]",
          )}
        >
          {label}
        </p>
        {email ? <p className="truncate text-[11px] text-ink-muted">{email}</p> : null}
        {provider ? (
          <p className="truncate text-[10px] text-ink-subtle">{providerLabel(provider)}</p>
        ) : null}
      </div>
    </div>
  );
}

export function Avatar({
  name,
  url,
  size = "md",
}: {
  name: string;
  url: string | null;
  size?: "sm" | "md";
}) {
  // Which URL failed, rather than a boolean.
  //
  // A new picture deserves a new attempt — someone who sets one after a
  // previous URL 404'd should see it without reloading the app — and storing
  // the failed URL gets that by comparison during render, rather than by an
  // effect that resets a flag and costs a second pass.
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);

  const dimension = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const showImage = Boolean(url) && failedUrl !== url;

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-raised",
        dimension,
      )}
    >
      {showImage ? (
        // Deliberately a plain <img>: this is a remote URL from an identity
        // provider on a domain the image config knows nothing about, and
        // routing it through the optimiser would either need every provider's
        // CDN allow-listed or fail closed on the ones that were missed.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url!}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "font-medium text-ink-muted",
            size === "sm" ? "text-[10px]" : "text-[13px]",
          )}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/**
 * Up to two initials.
 *
 * Splits on whitespace, so "Chamath Dilshan" gives CD and a single name gives
 * one letter rather than two from the same word — which would read as someone
 * else's initials.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "google":
      return "Google account";
    case "github":
      return "GitHub account";
    case "email":
      return "Email account";
    default:
      return `${provider.charAt(0).toUpperCase()}${provider.slice(1)} account`;
  }
}
