'use strict';

const { execFile } = require('child_process');

const DEFAULT_INTERVAL = 60;
const MIN_INTERVAL = 5;

function createWatcher(options) {
  options = options || {};

  const cwd = options.cwd || process.cwd();
  const interval = options.interval === undefined
    ? DEFAULT_INTERVAL * 1000
    : Number(options.interval);
  const logger = options.logger || console;

  if (!Number.isFinite(interval) || interval < MIN_INTERVAL * 1000) {
    throw new Error('O intervalo deve ser de pelo menos 5000 milissegundos.');
  }

  let timer = null;
  let checking = false;
  let stopped = false;

  function log(message) {
    logger.log(
      '[git-pull-watcher] ' + new Date().toLocaleString() + ' - ' + message
    );
  }

  function git(args) {
    return new Promise((resolve, reject) => {
      execFile('git', args, { cwd, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          error.stderr = stderr;
          reject(error);
          return;
        }

        resolve((stdout || '').trim());
      });
    });
  }

  async function checkForUpdates() {
    if (checking || stopped) return;

    checking = true;

    try {
      const insideRepo = await git(['rev-parse', '--is-inside-work-tree']);

      if (insideRepo !== 'true') {
        throw new Error('O diretório informado não é um repositório Git.');
      }

      const branch = await git(['symbolic-ref', '--quiet', '--short', 'HEAD']);
      const upstream = await git([
        'rev-parse',
        '--abbrev-ref',
        '--symbolic-full-name',
        '@{u}'
      ]);
      const remote = upstream.split('/')[0];

      await git(['fetch', '--prune', remote]);

      if (stopped) return;

      const counts = await git([
        'rev-list',
        '--left-right',
        '--count',
        'HEAD...' + upstream
      ]);
      const parts = counts.split(/\s+/);
      const ahead = Number(parts[0]);
      const behind = Number(parts[1]);

      if (!behind) {
        log('Sem atualizações na branch ' + branch + '.');
        return;
      }

      if (ahead > 0) {
        log('Atualização encontrada, mas há commits locais divergentes. Pull cancelado.');
        return;
      }

      const status = await git(['status', '--porcelain']);

      if (status) {
        log('Atualização encontrada, mas existem alterações locais. Pull cancelado para protegê-las.');
        return;
      }

      if (stopped) return;

      log(behind + ' novo(s) commit(s) encontrado(s). Executando git pull --ff-only...');
      await git(['pull', '--ff-only']);
      log('Atualização concluída com sucesso.');
    } catch (error) {
      const detail = error.stderr ? error.stderr.trim() : error.message;
      log('Não foi possível verificar/atualizar: ' + detail);
    } finally {
      checking = false;
    }
  }

  function start() {
    if (timer) return api;

    stopped = false;
    log('Monitorando ' + cwd + ' a cada ' + interval / 1000 + ' segundo(s).');

    checkForUpdates();
    timer = setInterval(checkForUpdates, interval);

    return api;
  }

  function stop() {
    stopped = true;

    if (timer) {
      clearInterval(timer);
      timer = null;
      log('Monitoramento encerrado.');
    }

    return api;
  }

  const api = {
    start,
    stop,
    checkForUpdates
  };

  return api;
}

function runCli() {
  const intervalArg = process.argv.find(arg => arg.indexOf('--interval=') === 0);
  const intervalSeconds = intervalArg
    ? Number(intervalArg.split('=')[1])
    : Number(process.env.GIT_PULL_INTERVAL || DEFAULT_INTERVAL);

  if (!Number.isFinite(intervalSeconds) || intervalSeconds < MIN_INTERVAL) {
    console.error('Intervalo inválido. Use pelo menos 5 segundos.');
    process.exitCode = 1;
    return;
  }

  const watcher = createWatcher({
    interval: intervalSeconds * 1000
  });

  function shutdown() {
    watcher.stop();
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  watcher.start();
}

module.exports = {
  createWatcher,
  DEFAULT_INTERVAL
};

if (require.main === module) {
  runCli();
}
