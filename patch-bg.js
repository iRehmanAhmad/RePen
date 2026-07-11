const fs = require('fs');

function patchCSS() {
  let css = fs.readFileSync('src/renderer/toolbar.css', 'utf8');
  css = css.replace(/\r\n/g, '\n');
  
  const target = `.mark-mini {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);`;
  
  const replacement = `.mark-mini {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(47, 145, 237, 0.12);
  border: 1px solid rgba(47, 145, 237, 0.25);`;
  
  css = css.split(target).join(replacement);

  fs.writeFileSync('src/renderer/toolbar.css', css, 'utf8');
}

patchCSS();
console.log("Patched successfully.");
