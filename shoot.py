import sys, subprocess, time, os
from playwright.sync_api import sync_playwright

ROOT = os.path.expanduser('~/workspace/wl-agent/makefun/best-flight-game-20261126-0057-ka')
GAME = os.path.join(ROOT, 'game')
SHOTS = [
    ('climax', 404, '01-climax.jpg'),
    ('play', 207, '02-play.jpg'),
    ('start', 101, '03-start.jpg'),
    ('end', 404, '04-end.jpg'),
]
srv = subprocess.Popen(['python3', '-m', 'http.server', '8123'], cwd=GAME,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.0)
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for mode, seed, fname in SHOTS:
            page = browser.new_page(viewport={'width': 1280, 'height': 720})
            errors, reqs = [], []
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('request', lambda r: reqs.append(r.url))
            page.goto(f'http://localhost:8123/index.html?shot={mode}&seed={seed}')
            try:
                page.wait_for_function('window.__shotReady === true', timeout=20000)
            except Exception as e:
                print(f'{fname}: SHOT NOT READY: {e}')
            page.wait_for_timeout(400)
            path = os.path.join(ROOT, 'screenshots', fname)
            page.screenshot(path=path, type='jpeg', quality=82)
            print(f'{fname}: {os.path.getsize(path)} bytes, console_errors={errors}, network_reqs={len(reqs)}')
            page.close()
        # live (non-shot) load check
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        errors = []
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://localhost:8123/index.html')
        page.wait_for_timeout(3000)
        print('live load console_errors=', errors)
        page.close()
        browser.close()
finally:
    srv.terminate()
