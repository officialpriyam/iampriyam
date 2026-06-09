
CREATE TABLE public.site_content (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT UPDATE, INSERT ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site content"
  ON public.site_content FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can update site content"
  ON public.site_content FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can insert site content"
  ON public.site_content FOR INSERT
  TO authenticated
  WITH CHECK (true);

INSERT INTO public.site_content (id, data) VALUES ('main', '{
  "hero": {
    "name": "Michael Smith",
    "tagline": "lives in Chicago.",
    "eyebrow": "COLLECTION ''26",
    "bio": "Designing seamless digital interactions by focusing on the unique nuances which bring systems to life.",
    "roles": ["Creative", "Fullstack", "Founder", "Scholar"],
    "logo": "",
    "pfp": ""
  },
  "projects": [
    {"title": "Automotive Motion", "img": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=80", "featured": true, "url": "#"},
    {"title": "Urban Architecture", "img": "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&q=80", "featured": true, "url": "#"},
    {"title": "Human Perspective", "img": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200&q=80", "featured": true, "url": "#"},
    {"title": "Brand Identity", "img": "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=1600&q=80", "featured": true, "url": "#"}
  ],
  "skills": [
    {"name": "React", "icon": "⚛️", "level": 95},
    {"name": "TypeScript", "icon": "🔷", "level": 90},
    {"name": "Node.js", "icon": "🟢", "level": 85},
    {"name": "Design", "icon": "🎨", "level": 80}
  ],
  "playground": {
    "title": "Visual",
    "italic": "playground",
    "subtitle": "A loose collection of motion, type and image studies — works in progress, abandoned drafts, and happy accidents.",
    "ctaLabel": "View on Dribbble",
    "ctaUrl": "#",
    "images": [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
      "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800&q=80",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
      "https://images.unsplash.com/photo-1614849963640-9cc74b2a826f?w=800&q=80",
      "https://images.unsplash.com/photo-1633354820829-d33b5bbcc6bb?w=800&q=80",
      "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=800&q=80"
    ]
  },
  "stats": {
    "visible": false,
    "items": [
      {"value": "20+", "label": "Years Experience"},
      {"value": "95+", "label": "Projects Done"},
      {"value": "200%", "label": "Satisfied Clients"}
    ]
  },
  "footer": {
    "name": "Michael Smith",
    "email": "hello@michaelsmith.com",
    "available": true,
    "socials": [
      {"label": "Twitter", "url": "#"},
      {"label": "LinkedIn", "url": "#"},
      {"label": "Dribbble", "url": "#"},
      {"label": "GitHub", "url": "#"}
    ]
  }
}'::jsonb);
