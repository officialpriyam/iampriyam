import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { SelectedWorks } from "@/components/SelectedWorks";
import { Skills } from "@/components/Skills";
import { Explorations } from "@/components/Explorations";
import { Stats } from "@/components/Stats";
import { Contact } from "@/components/Contact";
import { useSiteContent } from "@/hooks/useSiteContent";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Portfolio" },
      { name: "description", content: "Creative portfolio." },
    ],
  }),
  component: Index,
});

function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const content = useSiteContent();
  const siteName = content?.hero.name?.trim() || "Portfolio";
  const finishLoading = useCallback(() => setIsLoading(false), []);

  useEffect(() => {
    document.title = siteName;
  }, [siteName]);

  return (
    <main className="bg-bg text-text-primary font-body">
      {isLoading && <LoadingScreen label={siteName} onComplete={finishLoading} />}
      <Navbar />
      <Hero />
      <SelectedWorks />
      <Skills />
      <Explorations />
      <Stats />
      <Contact />
    </main>
  );
}
