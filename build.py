"""Inline src/ into one self-contained index.html (fonts and three.js load from CDNs).
Usage: python3 -I build.py"""
import base64, json, pathlib

root = pathlib.Path(__file__).resolve().parent
src = root / "src"
logo = base64.b64encode((root / "assets" / "bridge-river-logo.png").read_bytes()).decode()
css = (src / "styles.css").read_text(encoding="utf-8")
content = (src / "content.js").read_text(encoding="utf-8")
app = (src / "app.js").read_text(encoding="utf-8")
engine = (src / "companion3d.js").read_text(encoding="utf-8")
importmap = json.dumps({"imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
}})
for name, code in (("content.js", content), ("app.js", app), ("companion3d.js", engine)):
    assert "</script" not in code, name

html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#24452f">
<title>BRC Crossings 同渡 · Prototype</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;600;700;800&family=Noto+Sans+SC:wght@500;700&family=Noto+Sans+TC:wght@500;700&display=swap" rel="stylesheet">
<style>
{css}
</style>
<script type="importmap">{importmap}</script>
</head>
<body>
<div class="device"><div class="phone" id="phone">
  <div class="statusbar" id="statusbar"><span>9:41</span><span class="notch"></span><span>5G</span></div>
  <div id="app"></div>
</div></div>
<aside class="notes" aria-label="Prototype notes">
  <h1 class="ttl">BRC Crossings prototype, v2 (Riverbank)</h1>
  <div class="card"><div class="scr" id="screenName"></div><ul id="screenNotes"></ul></div>
  <div class="card"><div class="scr">Diorama time</div><div>The diorama follows your clock. Preview other times:</div><div class="times" id="times"></div></div>
  <div class="card"><details><summary>Prototype state</summary><pre id="stateDump"></pre></details></div>
  <div class="card" style="font-size:12px;color:#4d5f53">All people, posts and Counselor names are fictional samples. Logo from bridgerivercounseling.com until official files arrive. The Chinese-language crisis line stays hidden until a partner is confirmed.</div>
</aside>
<script>window.BRC_LOGO = "data:image/png;base64,{logo}";</script>
<script>
{content}
</script>
<script>
{app}
</script>
<script type="module">
{engine}
</script>
</body>
</html>
"""
(root / "index.html").write_text(html, encoding="utf-8")
print(f"index.html written: {len(html.encode()) / 1024:.0f} KB")
