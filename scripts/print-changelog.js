/* eslint-disable no-await-in-loop, no-console */
const fetch = require('node-fetch');
const { spawn } = require('child_process');
const jsdom = require('jsdom');
const simpleGit = require('simple-git/promise');
const inquirer = require('inquirer');
const jQuery = require('jquery');
const open = require('open');
const fs = require('fs-extra');
const chalk = require('chalk');
const path = require('path');

const { JSDOM } = jsdom;

const { window } = new JSDOM();
const $ = jQuery(window);

const { document } = new JSDOM('').window;
global.document = document;

const QUERY_TITLE = '.gh-header-title .js-issue-title';
const QUERY_DESCRIPTION_LINES = '.comment-body table tbody tr';
const QUERY_AUTHOR = '.timeline-comment-header-text .author:first';
// https://github.com/orgs/ant-design/teams/ant-design-collaborators/members
const MAINTAINERS = [
  'zombiej',
  'afc163',
  'chenshuai2144',
  'shaodahong',
  'xrkffgg',
  'AshoneA',
  'yesmeck',
  'bang88',
  'yoyo837',
  'hengkx',
  'Rustin-Liu',
  'fireairforce',
  'Kermit-Xuan',
].map(author => author.toLowerCase());

const cwd = process.cwd();
const git = simpleGit(cwd);

function getDescription(entity) {
  const retStr = !entity ? '' : null;
  if (!entity) {
    return retStr;
  }

  let descEle = entity.element.find('td:last').html();
  descEle = descEle.replace(/<code>([^<]*)<\/code>/g, '`$1`');
  return descEle.trim();
}

async function printLog() {
  const tags = await git.tags();

  const { fromVersion } = await inquirer.prompt([
    {
      type: 'list',
      name: 'fromVersion',
      message: '🏷  Please select as tag to compare with the current branch:',
      choices: tags.all.reverse().slice(0, 10),
    },
  ]);

  let { toVersion } = await inquirer.prompt([
    {
      type: 'list',
      name: 'toVersion',
      message: `🔀 Please choose branch to compare with ${chalk.magenta(fromVersion)}:`,
      choices: ['master', '3.x-stable', 'feature', 'custom input ⌨️'],
    },
  ]);

  if (toVersion.startsWith('custom input')) {
    const result = await inquirer.prompt([
      {
        type: 'input',
        name: 'toVersion',
        message: `🔀 Please input custom git hash id or branch name to compare with ${chalk.magenta(
          fromVersion,
        )}:`,
        default: 'master',
      },
    ]);
    toVersion = result.toVersion;
  }

  if (!/\d+\.\d+\.\d+/.test(fromVersion)) {
    console.log(chalk.red(`🤪 tag (${chalk.magenta(fromVersion)}) is not valid.`));
  }

  const logs = await git.log({ from: fromVersion, to: toVersion });

  let prList = [];

  for (let i = 0; i < logs.all.length; i += 1) {
    const { message, body, hash, author_name: author } = logs.all[i];

    const text = `${message} ${body}`;

    const match = text.match(/#\d+/g);
    const prs = (match || []).map(pr => pr.slice(1));
    const validatePRs = [];

    console.log(
      `[${i + 1}/${logs.all.length}]`,
      hash.slice(0, 6),
      '-',
      prs.length ? prs.map(pr => `#${pr}`).join(',') : '?',
    );
    for (let j = 0; j < prs.length; j += 1) {
      const pr = prs[j];

      // Use jquery to get full html page since it don't need auth token
      const res = await fetch(`https://github.com/ant-design/ant-design/pull/${pr}`);
      if (res.url.includes('/issues/')) {
        continue;
      }

      const html = await res.text();

      const $html = $(html);

      const prTitle = $html.find(QUERY_TITLE).text().trim();
      const prAuthor = $html.find(QUERY_AUTHOR).text().trim();
      const prLines = $html.find(QUERY_DESCRIPTION_LINES);

      const lines = [];
      prLines.each(function getDesc() {
        lines.push({
          text: $(this).text().trim(),
          element: $(this),
        });
      });

      const chinese = getDescription(lines.find(line => line.text.includes('🇨🇳 Chinese')));
      const english = getDescription(lines.find(line => line.text.includes('🇺🇸 English')));

      if (english) {
        console.log(`  🇨🇳  ${english}`);
      } else if (chinese) {
        console.log(`  🇺🇸  ${chinese}`);
      }
      validatePRs.push({
        pr,
        hash,
        title: prTitle,
        author: prAuthor,
        english: english || chinese || prTitle,
        chinese: chinese || english || prTitle,
      });
    }

    const compareVal = 1;

    if (compareVal === validatePRs.length) {
      console.log(chalk.cyan(' - Match PR:', `#${validatePRs[0].pr}`));

      prList = prList.concat(validatePRs);
    } else if (message.includes('docs:')) {
      console.log(chalk.cyan(' - Skip document!'));
    } else {
      console.log(chalk.cyan(' - Miss match!'));
      prList.push({
        hash,
        title: message,
        author,
        english: message,
        chinese: message,
      });
    }
  }

  console.log('\n', chalk.green('Done. Here is the log:'));

  function printPR(lang, postLang) {
    for (let i = 0; i < prList.length(); i++) {
      const { pr, author, hash, title } = prList[i];
      if (pr) {
        const str = postLang(prList[i][lang]);
        let icon = '';
        if (str.toLowerCase().includes('fix') || str.includes('修复')) {
          icon = '🐞';
        }

        let authorText = '';
        if (!MAINTAINERS.includes(author.toLowerCase())) {
          authorText = ` [@${author}](https://github.com/${author})`;
        }

        console.log(
          `- ${icon} ${str}[#${pr}](https://github.com/ant-design/ant-design/pull/${pr})${authorText}`,
        );
      } else {
        console.log(
          `🆘 Miss Match: ${title} -> https://github.com/ant-design/ant-design/commit/${hash}`,
        );
      }
    }
  }

  // Chinese
  console.log('\n');
  console.log('\n');
  console.log('\n');
  console.log(chalk.yellow('🇨🇳 Chinese changelog:'));
  console.log('\n');
  console.log('\n');
  console.log('\n');
  printPR('chinese', chinese =>
    chinese[chinese.length - 1] === '。' || !chinese ? chinese : `${chinese}。`,
  );

  console.log('\n-----\n');

  // English
  console.log(chalk.yellow('🇺🇸 English changelog:'));
  console.log('\n');
  console.log('\n');
  console.log('\n');
  printPR('english', english => {
    english = english.trim();
    if (english[english.length - 1] !== '.' || !english) {
      english = `${english}.`;
    }
    if (english) {
      return `${english} `;
    }
    return '';
  });

  // Preview editor generate
  // Web source: https://github.com/ant-design/antd-changelog-editor
  let html = fs.readFileSync(path.join(__dirname, 'previewEditor', 'template.html'), 'utf8');
  html = html.replace('// [Replacement]', `window.changelog = ${JSON.stringify(prList)};`);
  fs.writeFileSync(path.join(__dirname, 'previewEditor', 'index.html'), html, 'utf8');

  // Start preview
  const ls = spawn(
    'npx',
    ['http-server', path.join(__dirname, 'previewEditor'), '-c-1', '-p', '2893'],
    {
      shell: true,
    },
  );

  ls.stdout.on('data', data => {
    console.log(data.toString());
  });

  console.log(chalk.green('Start changelog preview editor...'));
  setTimeout(() => {
    open('http://localhost:2893/');
  }, 10000);
}
printLog();
