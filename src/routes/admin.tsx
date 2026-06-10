import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminSiteContent,
  updateSiteContent,
  getConnectionStatus,
  invalidateContentCache,
  createAssetUploadUrl,
} from "@/lib/content.functions";
import { normalizeSiteContent, type SiteContent } from "@/lib/site-content";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Database,
  FileText,
  LinkIcon,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminPage,
});

type Status = Awaited<ReturnType<typeof getConnectionStatus>>;
type UpdateContentOptions = { saveNow?: boolean };

const ADMIN_TABS = [
  { value: "hero", label: "Hero" },
  { value: "projects", label: "Projects" },
  { value: "skills", label: "Skills" },
  { value: "playground", label: "Playground" },
  { value: "documents", label: "Documents" },
  { value: "stats", label: "Stats" },
  { value: "footer", label: "Footer" },
] as const;

const SITE_ASSETS_BUCKET = "site-assets";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getSessionKey(session: unknown) {
  if (session === null || typeof session !== "object") return "";

  const user = (session as { user?: { id?: unknown } }).user;
  if (typeof user?.id === "string" && user.id) return user.id;

  const token = (session as { access_token?: unknown }).access_token;
  return typeof token === "string" ? token : "";
}

function AdminPage() {
  const fetchAdminContent = useServerFn(getAdminSiteContent);
  const saveContent = useServerFn(updateSiteContent);
  const fetchStatus = useServerFn(getConnectionStatus);
  const invalidate = useServerFn(invalidateContentCache);

  const [session, setSession] = useState<unknown>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [source, setSource] = useState<"redis" | "supabase" | "default" | "">("");
  const [status, setStatus] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const latestContentJsonRef = useRef("");
  const loadCompleteRef = useRef(false);
  const loadedSessionKeyRef = useRef("");

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    async function syncSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) setSession(data.session);
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
          if (mounted) setSession(s);
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      } catch (e) {
        toast.error(String(e));
      } finally {
        if (mounted) setChecking(false);
      }
    }

    syncSession();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const sessionKey = getSessionKey(session);

    if (!sessionKey) {
      loadedSessionKeyRef.current = "";
      loadCompleteRef.current = false;
      setContent(null);
      setDirty(false);
      return;
    }

    if (loadedSessionKeyRef.current === sessionKey) return;

    loadedSessionKeyRef.current = sessionKey;
    loadCompleteRef.current = false;
    fetchAdminContent()
      .then((res) => {
        const normalized = normalizeSiteContent(res.content);
        latestContentJsonRef.current = JSON.stringify(normalized);
        setContent(normalized);
        setSource(res.source);
        setDirty(false);
        loadCompleteRef.current = true;
      })
      .catch((e) => {
        loadedSessionKeyRef.current = "";
        toast.error(String(e));
      });
    fetchStatus()
      .then(setStatus)
      .catch(() => {});
  }, [session, fetchAdminContent, fetchStatus]);

  useEffect(() => {
    latestContentJsonRef.current = content ? JSON.stringify(content) : "";
  }, [content]);

  const persistContent = useCallback(
    async (nextContent: SiteContent, mode: "auto" | "manual") => {
      const submittedJson = JSON.stringify(nextContent);
      setSaving(true);
      try {
        const res = await saveContent({ data: { data: nextContent } });
        const savedContent = normalizeSiteContent(res.content);
        const savedJson = JSON.stringify(savedContent);

        if (latestContentJsonRef.current === submittedJson) {
          latestContentJsonRef.current = savedJson;
          setContent(savedContent);
          setDirty(false);
        } else {
          setDirty(true);
        }

        setSource("supabase");
        setLastSavedAt(new Date());
        if (res.cache === "unavailable") {
          toast.warning("Saved to Supabase, but Redis cache could not be refreshed.");
        } else if (mode === "manual") {
          toast.success("Saved");
        }
        const s = await fetchStatus();
        setStatus(s);
      } catch (e) {
        setDirty(true);
        toast.error(String(e));
      } finally {
        setSaving(false);
      }
    },
    [saveContent, fetchStatus],
  );

  const updateContent = useCallback(
    (next: SiteContent, options: UpdateContentOptions = {}) => {
      latestContentJsonRef.current = JSON.stringify(next);
      setContent(next);
      setDirty(true);

      if (options.saveNow && loadCompleteRef.current) {
        void persistContent(next, "auto");
      }
    },
    [persistContent],
  );

  useEffect(() => {
    if (!session || !content || !dirty || !loadCompleteRef.current) return;

    const timer = window.setTimeout(() => {
      void persistContent(content, "auto");
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [content, dirty, persistContent, session]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    else toast.success("Welcome back");
  }

  async function handleSave() {
    if (!content) return;
    await persistContent(content, "manual");
  }

  async function handleInvalidate() {
    try {
      await invalidate();
      toast.success("Cache cleared");
      const res = await fetchAdminContent();
      const normalized = normalizeSiteContent(res.content);
      latestContentJsonRef.current = JSON.stringify(normalized);
      setContent(normalized);
      setSource(res.source);
      setDirty(false);
    } catch (e) {
      toast.error(String(e));
    }
  }

  if (checking) return <div className="min-h-screen bg-bg" />;

  if (!session) {
    return (
      <main className="min-h-screen bg-bg text-text-primary flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-surface/50 border border-stroke rounded-2xl p-6 space-y-4"
        >
          <h1 className="text-2xl font-display italic">Admin login</h1>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <Button type="submit" className="w-full">
            Sign in
          </Button>
          <Link to="/" className="block text-center text-xs text-muted hover:text-text-primary">
            ← Back to site
          </Link>
        </form>
      </main>
    );
  }

  if (!content) return <div className="min-h-screen bg-bg text-muted p-10">Loading…</div>;

  return (
    <main className="min-h-screen bg-bg text-text-primary p-6 md:p-10 max-w-6xl mx-auto">
      <header className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display italic">Admin</h1>
          <p className="text-xs text-muted mt-1">
            Loaded from <span className="text-text-primary">{source || "—"}</span>
            {saving && <span className="ml-2 text-sky-300">Saving changes...</span>}
            {!saving && dirty && <span className="ml-2 text-amber-300">Unsaved changes</span>}
            {!dirty && lastSavedAt && (
              <span className="ml-2 text-green-400">
                Saved {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/"
            className="text-xs border border-stroke rounded-full px-4 py-2 hover:bg-surface"
          >
            View site
          </Link>
          <Button size="sm" variant="outline" onClick={handleInvalidate}>
            <RefreshCw className="w-3 h-3 mr-1" /> Clear cache
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            <span>{saving ? "Saving..." : dirty ? "Save changes" : "Saved"}</span>
            <span className="hidden">{saving ? "Saving…" : "Save changes"}</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => supabase.auth.signOut()}>
            Logout
          </Button>
        </div>
      </header>

      <StatusBar status={status} onRefresh={() => fetchStatus().then(setStatus)} />

      <Tabs defaultValue="hero" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 gap-1 h-auto rounded-xl sm:grid-cols-3 lg:grid-cols-7">
          {ADMIN_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="h-9 rounded-lg">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="hero" className="mt-6">
          <HeroEditor content={content} setContent={updateContent} />
        </TabsContent>
        <TabsContent value="projects" className="mt-6">
          <ProjectsEditor content={content} setContent={updateContent} />
        </TabsContent>
        <TabsContent value="skills" className="mt-6">
          <SkillsEditor content={content} setContent={updateContent} />
        </TabsContent>
        <TabsContent value="playground" className="mt-6">
          <PlaygroundEditor content={content} setContent={updateContent} />
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <DocumentsEditor content={content} setContent={updateContent} />
        </TabsContent>
        <TabsContent value="stats" className="mt-6">
          <StatsEditor content={content} setContent={updateContent} />
        </TabsContent>
        <TabsContent value="footer" className="mt-6">
          <FooterEditor content={content} setContent={updateContent} />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-10 pb-12">
        <Button onClick={handleSave} disabled={saving || !dirty} size="lg">
          <span>{saving ? "Saving..." : dirty ? "Save all changes" : "All changes saved"}</span>
          <span className="hidden">{saving ? "Saving…" : "Save all changes"}</span>
        </Button>
      </div>
    </main>
  );
}

function StatusBar({ status, onRefresh }: { status: Status | null; onRefresh: () => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <StatusCard
        icon={<Zap className="w-4 h-4" />}
        label="Redis (Upstash)"
        configured={status?.redis.configured ?? false}
        ok={status?.redis.ok ?? false}
        latency={status?.redis.latencyMs}
        error={status?.redis.error}
      />
      <StatusCard
        icon={<Database className="w-4 h-4" />}
        label="Supabase"
        configured={status?.supabase.configured ?? true}
        ok={status?.supabase.ok ?? false}
        latency={status?.supabase.latencyMs}
        error={status?.supabase.error}
      />
      <button
        onClick={onRefresh}
        className="text-xs text-muted hover:text-text-primary text-left col-span-full"
      >
        <RefreshCw className="inline w-3 h-3 mr-1" /> Refresh status
      </button>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  configured,
  ok,
  latency,
  error,
}: {
  icon: React.ReactNode;
  label: string;
  configured: boolean;
  ok: boolean;
  latency?: number;
  error?: string;
}) {
  const tone = !configured ? "bg-muted/20" : ok ? "bg-green-500" : "bg-red-500";
  const text = !configured ? "Not configured" : ok ? "Connected" : "Error";
  return (
    <div className="flex items-center justify-between bg-surface/50 border border-stroke rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full ${tone} ${ok ? "animate-pulse" : ""}`} />
        <div>
          <p className="text-sm flex items-center gap-2">
            {icon} {label}
          </p>
          <p className="text-xs text-muted">
            {text}
            {error ? ` — ${error}` : ""}
          </p>
        </div>
      </div>
      {typeof latency === "number" && configured && (
        <span className="text-xs text-muted">{latency}ms</span>
      )}
    </div>
  );
}

/* ---------- Section editors ---------- */

function HeroEditor({ content, setContent }: EditorProps) {
  const h = content.hero;
  const set = (patch: Partial<SiteContent["hero"]>, options?: UpdateContentOptions) =>
    setContent({ ...content, hero: { ...h, ...patch } }, options);
  return (
    <Card title="Hero / Profile">
      <Grid>
        <FieldRow label="Name">
          <Input value={h.name} onChange={(e) => set({ name: e.target.value })} />
        </FieldRow>
        <FieldRow label="Eyebrow">
          <Input value={h.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} />
        </FieldRow>
        <FieldRow label="Tagline">
          <Input value={h.tagline} onChange={(e) => set({ tagline: e.target.value })} />
        </FieldRow>
        <FieldRow label="Roles (comma-separated)">
          <Input
            value={h.roles.join(", ")}
            onChange={(e) =>
              set({
                roles: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </FieldRow>
        <FieldRow label="Logo URL">
          <Input value={h.logo || ""} onChange={(e) => set({ logo: e.target.value })} />
        </FieldRow>
        <FieldRow label="Profile picture URL">
          <Input value={h.pfp || ""} onChange={(e) => set({ pfp: e.target.value })} />
        </FieldRow>
      </Grid>
      <FieldRow label="Bio">
        <Textarea rows={3} value={h.bio} onChange={(e) => set({ bio: e.target.value })} />
      </FieldRow>
    </Card>
  );
}

function ProjectsEditor({ content, setContent }: EditorProps) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<SiteContent["projects"][number] | null>(null);

  const open = (i: number | "new") => {
    if (i === "new") {
      setDraft({ title: "", img: "", url: "", githubUrl: "", featured: false });
      setEditing(-1);
    } else {
      setDraft({ ...content.projects[i] });
      setEditing(i);
    }
  };
  const save = () => {
    if (!draft) return;
    const arr = [...content.projects];
    if (editing === -1) arr.push(draft);
    else if (editing !== null) arr[editing] = draft;
    setContent({ ...content, projects: arr }, { saveNow: true });
    setEditing(null);
    setDraft(null);
  };
  const remove = (i: number) =>
    setContent(
      { ...content, projects: content.projects.filter((_, j) => j !== i) },
      { saveNow: true },
    );

  return (
    <Card
      title="Projects"
      action={
        <Button size="sm" onClick={() => open("new")}>
          <Plus className="w-3 h-3 mr-1" /> Add project
        </Button>
      }
    >
      <p className="text-xs text-muted mb-4">
        Toggle "Featured" to show on landing page (first 4). All show on /projects.
      </p>
      {content.projects.length === 0 && (
        <p className="text-sm text-muted py-6 text-center">No projects yet.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {content.projects.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-surface/40 border border-stroke rounded-xl p-3"
          >
            <div className="w-14 h-14 rounded-lg bg-surface overflow-hidden border border-stroke flex-shrink-0">
              {p.img && <img src={p.img} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{p.title || "Untitled"}</p>
              <p className="text-xs text-muted truncate">
                {p.url || "no link"}
                {p.githubUrl && " | GitHub"}
                {p.featured && " · ★ Featured"}
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => open(i)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === -1 ? "Add project" : "Edit project"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <FieldRow label="Title">
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Image URL">
                <Input
                  value={draft.img}
                  onChange={(e) => setDraft({ ...draft, img: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Link URL">
                <Input
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="GitHub URL">
                <Input
                  value={draft.githubUrl}
                  onChange={(e) => setDraft({ ...draft, githubUrl: e.target.value })}
                />
              </FieldRow>
              <div className="flex items-center justify-between">
                <Label>Featured on landing</Label>
                <Switch
                  checked={draft.featured}
                  onCheckedChange={(v) => setDraft({ ...draft, featured: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SkillsEditor({ content, setContent }: EditorProps) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<SiteContent["skills"][number] | null>(null);
  const open = (i: number | "new") => {
    if (i === "new") {
      setDraft({ name: "", icon: "", level: 80 });
      setEditing(-1);
    } else {
      setDraft({ ...content.skills[i] });
      setEditing(i);
    }
  };
  const save = () => {
    if (!draft) return;
    const arr = [...content.skills];
    if (editing === -1) arr.push(draft);
    else if (editing !== null) arr[editing] = draft;
    setContent({ ...content, skills: arr }, { saveNow: true });
    setEditing(null);
    setDraft(null);
  };
  const remove = (i: number) =>
    setContent(
      { ...content, skills: content.skills.filter((_, j) => j !== i) },
      { saveNow: true },
    );

  return (
    <Card
      title="Skills"
      action={
        <Button size="sm" onClick={() => open("new")}>
          <Plus className="w-3 h-3 mr-1" /> Add skill
        </Button>
      }
    >
      <p className="text-xs text-muted mb-3">
        Icon can be an emoji or an image URL (e.g. devicon CDN).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {content.skills.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-surface/40 border border-stroke rounded-xl p-3"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface border border-stroke">
              {s.icon?.startsWith("http") ? (
                <img src={s.icon} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <span className="text-xl">{s.icon}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{s.name}</p>
              <p className="text-xs text-muted">{s.level}%</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => open(i)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === -1 ? "Add skill" : "Edit skill"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <FieldRow label="Name">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Icon (emoji or image URL)">
                <Input
                  value={draft.icon}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                  placeholder="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/..."
                />
              </FieldRow>
              <FieldRow label={`Proficiency: ${draft.level}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.level}
                  onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })}
                  className="w-full"
                />
              </FieldRow>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PlaygroundEditor({ content, setContent }: EditorProps) {
  const p = content.playground;
  const set = (patch: Partial<SiteContent["playground"]>, options?: UpdateContentOptions) =>
    setContent({ ...content, playground: { ...p, ...patch } }, options);
  const [imgEditing, setImgEditing] = useState<number | null>(null);
  const [imgDraft, setImgDraft] = useState("");

  const openImg = (i: number | "new") => {
    if (i === "new") {
      setImgDraft("");
      setImgEditing(-1);
    } else {
      setImgDraft(p.images[i]);
      setImgEditing(i);
    }
  };
  const saveImg = () => {
    const arr = [...p.images];
    if (imgEditing === -1) arr.push(imgDraft);
    else if (imgEditing !== null) arr[imgEditing] = imgDraft;
    set({ images: arr }, { saveNow: true });
    setImgEditing(null);
  };

  return (
    <Card title="Visual playground">
      <Grid>
        <FieldRow label="Heading">
          <Input value={p.title} onChange={(e) => set({ title: e.target.value })} />
        </FieldRow>
        <FieldRow label="Italic word">
          <Input value={p.italic} onChange={(e) => set({ italic: e.target.value })} />
        </FieldRow>
        <FieldRow label="CTA label">
          <Input value={p.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} />
        </FieldRow>
        <FieldRow label="CTA URL">
          <Input value={p.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} />
        </FieldRow>
      </Grid>
      <FieldRow label="Subtitle">
        <Textarea rows={2} value={p.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
      </FieldRow>

      <div className="flex items-center justify-between mt-4 mb-2">
        <Label className="text-sm">Images</Label>
        <Button size="sm" onClick={() => openImg("new")}>
          <Plus className="w-3 h-3 mr-1" /> Add image
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {p.images.map((src, i) => (
          <div
            key={i}
            className="relative group aspect-square rounded-lg overflow-hidden border border-stroke bg-surface"
          >
            {src && <img src={src} alt="" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
              <Button size="icon" variant="outline" onClick={() => openImg(i)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() =>
                  set({ images: p.images.filter((_, j) => j !== i) }, { saveNow: true })
                }
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={imgEditing !== null} onOpenChange={(o) => !o && setImgEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{imgEditing === -1 ? "Add image" : "Edit image"}</DialogTitle>
          </DialogHeader>
          <FieldRow label="Image URL">
            <Input value={imgDraft} onChange={(e) => setImgDraft(e.target.value)} />
          </FieldRow>
          {imgDraft && (
            <img
              src={imgDraft}
              alt=""
              className="w-full max-h-60 object-contain rounded-lg border border-stroke"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImgEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveImg}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type DocumentKind = "cv" | "resume";

function getDocumentContentType(file: File) {
  const normalizedType = file.type.trim().toLowerCase();
  if (DOCUMENT_CONTENT_TYPES.has(normalizedType)) return normalizedType;

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "doc") return "application/msword";
  if (extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "";
}

function DocumentsEditor({ content, setContent }: EditorProps) {
  const createUploadUrl = useServerFn(createAssetUploadUrl);
  const documents = content.documents;
  const [uploading, setUploading] = useState<DocumentKind | null>(null);
  const set = (patch: Partial<SiteContent["documents"]>, options?: UpdateContentOptions) =>
    setContent({ ...content, documents: { ...documents, ...patch } }, options);

  async function uploadDocument(kind: DocumentKind, file: File | null) {
    if (!file) return;

    const contentType = getDocumentContentType(file);
    if (!contentType) {
      toast.error("Only PDF, DOC, and DOCX files are supported.");
      return;
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error("Document must be 10 MB or smaller.");
      return;
    }

    setUploading(kind);
    try {
      const signed = await createUploadUrl({
        data: {
          kind,
          fileName: file.name,
          contentType,
          size: file.size,
        },
      });
      const { error } = await supabase.storage
        .from(SITE_ASSETS_BUCKET)
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType });

      if (error) throw error;

      const key: keyof SiteContent["documents"] = kind === "cv" ? "cvUrl" : "resumeUrl";
      set({ [key]: signed.publicUrl } as Partial<SiteContent["documents"]>, { saveNow: true });
      toast.success(`${kind === "cv" ? "CV" : "Resume"} uploaded`);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setUploading(null);
    }
  }

  return (
    <Card title="CV / Resume">
      <p className="text-xs text-muted mb-4 flex items-center gap-2">
        <Upload className="w-3 h-3" />
        Upload PDF, DOC, or DOCX files, then save changes to publish the buttons.
      </p>
      <Grid>
        <DocumentUploadField
          label="CV"
          url={documents.cvUrl}
          uploading={uploading === "cv"}
          onUrlChange={(cvUrl) => set({ cvUrl })}
          onUpload={(file) => uploadDocument("cv", file)}
        />
        <DocumentUploadField
          label="Resume"
          url={documents.resumeUrl}
          uploading={uploading === "resume"}
          onUrlChange={(resumeUrl) => set({ resumeUrl })}
          onUpload={(file) => uploadDocument("resume", file)}
        />
      </Grid>
    </Card>
  );
}

function DocumentUploadField({
  label,
  url,
  uploading,
  onUrlChange,
  onUpload,
}: {
  label: string;
  url: string;
  uploading: boolean;
  onUrlChange: (url: string) => void;
  onUpload: (file: File | null) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-stroke bg-surface/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-lg bg-surface border border-stroke flex items-center justify-center">
            <FileText className="w-4 h-4 text-muted" />
          </span>
          <div className="min-w-0">
            <p className="text-sm">{label}</p>
            <p className="text-xs text-muted truncate">
              {url ? "File URL is set" : "No file selected"}
            </p>
          </div>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs border border-stroke rounded-full px-3 py-1.5 hover:bg-surface"
          >
            Open
          </a>
        )}
      </div>

      <FieldRow label={`${label} upload`}>
        <Input
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={uploading}
          onChange={(e) => {
            const input = e.currentTarget;
            const file = input.files?.[0] ?? null;
            void onUpload(file).finally(() => {
              input.value = "";
            });
          }}
        />
      </FieldRow>

      <FieldRow label={`${label} URL`}>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </FieldRow>

      {uploading && <p className="text-xs text-muted">Uploading...</p>}
    </div>
  );
}

function StatsEditor({ content, setContent }: EditorProps) {
  const s = content.stats;
  const set = (patch: Partial<SiteContent["stats"]>, options?: UpdateContentOptions) =>
    setContent({ ...content, stats: { ...s, ...patch } }, options);
  return (
    <Card title="Stats">
      <div className="flex items-center justify-between mb-4">
        <Label>Show stats section</Label>
        <Switch checked={s.visible} onCheckedChange={(v) => set({ visible: v })} />
      </div>
      {s.items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 mb-2">
          <Input
            value={it.value}
            placeholder="20+"
            onChange={(e) =>
              set({ items: s.items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })
            }
          />
          <Input
            value={it.label}
            placeholder="Years Experience"
            onChange={(e) =>
              set({ items: s.items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })
            }
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => set({ items: s.items.filter((_, j) => j !== i) }, { saveNow: true })}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => set({ items: [...s.items, { value: "", label: "" }] }, { saveNow: true })}
      >
        <Plus className="w-3 h-3 mr-1" /> Add stat
      </Button>
    </Card>
  );
}

function FooterEditor({ content, setContent }: EditorProps) {
  const f = content.footer;
  const set = (patch: Partial<SiteContent["footer"]>, options?: UpdateContentOptions) =>
    setContent({ ...content, footer: { ...f, ...patch } }, options);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ label: string; url: string } | null>(null);

  const open = (i: number | "new") => {
    if (i === "new") {
      setDraft({ label: "", url: "" });
      setEditing(-1);
    } else {
      setDraft({ ...f.socials[i] });
      setEditing(i);
    }
  };
  const save = () => {
    if (!draft) return;
    const arr = [...f.socials];
    if (editing === -1) arr.push(draft);
    else if (editing !== null) arr[editing] = draft;
    set({ socials: arr }, { saveNow: true });
    setEditing(null);
  };

  return (
    <Card title="Footer">
      <Grid>
        <FieldRow label="Name (© line)">
          <Input value={f.name} onChange={(e) => set({ name: e.target.value })} />
        </FieldRow>
        <FieldRow label="Contact email">
          <Input value={f.email} onChange={(e) => set({ email: e.target.value })} />
        </FieldRow>
      </Grid>
      <div className="flex items-center justify-between my-3">
        <Label>Show "Available for projects"</Label>
        <Switch checked={f.available} onCheckedChange={(v) => set({ available: v })} />
      </div>

      <div className="flex items-center justify-between mt-4 mb-2">
        <Label className="text-sm">Social links</Label>
        <Button size="sm" onClick={() => open("new")}>
          <Plus className="w-3 h-3 mr-1" /> Add link
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {f.socials.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-surface/40 border border-stroke rounded-xl p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm">{s.label || "Untitled"}</p>
              <p className="text-xs text-muted truncate">{s.url}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => open(i)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() =>
                set({ socials: f.socials.filter((_, j) => j !== i) }, { saveNow: true })
              }
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === -1 ? "Add link" : "Edit link"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <FieldRow label="Label">
                <Input
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="URL">
                <Input
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                />
              </FieldRow>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------- shared bits ---------- */

type EditorProps = {
  content: SiteContent;
  setContent: (c: SiteContent, options?: UpdateContentOptions) => void;
};

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface/30 border border-stroke rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display italic">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted">{label}</Label>
      {children}
    </div>
  );
}
