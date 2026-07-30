const path = require('path');
const { recognize } = require('tesseract.js');

(async () => {
  const imgPath = path.resolve(__dirname, 'data', '.menu-cache', '599%20NEW%20MENU%20Final%20KA_pages-to-jpg-0003_4.png');
  console.log('image:', imgPath);
  const { data } = await recognize(imgPath, 'eng');
  console.log('wordCount:', (data.words || []).length);
  console.log('lineCount:', (data.lines || []).length);
  console.log('text:', data.text.slice(0, 2000));
  console.log('words:', (data.words || []).slice(0, 40).map((w, i) => `${i + 1}. ${w.text} | conf=${w.confidence} | bbox=${JSON.stringify(w.bbox)}`).join('\n'));
})();
