
DROP POLICY IF EXISTS "Authenticated can update site content" ON public.site_content;
DROP POLICY IF EXISTS "Authenticated can insert site content" ON public.site_content;

CREATE POLICY "Authenticated can update site content"
  ON public.site_content FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert site content"
  ON public.site_content FOR INSERT
  TO authenticated
  WITH CHECK (true);
