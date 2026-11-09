#!/usr/bin/env python3
"""SEO: meta/OpenGraph/canonical в каждой *.html, sitemap.xml, robots.txt, og.png.
Идемпотентно: python3 tools/seo.py  (BASE переопределяется env SITE_BASE)."""
import glob, html, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.environ.get('SITE_BASE', 'https://ssazurov.github.io/ds_site').rstrip('/')
NAME = 'Солнечный мир'
OG_SRC, OG = 'main-1.png', 'og.png'
DESC = {
    'index': 'Бесплатное образовательное приложение «Солнечный мир»: карточки и социальные истории для обучения детей и взрослых, в том числе с особенностями развития.',
    'about': 'О проекте «Солнечный мир»: православная семья Сазуровых создаёт бесплатное образовательное приложение.',
    'docs': 'Документы приложения «Солнечный мир»: политика конфиденциальности, пользовательское соглашение, оферта, согласие.',
    'download': 'Скачать приложение «Солнечный мир» для Android (APK) или открыть веб-версию.',
    'disclaimer': 'Дисклеймер приложения «Солнечный мир»: назначение и ограничения.',
    'guide': 'Руководство пользователя приложения «Солнечный мир».',
    'offer': 'Публичная оферта на безвозмездное использование программы «Солнечный мир».',
    'contacts': 'Контакты разработчика приложения «Солнечный мир»: ВКонтакте, MAX, электронная почта.',
    'help': 'Помощь по установке приложения «Солнечный мир»: RuStore и APK.',
    'delete-data': 'Как удалить данные приложения «Солнечный мир»: все данные хранятся только на вашем устройстве.',
}
TITLE = {}  # заголовки правятся в самих html; сюда – только принудительные


def txt(s):
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s))).strip()


def cut(s, n=160):
    if len(s) <= n:
        return s
    return s[:n].rsplit(' ', 1)[0].rstrip(',;:–-') + '…'


def make_og():
    try:
        from PIL import Image
    except ImportError:
        return
    src = os.path.join(ROOT, OG_SRC)
    if not os.path.exists(src):
        return
    im = Image.open(src).convert('RGB')
    w, h = im.size
    k = max(1200 / w, 630 / h)
    im = im.resize((round(w * k), round(h * k)), Image.LANCZOS)
    w, h = im.size
    l, t = (w - 1200) // 2, (h - 630) // 2
    im.crop((l, t, l + 1200, t + 630)).save(os.path.join(ROOT, OG), optimize=True)


def lastmod(f):
    try:
        d = subprocess.check_output(['git', 'log', '-1', '--format=%cs', '--', f], cwd=ROOT, text=True).strip()
        return d or None
    except Exception:
        return None


def main():
    make_og()
    urls = []
    for path in sorted(glob.glob(os.path.join(ROOT, '*.html'))):
        f = os.path.basename(path)
        slug = f[:-5]
        s = open(path, encoding='utf-8').read()
        s = re.sub(r'\s*<!--seo-->.*?<!--/seo-->', '', s, flags=re.S)
        if slug in TITLE:
            s = re.sub(r'<title>.*?</title>', '<title>%s</title>' % TITLE[slug], s, count=1, flags=re.S)
        title = txt(re.search(r'<title>(.*?)</title>', s, re.S).group(1))
        desc = DESC.get(slug)
        if not desc:
            m = re.search(r'<p[^>]*>(.*?)</p>', s, re.S)
            desc = cut(txt(m.group(1))) if m else NAME
        url = BASE + '/' if slug == 'index' else '%s/%s' % (BASE, f)
        e = lambda v: html.escape(v, quote=True)
        block = (
            '<!--seo-->'
            '<meta name="description" content="%s">'
            '<link rel="canonical" href="%s">'
            '<meta property="og:type" content="website">'
            '<meta property="og:site_name" content="%s">'
            '<meta property="og:locale" content="ru_RU">'
            '<meta property="og:title" content="%s">'
            '<meta property="og:description" content="%s">'
            '<meta property="og:url" content="%s">'
            '<meta property="og:image" content="%s/%s">'
            '<meta property="og:image:width" content="1200">'
            '<meta property="og:image:height" content="630">'
            '<meta name="twitter:card" content="summary_large_image">'
            '<!--/seo-->'
        ) % (e(desc), url, NAME, e(title), e(desc), url, BASE, OG)
        s = s.replace('</head>', block + '</head>', 1)
        open(path, 'w', encoding='utf-8', newline='').write(s)
        urls.append((url, lastmod(f), slug))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, lm, slug in urls:
        sm.append('  <url><loc>%s</loc>%s<priority>%s</priority></url>' % (
            url, '<lastmod>%s</lastmod>' % lm if lm else '', '1.0' if slug == 'index' else '0.6'))
    sm.append('</urlset>')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(sm) + '\n')
    open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8').write(
        'User-agent: *\nAllow: /\nDisallow: /app/\nDisallow: /download/\n\nSitemap: %s/sitemap.xml\n' % BASE)
    print('ok', len(urls), 'pages')


if __name__ == '__main__':
    main()
