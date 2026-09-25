import { mkdirSync, writeFileSync } from 'node:fs';

const dir = 'public/templates/reference';
mkdirSync(dir, { recursive: true });
const svg = (w, h, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
const save = (name, content) => writeFileSync(`${dir}/${name}.svg`, content);
const blur = '<filter id="blur" x="-75%" y="-150%" width="250%" height="400%"><feGaussianBlur stdDeviation="34"/></filter><filter id="soft" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="9"/></filter>';
const noise = '<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" seed="9"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".19"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>';
const text = (x, y, words, size = 18, fill = '#eee', weight = 400, extra = '') => `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${words}</text>`;
const rect = (x, y, w, h, fill, r = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const grad = (id, a, b, vertical = false) => `<linearGradient id="${id}" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const radial = (id, color) => `<radialGradient id="${id}"><stop stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

save('purple-atmosphere', svg(1080, 1350,
  rect(0, 0, 1080, 1350, '#090219') +
  '<ellipse cx="250" cy="770" rx="750" ry="850" fill="url(#violet)"/>' +
  '<g filter="url(#blur)"><path d="M130 -160 Q-5 70 259 533 T332 1340" fill="none" stroke="#a800ff" stroke-width="165"/><path d="M270 -80 Q77 90 395 490 T461 1150" fill="none" stroke="#03000e" stroke-width="93"/><path d="M460 -80 Q281 190 475 542 T871 1310" fill="none" stroke="#7300db" stroke-width="77"/><path d="M-99 400 Q100 406 225 773 T687 1130" fill="none" stroke="#ba00ff" stroke-width="109"/></g>' +
  '<ellipse cx="1000" cy="1050" rx="560" ry="570" fill="url(#violet)"/>',
  blur + radial('violet', '#8000ff')));

save('purple-platform', svg(1080, 695,
  '<path d="M881 17 Q980 1 1080 0 L1080 695 H0 V447 L885 390Z" fill="url(#fabric)"/>' +
  '<path d="M881 17 Q980 1 1080 0 L1080 695 H0 V447 L885 390Z" fill="url(#weave)"/>' +
  '<path d="M0 604 Q430 632 1080 619" fill="none" stroke="#0b0624" stroke-width="10"/>' +
  '<path d="M0 596 Q430 624 1080 611" fill="none" stroke="#beb3e4" stroke-width="2"/>' +
  '<ellipse cx="500" cy="479" rx="480" ry="33" fill="#05000f" opacity=".7" filter="url(#soft)"/>',
  blur + grad('fabric', '#bdb5d4', '#2e2551', true) +
  '<pattern id="weave" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="skewX(-24)"><path d="M0 0V6 M3 0V6" stroke="#0a0527" stroke-width="1.5" opacity=".8"/><path d="M0 1H6 M0 4H6" stroke="#e3def5" stroke-width=".65" opacity=".7"/></pattern>'));

save('devziner-mark', svg(100, 85,
  '<path d="M20 4H35L24 37H8Z M43 4H57L45 37H31Z" fill="#9416f4"/><path d="M43 7H58C105 7 97 70 49 70H27L37 44H51L46 57H55C82 53 89 20 61 20H53L44 43H31Z" fill="#f5ecff"/>'));
save('trivx-mark', svg(60, 65,
  '<path d="M24 9L39 26" stroke="#ff5a18" stroke-width="15" stroke-linecap="round"/><path d="M28 27L11 47" stroke="#fff" stroke-width="17" stroke-linecap="round"/><path d="M30 27L45 38" stroke="#fff" stroke-width="16" stroke-linecap="round"/><path d="M8 48L14 42" stroke="#bcb8b7" stroke-width="7" stroke-linecap="round"/>'));
save('orange-dash', svg(63, 17, rect(0, 0, 63, 17, '#ff5b1b', 9)));

let ribs = '';
for (let i = 0; i < 14; i++) {
  const x = i * 15;
  ribs += `<path d="M${x - 100} -80 C${x - 17} 410 ${x + 90} 519 ${x - 20} 1020 S${x + 130} 1200 ${x + 85} 1450" fill="none" stroke="url(#rib)" stroke-width="9"/>`;
}
save('orange-atmosphere', svg(1080, 1350,
  rect(0, 0, 1080, 1350, '#0c0b0a') + '<ellipse cx="65" cy="4" rx="570" ry="370" fill="url(#orange)" opacity=".6"/>' +
  '<ellipse cx="105" cy="1380" rx="730" ry="460" fill="url(#orange)" opacity=".55"/>' +
  `<g opacity=".7">${ribs}</g><g transform="translate(1080 0) scale(-1 1)" opacity=".53">${ribs}</g>` +
  '<path d="M236 412 Q384 182 768 320 L899 366 Q543 233 236 412" fill="#fa4105" filter="url(#blur)" opacity=".7"/>' +
  '<path d="M254 369 Q445 174 835 345" stroke="#7c7771" stroke-width="12" fill="none" filter="url(#soft)" opacity=".25"/>',
  blur + radial('orange', '#a83208') + grad('rib', '#040403', '#663220')));

const glass = (icon) => svg(280, 220,
  '<path d="M12 31L225 8L269 180L57 209Z" fill="url(#glass)" stroke="#d7c3bb" stroke-width="2"/>' +
  '<path d="M18 33L224 13L262 176L61 202Z" fill="none" stroke="#fff" stroke-opacity=".25"/>' +
  `<g transform="translate(75 58) rotate(-9 65 60)" fill="none" stroke="#f1c9b9" stroke-width="5">${icon}</g>`,
  '<linearGradient id="glass" x2="1" y2="1"><stop stop-color="#d4d1d0" stop-opacity=".35"/><stop offset=".45" stop-color="#817671" stop-opacity=".25"/><stop offset="1" stop-color="#f89c76" stop-opacity=".65"/></linearGradient>');
save('glass-security', glass('<path d="M65 9Q45 25 17 28V65Q19 97 65 119Q111 97 113 65V28Q85 25 65 9Z"/><path d="M65 23Q44 36 31 37V64Q33 85 65 104Q97 85 99 64V37Q82 36 65 23Z"/><path d="M45 61L60 79L84 46" stroke-width="9"/>'));
save('glass-growth', glass('<path d="M12 22V115H120"/><path d="M27 82L49 56L73 66L106 24M86 24H106V45"/><path d="M34 91V107M59 77V107M85 65V107M110 54V107" stroke-width="12"/>'));
save('glass-global', glass('<circle cx="66" cy="62" r="52"/><ellipse cx="66" cy="62" rx="24" ry="52"/><path d="M14 62H118M25 31Q66 49 108 31M25 92Q66 75 108 92M66 10V114"/>'));

save('sales-atmosphere', svg(1080, 1350, rect(0, 0, 1080, 1350, '#080707') +
  '<ellipse cx="495" cy="786" rx="870" ry="620" fill="url(#warm)" opacity=".36"/>' +
  '<path d="M-80 335C70 49 407 140 489 -37" fill="none" stroke="#ee420d" stroke-width="17" filter="url(#soft)"/>' +
  '<path d="M-80 335C70 49 407 140 489 -37" fill="none" stroke="#ff6328" stroke-width="3"/>' +
  '<path d="M1119 479Q966 594 544 676" stroke="#fa4508" stroke-width="30" fill="none" filter="url(#blur)"/>' +
  '<path d="M1119 479Q966 594 544 676" stroke="#fe4609" stroke-width="4" fill="none" filter="url(#soft)"/>',
  blur + radial('warm', '#703621')));
save('concrete-platform', svg(1080, 285,
  rect(0, 0, 1080, 285, '#191716') + '<path d="M0 0H824L934 179L412 0Z" fill="#080605"/>' +
  '<path d="M0 0H408L760 285H0Z" fill="url(#stone)" filter="url(#grain)"/>' +
  '<path d="M860 0H1080V285H919Z" fill="url(#stone)" filter="url(#grain)"/>' +
  '<ellipse cx="13" cy="265" rx="350" ry="330" fill="url(#light)" opacity=".45"/>',
  noise + grad('stone', '#302d2b', '#0b0909', true) + radial('light', '#a3806d')));
save('sales-flourish', svg(301, 159,
  '<path d="M290 8H18Q8 8 8 18V112Q8 120 18 120H152" fill="none" stroke="#9a8881" stroke-opacity=".4"/>' +
  '<path d="M77 153L156 138Q172 134 149 150Q155 154 199 142Q226 136 204 151L249 153" fill="none" stroke="#963e13" stroke-width="6" opacity=".55"/>'));
let ghosts = '';
for (let i = 0; i < 2; i++) {
  const x = 15 + i * 310, y = 20 + i * 37;
  ghosts += `<g transform="translate(${x} ${y}) skewY(6)">${rect(0, 0, 284, 548, '#221c1a')}${rect(0, 0, 284, 68, '#968c80')}${text(12, 34, i ? 'Muhammad Ijaz' : 'Skilled Fuzala', 27, '#15201c', 700)}${text(16, 159, i ? 'Stories that matter.' : 'Where ideas belong.', 23, '#9c9a8b', 700)}${text(16, 187, 'Thoughtful work. Lasting impact.', 12, '#aaa')}${rect(17, 225, 250, 179, i ? '#63422e' : '#21422b')}${text(24, 455, '16K+    8 Years', 26, '#aba7a0')}${text(24, 491, 'INTRODUCTION', 28, '#91847c', 700)}</g>`;
}
save('portfolio-ghosts', svg(620, 617, ghosts));

const candles = (count, startX, startY, step, scale = 1) => Array.from({ length: count }, (_, i) => {
  const v = Math.sin(i * 1.1) * 36 + Math.cos(i * .36) * 59 - i * 1.4;
  const y = startY + v * scale, h = (15 + (i * 17 % 39)) * scale;
  const color = i % 3 ? '#ff271d' : '#ee695c';
  return `<path d="M${startX + i * step} ${y - h * .5}V${y + h * 1.6}" stroke="${color}" stroke-width="2"/>${rect(startX + i * step - step * .3, y, step * .6, h, color, 1)}`;
}).join('');
save('trading-atmosphere', svg(1080, 1350,
  rect(0, 0, 1080, 1350, '#030303') + '<ellipse cx="880" cy="946" rx="870" ry="520" fill="url(#red)"/><ellipse cx="480" cy="1270" rx="900" ry="450" fill="url(#red)"/>' +
  `<g opacity=".07">${Array.from({ length: 6 }, (_, i) => text(10 + i % 2 * 130, 200 + i * 166, 'A Smart Trader.   Your Trading Story.   Beyond Limits.', 38, '#948b84', 700)).join('')}${candles(45, 8, 940, 25, 3)}</g>` +
  '<path d="M0 54H1080" stroke="#8e8585" opacity=".2"/>', radial('red', '#e00000')));
save('trading-banner', svg(666, 168,
  rect(1, 1, 664, 166, 'url(#banner)', 27, 'stroke="#482221"') +
  `<g transform="skewX(-20)">${candles(28, 300, 95, 17, 1.6)}</g>` +
  rect(31, 38, 300, 91, 'url(#plate)', 8, 'stroke="#774d47" stroke-opacity=".65"') +
  '<path d="M34 43H327M35 45V121" stroke="#f1b0a5" opacity=".23"/>',
  grad('banner', '#080504', '#bd0000') + grad('plate', '#090606', '#b90000')));
save('bestrade-mark', svg(35, 45, rect(1, 5, 31, 34, '#d10005', 9) +
  '<path d="M9 11V34M16 10V18M16 23V34M22 12Q30 16 22 20M22 24Q31 29 22 34" fill="none" stroke="white" stroke-width="4"/>'));
save('trading-platform', svg(1080, 365,
  '<path d="M0 0L1080 229V365H0Z" fill="url(#black)"/><path d="M0 0L500 67L1080 229L631 162Z" fill="url(#edge)"/><path d="M0 9L630 172L1080 239" fill="none" stroke="#969595" stroke-width="2" opacity=".3"/>',
  grad('black', '#1e1e1f', '#030303', true) + grad('edge', '#d0cfcf', '#050505')));
save('trading-cta', svg(477, 88,
  rect(9, 24, 365, 58, 'url(#button)', 22, 'stroke="#777" stroke-opacity=".32"') +
  '<circle cx="431" cy="47" r="36" fill="#050505" stroke="#545454"/>' +
  '<path d="M419 30L442 46L419 63L424 46Z" fill="none" stroke="#ff171f" stroke-width="4"/><path d="M431 33L445 46L431 59" fill="none" stroke="#ff171f" stroke-width="5" filter="url(#soft)"/>',
  blur + grad('button', '#171717', '#070707')));
save('trading-details', svg(297, 399,
  rect(246, 4, 41, 357, '#080706', 18, 'stroke="#8d665f" stroke-opacity=".35"') +
  Array.from({ length: 7 }, (_, i) => `<g transform="translate(257 ${31 + i * 45})" fill="none" stroke="${i === 4 ? '#ff2d20' : '#99918a'}" stroke-width="1.3"><path d="M0 0H15V6H0ZM4 10H12M7 -5V-2"/></g>`).join('') +
  '<circle cx="65" cy="345" r="53" fill="none" stroke="#ddd" stroke-width=".6" stroke-dasharray="2 4"/>' + text(43, 350, '2026', 14, '#eee', 700) +
  '<path id="ring" d="M65 301 A44 44 0 1 1 64.9 301" fill="none"/>' +
  '<text font-family="Arial" font-size="7" fill="#eee" letter-spacing="1.5"><textPath href="#ring">LUCAS COELHO · DESIGNER · LUCAS COELHO ·</textPath></text>'));

// Screen artwork is separate from the poster and can be replaced by any upload.
const nav = (brand, accent) => rect(0, 0, 1440, 100, '#0c0b0e') + text(56, 62, brand, 29, '#fff', 700) +
  text(756, 60, 'Home     Projects     Services     Blog', 15, '#e8e1de') + rect(1180, 28, 192, 46, accent, 7) + text(1201, 57, 'Get a Quote', 17, '#fff', 600);
let creative = rect(0, 0, 1440, 900, '#15121d') + '<ellipse cx="680" cy="960" rx="1070" ry="530" fill="url(#purple)"/>' + nav('ϟ Devziner', '#9960dd');
creative += text(575, 190, '✦  Award-Winning Digital Agency', 17, '#b1a8bf') +
  text(720, 290, 'We Build Digital Experiences', 43, '#fff', 700, 'text-anchor="middle"') +
  text(720, 345, 'That Drive Growth', 43, '#fff', 700, 'text-anchor="middle"') +
  text(720, 406, 'From stunning UI experiences, we craft beautiful, high-performing websites and', 15, '#b3a6c6', 400, 'text-anchor="middle"') +
  text(720, 430, 'applications that captivate users and deliver tangible business results.', 15, '#b3a6c6', 400, 'text-anchor="middle"') +
  rect(520, 470, 200, 51, '#9361db', 6) + text(549, 502, 'View Our Projects', 17, '#fff', 600) +
  rect(741, 470, 173, 51, '#292132', 6) + text(770, 502, 'Start a Project', 17, '#fff');
for (const [i, n] of ['3,000+', '4.9 ★★★★★', '98%'].entries()) creative += text(440 + i * 245, 625, n, 32, '#e9d6ff', 600, 'text-anchor="middle"') + text(440 + i * 245, 652, ['Projects Completed', 'Client Rating', 'Success Rate'][i], 13, '#a99bb8', 400, 'text-anchor="middle"');
creative += text(720, 782, 'A Full-Service Digital Partner', 33, '#eee4ff', 600, 'text-anchor="middle"') + text(720, 821, 'We provide a complete suite of design and development solutions.', 15, '#b2a0ce', 400, 'text-anchor="middle"');
for (let i = 0; i < 2; i++) creative += `<g transform="translate(${i ? 1205 : 20} 195) rotate(${i ? 12 : -9} 100 180)">${rect(0, 0, 208, 374, i ? '#557983' : '#c42b31', 8)}${text(18, 65, i ? 'MARIO' : 'IRONMAN', 41, '#fff', 800)}<circle cx="104" cy="170" r="73" fill="${i ? '#b7b7ae' : '#562225'}"/><path d="M31 315Q30 206 102 203T185 315Z" fill="${i ? '#70413c' : '#15151b'}"/>${text(24, 349, 'SELECTED WORK / 26', 13, '#eee')}</g>`;
save('creative-screen', svg(1440, 900, creative, radial('purple', '#753bb9')));

let services = rect(0, 0, 720, 1560, '#040404') + text(43, 97, 'TRIVX', 39, '#fff', 600) + rect(585, 43, 88, 83, '#ff571c', 3) + text(616, 97, '×', 34);
const lists = [
  ['Web Design', 'Business Websites', 'E-commerce', 'Landing Pages', 'Web Apps', 'Membership Sites', 'WordPress', 'SEO Ready', 'Maintenance'],
  ['AI Solutions', 'AI Chatbots and', 'Automation', 'Data Analysis', 'Workflow Design', 'Predictive Analytics', 'AI Integration', 'Custom Models', 'Smart Assistants'],
  ['Brand Designing', 'Logo and Visual', 'Identity Design', 'Corporate Branding', 'Product Packaging', 'Social Media Design', 'Brand Guidelines', 'Brand Strategy', 'Print Design'],
  ['Digital Marketing', 'Social Media', 'Campaigns', 'Google Ads', 'SEO', 'Analytics', 'Content Creation', 'Lead Generation', 'Growth Strategy'],
];
lists.forEach(([title, ...items], i) => {
  const x = 35 + i % 2 * 329, y = 220 + Math.floor(i / 2) * 492;
  services += rect(x, y, 311, 469, '#0b0b0b', 14) + text(x + 25, y + 53, title, 27, '#fff', 600);
  items.forEach((label, j) => { services += text(x + 25, y + 105 + j * 39, label, 21, '#838383'); });
});
services += '<path d="M36 1231H675V1263H36" stroke="#ff571c" stroke-width="5" fill="none"/>' + text(42, 1340, 'LET’S BUILD SOMETHING GREAT.', 18, '#999') + '<circle cx="620" cy="1450" r="36" fill="#ff571c"/>' + text(610, 1460, '↑', 30);
save('services-screen', svg(720, 1560, services));

let sales = rect(0, 0, 1440, 900, '#100d0b') + nav('TRIVX', '#ff631e') + rect(0, 100, 1440, 39, '#ff681e') + text(250, 126, 'Services We Offer     Our Process     Success Stories     Frequently Asked Questions     Daily News &amp; Insights', 15, '#fff');
sales += text(119, 193, 'How We Build, and Keep Building, Real Success.', 28, '#fff', 600) + text(120, 231, 'Trivx Solutions started with a simple idea: deliver work that actually helps businesses grow.', 16, '#a69b95') + text(120, 258, 'Every project adds to our story, and we keep raising the bar with each one.', 16, '#a69b95');
['900+', '11+', '200+'].forEach((n, i) => { sales += rect(245 + i * 326, 307, 297, 178, '#2a2420', 13) + text(393 + i * 326, 391, n, 55, '#ff874b', 500, 'text-anchor="middle"') + text(393 + i * 326, 435, ['Projects Completed', 'Professionals', 'Happy Clients'][i], 18, '#b0a6a0', 400, 'text-anchor="middle"'); });
sales += rect(244, 556, 463, 282, 'url(#office)', 4) + '<path d="M244 556L460 677L707 556M300 556L480 655L656 556M244 583L433 680M707 580L503 680" stroke="#ff9a4b" stroke-width="8"/>';
for (let i = 0; i < 7; i++) sales += `<circle cx="${280 + i * 60}" cy="${700 + i % 2 * 28}" r="14" fill="#b2957e"/><path d="M${259 + i * 60} 800V${725 + i % 2 * 28}Q${280 + i * 60} ${709 + i % 2 * 28} ${300 + i * 60} ${725 + i % 2 * 28}V810" fill="${i % 2 ? '#292629' : '#c6c3b7'}"/>`;
sales += text(766, 587, 'We Have The Team That Gets It', 29, '#fff', 600) + text(766, 624, 'Done Within Timeline.', 29, '#fff', 600);
['We know deadlines aren’t just dates on a calendar.', 'Our team works with a clear plan, proven processes,', 'and constant communication so there are no surprises.', 'We break down each task, track progress closely,', 'and handle challenges before they become problems.'].forEach((s, i) => { sales += text(766, 678 + i * 29, s, 15, '#b0a7a2'); });
sales += '<circle cx="1370" cy="824" r="25" fill="#ff671d"/>' + text(1363, 833, '↑', 24);
save('sales-screen', svg(1440, 900, sales, grad('office', '#e78432', '#282d31', true)));

let trading = rect(0, 0, 1440, 900, '#100405') + '<ellipse cx="1100" cy="150" rx="860" ry="700" fill="url(#red)"/>' + nav('▥ BESTRADE', '#b9050b') + text(310, 173, 'HOME      SIMULATOR      SERVICE      SERVICE      FAQ', 17, '#fff');
trading += rect(278, 242, 877, 560, '#060b0b', 0, 'stroke="#79857f"');
for (let i = 0; i < 14; i++) trading += `<path d="M280 ${272 + i * 37}H1153" stroke="#28433c" stroke-width="1"/>`;
for (let i = 0; i < 22; i++) trading += `<path d="M${291 + i * 40} 244V800" stroke="#213730" stroke-width="1"/>`;
let points = '', average = '';
for (let i = 0; i < 105; i++) {
  const x = 295 + i * 6.25, y = 496 + Math.sin(i * .09) * 98 + Math.cos(i * .21) * 49 + Math.sin(i * 2) * 18;
  const color = i % 3 ? '#48c789' : '#eb514c';
  trading += `<path d="M${x} ${y - 11}V${y + 20}" stroke="${color}"/>${rect(x - 2, y, 4, 11, color)}`;
  points += `${x},${y + 20} `;
  average += `${x},${513 + Math.sin(i * .09) * 100} `;
  trading += rect(x - 2, 750 - i % 9 * 7, 4, 16 + i % 9 * 7, color);
}
trading += `<polyline points="${points}" fill="none" stroke="#ba9e30" stroke-width="1.4"/><polyline points="${average}" fill="none" stroke="#36a0af" stroke-width="2"/>`;
for (let i = 0; i < 15; i++) trading += text(986, 276 + i * 26, `${(1.0873 + i * .0001).toFixed(4)}  ${(1.0862 + i * .0002).toFixed(4)}`, 11, i % 3 ? '#51db73' : '#f04545');
trading += text(291, 677, 'Spread: 1.9 pips', 14, '#d0d855') + text(310, 845, 'PRECISION. PERFORMANCE. POSSIBILITY.', 16, '#aeaaaa', 500);
save('trading-screen', svg(1440, 900, trading, radial('red', '#c60009')));
console.log('Generated 25 reference poster SVG assets.');
