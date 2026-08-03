const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const reportDirectory = path.resolve(__dirname, '..', 'reports', 'html');
const port = Number.parseInt(process.env.REPORT_PORT || '9323', 10);
const reportUrl = `http://127.0.0.1:${port}`;
const openBrowser = process.argv.includes('--open');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.eot': 'application/vnd.ms-fontobject',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.otf': 'font/otf',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

if (!Number.isSafeInteger(port) || port < 1024 || port > 65_535) {
  throw new Error('REPORT_PORT must be an available TCP port between 1024 and 65535.');
}

if (!fs.existsSync(path.join(reportDirectory, 'index.html'))) {
  throw new Error('HTML report is missing. Run `npm run report` before starting the report web view.');
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const requestedPath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^[/\\]+/, '');
  const filePath = path.resolve(reportDirectory, requestedPath);
  const relativePath = path.relative(reportDirectory, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'content-type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.once('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.log(`A local server is already using ${reportUrl}`);
    console.log('Open that URL if it is the report, or choose another port with REPORT_PORT.');
    if (openBrowser) {
      console.log(`Opening ${reportUrl} in the default browser...`);
      openReportInBrowser();
    }
    process.exitCode = 0;
    return;
  }

  console.error(`Unable to start the report web view: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Cucumber report web view: ${reportUrl}`);
  if (openBrowser) {
    console.log(`Opening ${reportUrl} in the default browser...`);
    openReportInBrowser();
  }
  console.log('Press Ctrl+C to stop the local report server.');
});

function openReportInBrowser() {
  const command = process.platform === 'win32'
    ? { file: 'cmd.exe', args: ['/c', 'start', '', reportUrl] }
    : process.platform === 'darwin'
      ? { file: 'open', args: [reportUrl] }
      : { file: 'xdg-open', args: [reportUrl] };

  const browser = spawn(command.file, command.args, { detached: true, stdio: 'ignore' });
  browser.once('error', error => console.warn(`Unable to open the browser automatically: ${error.message}`));
  browser.unref();
}
