import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfilePhotoProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

// Cache resolved signed URLs across the app lifetime
const cache = new Map<string, string>();

/**
 * Extracts the object path from a Supabase storage URL (public or signed) and
 * returns a fresh signed URL, since the `profile-photos` bucket is private.
 */
export function ProfilePhoto({ url, alt, className, fallback }: ProfilePhotoProps) {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setResolved(null);
      return;
    }

    // Already a blob/data URL
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      setResolved(url);
      return;
    }

    // Try to extract the storage path
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/profile-photos\/([^?]+)/);
    if (!match) {
      // Not a supabase storage URL — use as-is
      setResolved(url);
      return;
    }
    const path = decodeURIComponent(match[1]);

    if (cache.has(path)) {
      setResolved(cache.get(path)!);
      return;
    }

    supabase.storage
      .from("profile-photos")
      .createSignedUrl(path, 60 * 60) // 1h
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.signedUrl) {
          cache.set(path, data.signedUrl);
          setResolved(data.signedUrl);
        } else {
          setResolved(null);
        }
      })
      .catch(() => !cancelled && setResolved(null));

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!resolved) return <>{fallback ?? null}</>;
  return <img src={resolved} alt={alt} className={className} />;
}
