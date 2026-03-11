const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8081/auth/login');
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@zenvix.com');
  await page.type('input[type="password"]', 'admin123'); // Default mock password
  
  await page.click('button[type="submit"]');
  
  // Wait for Dashboard to settle
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  
  // Wait a moment for any potential transitions to resolve
  await new Promise(r => setTimeout(r, 1000));
  
  const blockData = await page.evaluate(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    const points = [
      {x: w/2, y: h/2},
      {x: 100, y: 100},
      {x: w - 100, y: 100}
    ];
    
    // Find absolute/fixed elements that might cover the screen
    const overlays = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const style = window.getComputedStyle(el);
        return (style.position === 'absolute' || style.position === 'fixed') 
          && style.pointerEvents !== 'none'
          && el.getBoundingClientRect().width > w * 0.5; // at least 50% width
      })
      .map(el => ({
        tagName: el.tagName,
        className: el.className.toString(),
        pointerEvents: window.getComputedStyle(el).pointerEvents,
        zIndex: window.getComputedStyle(el).zIndex
      }));

    const elements = points.map(p => {
      const el = document.elementFromPoint(p.x, p.y);
      return {
        x: p.x, y: p.y,
        tagName: el ? el.tagName : null,
        className: el ? el.className.toString() : null,
        pointerEvents: el ? window.getComputedStyle(el).pointerEvents : null,
        zIndex: el ? window.getComputedStyle(el).zIndex : null
      };
    });
    
    return {
      elementsUnderCursor: elements,
      largeOverlays: overlays,
      bodyStyles: {
        pointerEvents: window.getComputedStyle(document.body).pointerEvents,
        styleAttr: document.body.getAttribute('style')
      },
      htmlStyles: {
        pointerEvents: window.getComputedStyle(document.documentElement).pointerEvents,
        styleAttr: document.documentElement.getAttribute('style')
      }
    };
  });
  
  console.log(JSON.stringify(blockData, null, 2));
  
  await browser.close();
})();
