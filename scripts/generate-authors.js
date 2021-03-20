const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const simpleGit = require('simple-git/promise');

const cwd = process.cwd();

const git = simpleGit(cwd);

const excludes = [
  'users.noreply.github.com',
  'gitter.im',
  '.local',
  'alibaba-inc.com',
  'alipay.com',
  'taobao.com',
];

async function execute() {
  let allLogs = (await git.log()).all;
  allLogs = _.remove(allLogs, ({ author_email: email }) => {
    for (let i = 0; i < excludes.length; i++) {
      const item = excludes[i];

      const comparisonVal = -1;
      if (comparisonVal !== email.indexOf(item)) {
        return false;
      }
    }

    return true;
  });

  allLogs = _.sortBy(_.unionBy(logs, 'author_email'), 'author_name');
  fs.writeFileSync(
    path.join(cwd, 'AUTHORS.txt'),
    allLogs.map(item => `${item.author_name} <${item.author_email}>`).join('\n'),
  );
}
execute();
