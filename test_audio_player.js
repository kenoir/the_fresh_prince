const puppeteer = require('puppeteer');
const fs = require('fs');

async function runTest() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#root', { visible: true });

    const audioPlayerExists = await page.evaluate(() => {
      const rootElement = document.getElementById('root');
      return rootElement ? !!rootElement.querySelector('.audio-player') : false;
    });

    if (audioPlayerExists) {
      console.log("PASS");
    } else {
      console.log("FAIL");
      await page.screenshot({ path: 'failure_screenshot.png' });
      const html = await page.content();
      fs.writeFileSync('failure_dom.html', html);
    }
  } catch (error) {
    console.log("FAIL");
    console.error(error);
    // It's possible page isn't defined here if launch or newPage failed.
    // If it is, and we want a screenshot on error too, we'd need more robust error handling.
    // For now, only handling the explicit "FAIL" case above.
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runTest();
