
let curFM = {};

const fs    = require('fs'),
      glob  = require('glob'),

      head  = fs.readFileSync('./src/html/head.frag.html'),
      mid   = fs.readFileSync('./src/html/mid.frag.html'),
      foot  = fs.readFileSync('./src/html/foot.frag.html'),

      mIt   = require('markdown-it'),
      mFA   = require('markdown-it-fontawesome'),
      mIn   = require('markdown-it-include'),
      mU    = require('markdown-it-underline'),
      mAt   = require('markdown-it-attrs'),
      mFM   = require('markdown-it-front-matter'),

      md    = mIt({ html: true /*, highlight: (code, lang) => code */ })
               .use(mIn, './src/md/gamma/')
               .use(mU)
               .use(mAt)
               .use(mFM, fm => {
                  curFM = {};
                  fm.trim().split('\n').map(line => {
                    const [l,r]     = line.split(':', 2);
                    curFM[l.trim()] = r.trim();
                  })
               })
//             .use(mFM, fm => curFM = fm)
               .use(mFA);

// const files = glob.sync('./src/md/**/*.md');
// console.log(JSON.stringify(files));

glob.sync('./src/md/**/*.md').map(f => {

  const uHtml  = md.render( `${fs.readFileSync(f)}` ),
        uTitle = curFM.title,
        uSlug  = curFM.slug;

  fs.writeFileSync(`./docs/${uSlug}`, `${head}${uTitle}${mid}${uHtml}${foot}`, 'utf-8');

});
