"""Functional prototype checks; requires Playwright and a local server at :5173."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1360, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    response = page.goto('http://127.0.0.1:5173/')
    assert response.status == 200
    assert page.title() == 'Formody · 拨形见声'
    assert '512' in page.locator('#orbit-status').inner_text()
    page.locator('#start').click()
    page.wait_for_timeout(650)
    assert page.locator('#audio-state').inner_text() == '正在演奏'
    assert page.locator('#phrase .active').count() == 1
    original = page.locator('#coordinates').inner_text()
    page.locator('#canvas').press('ArrowRight')
    assert page.locator('#coordinates').inner_text() != original
    box = page.locator('#canvas').bounding_box()
    scale = min(box['width'], box['height']) * .135
    def world_click(x, y):
        page.mouse.click(box['x'] + box['width']/2 + x*scale, box['y'] + box['height']/2 - y*scale)
    world_click(-2.3, .1)
    assert '数值回归 10' in page.locator('#orbit-status').inner_text()
    world_click(0, 0)
    assert '五边形外' in page.locator('#orbit-status').inner_text()
    assert page.locator('#phrase').evaluate('(el) => [...el.children].every(x => x.style.getPropertyValue("--height") === "3px")')
    page.locator('#reset').click()
    assert page.locator('#coordinates').inner_text() == original
    page.locator('#play').click()
    assert page.locator('#audio-state').inner_text() == '声音已暂停'
    assert page.locator('#phrase .active').count() == 0
    page.locator('#play').click()
    page.wait_for_timeout(350)
    assert page.locator('#audio-state').inner_text() == '正在演奏'
    page.locator('#about').click()
    assert page.locator('#about-dialog').is_visible()
    page.keyboard.press('Escape')
    assert not page.locator('#about-dialog').is_visible()
    page.screenshot(path='/workspace/formody-playing.png')
    # Render the production voice offline, then measure signal and clipping.
    signal = page.evaluate('''async () => {
      const { createVoice } = await import('./src/music/audio.js');
      const { config } = await import('./src/config.js');
      const { traceOrbit, regularPolygon } = await import('./src/math/outer-billiards.js');
      const { makePhrase } = await import('./src/music/mapping.js');
      const phrase = makePhrase(traceOrbit(config.initialSeed, regularPolygon()), config.music);
      const context = new OfflineAudioContext(1, 48000 * 6, 48000);
      const dt = 60 / config.music.bpm / config.music.stepsPerBeat;
      phrase.forEach((note,i) => note && createVoice(context, context.destination, note, .05+i*dt, config.music.voice));
      const rendered = await context.startRendering();
      const data = rendered.getChannelData(0);
      let power=0,peak=0; for (const s of data) { power+=s*s;peak=Math.max(peak,Math.abs(s)); }
      return { rms: Math.sqrt(power/data.length), peak, pitches: [...new Set(phrase.filter(Boolean).map(n=>n.midi))] };
    }''')
    assert signal['rms'] > .005
    assert signal['peak'] < 1
    assert len(signal['pitches']) == 5
    # A background tab must pause instead of delivering overdue musical events.
    page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true,get:()=>true}); document.dispatchEvent(new Event('visibilitychange'))")
    assert page.locator('#audio-state').inner_text() == '声音已暂停'
    native_webmcp = page.evaluate('!!document.modelContext?.registerTool')
    # Validate the optional tool's state updates and input checks with an API stub.
    tool_page = browser.new_page()
    tool_page.add_init_script("window.registered=[]; Object.defineProperty(document,'modelContext',{value:{registerTool:(tool,options)=>{window.registered.push(tool)}}})")
    tool_page.goto('http://127.0.0.1:5173/')
    result = tool_page.evaluate("registered[0].execute({x:-2.3,y:.1})")
    assert result['seed'] == {'x': -2.3, 'y': .1}
    assert result['status'] == 'return-detected'
    assert '-2.300' in tool_page.locator('#coordinates').inner_text()
    assert tool_page.evaluate("(()=>{try{registered[0].execute({x:'bad',y:1});return false}catch{return true}})()")
    assert '-2.300' in tool_page.locator('#coordinates').inner_text()
    assert not errors, errors
    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    phone = mobile.new_page()
    phone.goto('http://127.0.0.1:5173/')
    phone.locator('#start').tap()
    phone.wait_for_timeout(350)
    assert phone.locator('#audio-state').inner_text() == '正在演奏'
    assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth')
    phone.locator('#canvas').tap(position={'x': 40, 'y': 220})
    assert phone.locator('#coordinates').inner_text() != original
    # Touch drag through the same pointer event path as mouse drag.
    session = mobile.new_cdp_session(phone)
    session.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':60,'y':320}]})
    session.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':115,'y':270}]})
    session.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
    assert not phone.locator('#canvas').evaluate("el => el.classList.contains('dragging')")
    phone.screenshot(path='/workspace/formody-mobile.png')
    result = {'desktop_and_touch': 'passed', 'audio_signal':signal, 'native_webmcp_available':native_webmcp, 'webmcp_stub_contract':'passed', 'errors': errors}
    Path('/workspace/formody/docs/browser-results.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result))
    browser.close()
