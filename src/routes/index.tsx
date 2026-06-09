import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { SelectedWorks } from "@/components/SelectedWorks";
import { Skills } from "@/components/Skills";
import { Explorations } from "@/components/Explorations";
import { Stats } from "@/components/Stats";
import { Contact } from "@/components/Contact";

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
  return (
    <main className="bg-bg text-text-primary font-body">
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
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
