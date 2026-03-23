const fs = require('fs');
const filePath = 'd:\\Projects\\Website\\rosary-site-react\\src\\pages\\OrderPage.jsx';

let content = fs.readFileSync(filePath, 'utf-8');
const lines1 = content.split('\n');

const blockStart = lines1.findIndex(l => l.includes('/* Social Links inside Popup */'));
if (blockStart === -1) {
    console.log('Social Links block not found');
    process.exit(0); // already removed or missing
}

let blockEnd = -1;
for (let i = blockStart; i < lines1.length; i++) {
    if (lines1[i].trim() === '</div>') {
        blockEnd = i;
        break;
    }
}

if (blockEnd === -1) {
    console.log('Social links close div not found');
    process.exit(1);
}

// Delete from blockStart-1 space down to blockEnd
lines1.splice(blockStart - 1, (blockEnd - blockStart + 2));

const targetLine = 'onClick={handleCloseThanksPopup}';
// Find CTA button that isn't absolute top-right (i.e. has className with mt-4)
const ctaIndex = lines1.findIndex((l, i) => l.includes(targetLine) && lines1[i+1] && lines1[i+1].includes('className="mt-4 w-full bg-gradient'));

if (ctaIndex === -1) {
    console.log('CTA button not found');
    fs.writeFileSync(filePath, lines1.join('\n'), 'utf-8');
    process.exit(1);
}

const socialLinks = `                {/* Social Links inside Popup */}
                <div className="flex flex-wrap justify-center gap-3 mt-5 mb-2">
                  <a href="https://instagram.com/rosary_plant_house" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center p-2.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:scale-110 shadow-md transition-transform">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                  <a href="https://facebook.com/rosaryplanthouse" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center p-2.5 bg-[#1877F2] text-white rounded-full hover:scale-110 shadow-md transition-transform">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <a href="https://wa.me/917904050237" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center p-2.5 bg-[#25D366] text-white rounded-full hover:scale-110 shadow-md transition-transform">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.996 0A12 12 0 000 12c0 2.115.553 4.103 1.528 5.819L.085 23.44l5.776-1.503A11.928 11.928 0 0011.996 24C18.625 24 24 18.625 24 12 24 5.375 18.625 0 11.996 0zm0 22a9.94 9.94 0 01-5.1-1.405l-.364-.216-3.8.989 1.01-3.666-.237-.37A9.957 9.957 0 012 12c0-5.514 4.486-10 10-10 5.513 0 9.996 4.486 9.996 10 0 5.514-4.483 10-9.996 10zm5.492-7.48c-.301-.15-1.782-.876-2.062-.976-.28-.1-.482-.15-.685.15-.203.3-.781.976-.957 1.176-.176.2-.353.226-.653.076-1.353-.679-2.4-1.99-2.883-2.827-.176-.3-.018-.466.132-.616.135-.135.301-.351.452-.527.15-.176.2-.301.3-.502.1-.201.05-.376-.025-.526-.075-.15-.685-1.652-.938-2.261-.247-.594-.497-.514-.685-.524-.176-.008-.378-.01-.58-.01a1.115 1.115 0 00-.803.376c-.276.3-1.053 1.026-1.053 2.503 0 1.477 1.078 2.903 1.228 3.103.15.2 2.112 3.221 5.115 4.516.716.309 1.275.494 1.71.632.72.23 1.373.197 1.888.119.578-.088 1.782-.728 2.033-1.43.25-.702.25-1.303.175-1.43-.075-.126-.276-.201-.577-.35z"/></svg>
                  </a>
                  <a href="https://rosaryplanthouse.com" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center p-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 rounded-full hover:scale-110 shadow-md transition-transform">
                    <span className="text-sm leading-none">🌐</span>
                  </a>
                </div>`;

lines1.splice(ctaIndex - 1, 0, socialLinks);

fs.writeFileSync(filePath, lines1.join('\n'), 'utf-8');
console.log('Social Links moved to bottom correctly');
