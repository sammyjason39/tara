const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8081/core/dashboard', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const blockData = await page.evaluate(() => {
    let badNodes = [];
    const all = document.querySelectorAll('*');
    for (let el of all) {
       const style = window.getComputedStyle(el);
       if (style.pointerEvents === 'none' && el.tagName !== 'SVG' && el.tagName !== 'PATH') {
           badNodes.push({
               tag: el.tagName,
               className: el.className.toString(),
               width: el.getBoundingClientRect().width,
               height: el.getBoundingClientRect().height
           });
       }
    }
    
    return {
        url: window.location.href,
        contentPreview: document.body.innerText.substring(0, 100).replace(/\n/g, ' '),
        badNodes: badNodes.filter(n => n.width > 200 && n.height > 200)
    };
  });
  
  console.log(JSON.stringify(blockData, null, 2));
  await browser.close();
})();
