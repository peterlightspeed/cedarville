#!/usr/bin/env bash
# The website is served from the repo ROOT (GitHub Pages), but the maintained copy lives in site/.
# Run this after any change inside site/ :   bash sync-site.sh
set -e
cd "$(dirname "$0")"
cp -a site/*.html site/robots.txt site/sitemap.xml .
for d in css js images data app; do
  mkdir -p "$d"
  cp -a "site/$d/." "$d/"
done
echo "Done: website copied from site/ to the repo root."
