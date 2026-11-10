# AGENTS.md (ds_app_site)
Common rules, repo map, environment: `/home/vector/projects/ds/AGENTS.md` — read it first.
MAIN site: https://ssazurov.github.io/ds_site/ (repo Ssazurov/ds_app_site, folder `projects/_ds_app_site`, default branch `main`). Static html. Epic: ds_app_site#1.
Old site / «Библиотека» = repo ds_site (`ds/ds_site`, github.io/ds_site_next). Roles: Ssazurov/ds docs/adr/0030-site-roles.md.

- The owner hand-edits the html; epic tasks may hold stale info — check the actual html.
- Header/footer: `_build/build.py`. SEO: `tools/seo.py` (meta/OG/canonical, sitemap.xml, robots.txt, og.png), base via env `SITE_BASE`.
- Local: :3002 = container `deploy-ds-app-site-1` (main site), :3001 = `deploy-ds-site-1` (old site).
- Don't rebuild site containers yourself: the owner rebuilds from Streamlit :8501, tab «пересборка». Only check what the ports serve.
- Skill: `ds-site-edit` (build, SEO, PR, merge, check :3001/:3002).
