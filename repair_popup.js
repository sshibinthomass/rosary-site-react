const fs = require('fs');

const filePath = 'd:\\Projects\\Website\\rosary-site-react\\src\\pages\\OrderPage.jsx';
let content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('{showThanksPopup && ('));

if (startIndex === -1) {
    console.log('Target line not found');
    process.exit(1);
}

console.log('Found showThanksPopup at line:', startIndex + 1);

let endIndex = -1;
// Count opened and closed brackets: { and } inside showThanksPopup block to find its end index
let bracketCount = 0;
for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].includes('{')) bracketCount++;
    if (lines[i].includes('}')) bracketCount--;
    if (lines[i].includes(')}') && lines[i].trim() === ')}') {
        endIndex = i;
        break;
    }
}

if (endIndex === -1) {
    console.log('Close tag not found');
    process.exit(1);
}

console.log('Found end showThanksPopup at line:', endIndex + 1);

const newBlock = `      {showThanksPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white dark:bg-[var(--bg-primary)] w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden relative animate-slide-up border-[3px] border-[var(--color-forest)] p-1"
            role="dialog"
          >
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/40 dark:to-emerald-800/40 rounded-[20px] p-6 text-center relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-green-300/40 dark:bg-green-600/30 rounded-full blur-xl pointer-events-none"></div>
                <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-emerald-300/40 dark:bg-emerald-600/30 rounded-full blur-xl pointer-events-none"></div>

                <button
                  onClick={handleCloseThanksPopup}
                  className="absolute top-3 right-3 p-1.5 text-green-700 bg-green-200/50 hover:bg-green-300/50 rounded-full transition-colors z-10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="text-5xl mb-3 animate-bounce-slow">🎉</div>
                <h2 className="text-2xl font-black text-green-800 dark:text-green-300 mb-2 font-serif">
                  Thank You! 🌿
                </h2>
                <p className="text-green-700 dark:text-green-300/90 text-sm mb-5 font-medium">
                  We're so glad you chose Rosary Plant House!
                </p>
                <div className="bg-white/60 dark:bg-black/20 rounded-xl p-4 border border-green-200 dark:border-green-800/50 mb-2 shadow-inner">
                  <div className="text-3xl mb-2">🎁</div>
                  <p className="text-xs text-green-800 dark:text-green-200 font-bold mb-1 tracking-wider uppercase">Claim Free Plant</p>
                  <p className="text-[12px] text-green-700 dark:text-green-300/90 leading-relaxed font-medium">
                      Post an Insta story with your beautiful plants bought from rosary plant house and tag <strong>@rosary_plant_house</strong> to get a <strong className="text-green-800 dark:text-green-200">Complimentary Plant</strong> on your next order! 📸
                  </p>
                </div>
                <button 
                  onClick={handleCloseThanksPopup}
                  className="mt-4 w-full bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-900/20 hover:scale-[1.02] transition-transform"
                >
                  Awesome, got it! 💚
                </button>
            </div>
          </div>
        </div>
      )}`;

lines.splice(startIndex, (endIndex - startIndex + 1), newBlock);

fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
console.log('Repair Complete');
