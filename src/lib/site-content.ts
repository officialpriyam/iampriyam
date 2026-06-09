export type SiteContent = {
  hero: {
    name: string;
    tagline: string;
    eyebrow: string;
    bio: string;
    roles: string[];
    logo?: string;
    pfp?: string;
  };
  projects: { title: string; img: string; featured: boolean; url: string }[];
  skills: { name: string; icon: string; level: number }[];
  playground: {
    title: string;
    italic: string;
    subtitle: string;
    ctaLabel: string;
    ctaUrl: string;
    images: string[];
  };
  stats: { visible: boolean; items: { value: string; label: string }[] };
  footer: {
    name: string;
    email: string;
    available: boolean;
    socials: { label: string; url: string }[];
  };
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    name: "",
    tagline: "",
    eyebrow: "",
    bio: "",
    roles: ["Creative"],
    logo: "",
    pfp: "",
  },
  projects: [],
  skills: [],
  playground: {
    title: "",
    italic: "",
    subtitle: "",
    ctaLabel: "",
    ctaUrl: "#",
    images: [],
  },
  stats: { visible: false, items: [] },
  footer: { name: "", email: "", available: false, socials: [] },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : fallback;
}

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function normalizeSiteContent(input: unknown): SiteContent {
  const root = isRecord(input) ? input : {};
  const hero = isRecord(root.hero) ? root.hero : {};
  const playground = isRecord(root.playground) ? root.playground : {};
  const stats = isRecord(root.stats) ? root.stats : {};
  const footer = isRecord(root.footer) ? root.footer : {};

  return {
    hero: {
      name: stringValue(hero.name, DEFAULT_SITE_CONTENT.hero.name),
      tagline: stringValue(hero.tagline, DEFAULT_SITE_CONTENT.hero.tagline),
      eyebrow: stringValue(hero.eyebrow, DEFAULT_SITE_CONTENT.hero.eyebrow),
      bio: stringValue(hero.bio, DEFAULT_SITE_CONTENT.hero.bio),
      roles: stringArray(hero.roles, DEFAULT_SITE_CONTENT.hero.roles),
      logo: stringValue(hero.logo, DEFAULT_SITE_CONTENT.hero.logo),
      pfp: stringValue(hero.pfp, DEFAULT_SITE_CONTENT.hero.pfp),
    },
    projects: recordArray(root.projects).map((project) => ({
      title: stringValue(project.title),
      img: stringValue(project.img),
      featured: booleanValue(project.featured),
      url: stringValue(project.url, "#"),
    })),
    skills: recordArray(root.skills).map((skill) => ({
      name: stringValue(skill.name),
      icon: stringValue(skill.icon),
      level: numberValue(skill.level),
    })),
    playground: {
      title: stringValue(playground.title),
      italic: stringValue(playground.italic),
      subtitle: stringValue(playground.subtitle),
      ctaLabel: stringValue(playground.ctaLabel),
      ctaUrl: stringValue(playground.ctaUrl, "#"),
      images: stringArray(playground.images),
    },
    stats: {
      visible: booleanValue(stats.visible),
      items: recordArray(stats.items).map((item) => ({
        value: stringValue(item.value),
        label: stringValue(item.label),
      })),
    },
    footer: {
      name: stringValue(footer.name),
      email: stringValue(footer.email),
      available: booleanValue(footer.available),
      socials: recordArray(footer.socials).map((social) => ({
        label: stringValue(social.label),
        url: stringValue(social.url, "#"),
      })),
    },
  };
}
