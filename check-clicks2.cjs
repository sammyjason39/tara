const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8081/auth/login');
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@zenvix.com');
  await page.type('input[type="password"]', 'admin123');
  
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  
  const blockData = await page.evaluate(() => {
    let badNodes = [];
    let node = document.querySelector('h1') || document.body;
    
    // Let's traverse all nodes and find if any have pointerEvents none
    const all = document.querySelectorAll('*');
    for (let el of all) {
       const style = window.getComputedStyle(el);
       if (style.pointerEvents === 'none') {
           // Ignore decorative things like SVGs or explicit utility classes if they are small
           if (el.tagName !== 'SVG' && el.tagName !== 'PATH') {
               badNodes.push({
                   tag: el.tagName,
                   id: el.id,
                   className: el.className.toString(),
                   width: el.getBoundingClientRect().width,
                   height: el.getBoundingClientRect().height
               });
           }
       }
    }
    
    return {
        url: window.location.href,
        contentPreview: document.body.innerText.substring(0, 100).replace(/\n/g, ' '),
        badNodes: badNodes.filter(n => n.width > 200 && n.height > 200) // only care about large blocking containers
    };
  });
  
  console.log(JSON.stringify(blockData, null, 2));
  
  await browser.close();
})();
