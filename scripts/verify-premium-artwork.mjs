import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
const names=['crimson-editorial','neon-portfolio','midnight-sales','floating-commerce','amber-agency','lime-campaign'];
const out='docs/premium-scene-qa';
mkdirSync(out,{recursive:true});
for(const file of readdirSync('public/templates/studio').filter(x=>x.endsWith('.svg'))) {
 await sharp(`public/templates/studio/${file}`).resize({width:100}).png().toBuffer();
}
const cards=await Promise.all(names.map(async(name,i)=>({input:await sharp(`public/templates/studio/${name}.svg`).resize({width:360,height:470,fit:'contain',background:'#171717'}).png().toBuffer(),left:(i%3)*380+10,top:Math.floor(i/3)*490+10})));
await sharp({create:{width:1140,height:980,channels:4,background:'#171717'}}).composite(cards).png().toFile(`${out}/screen-artwork.png`);
console.log('All studio SVGs decoded. Artwork contact sheet written.');
