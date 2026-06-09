import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSiteContent } from "@/lib/content.functions";
import { DEFAULT_SITE_CONTENT, normalizeSiteContent, type SiteContent } from "@/lib/site-content";

export function useSiteContent() {
  const fetchContent = useServerFn(getSiteContent);
  const [content, setContent] = useState<SiteContent | null>(null);
  useEffect(() => {
    let mounted = true;
    fetchContent()
      .then((res) => {
        if (mounted) setContent(normalizeSiteContent(res.content));
      })
      .catch(() => {
        if (mounted) setContent(DEFAULT_SITE_CONTENT);
      });
    return () => {
      mounted = false;
    };
  }, [fetchContent]);
  return content;
}

export { DEFAULT_SITE_CONTENT as DEFAULT_CONTENT };
