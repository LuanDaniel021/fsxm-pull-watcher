#!/usr/bin/env node

'use strict';

const { execFile } = require('child_process');

const DEFAULT_INTERVAL = 60;
const intervalArg = process.argv.find(arg => arg.indexOf('--interval=') === 0);
const intervalSeconds = intervalArg
  ? Number(intervalArg.split('=')[1])
  : Number(process.env.GIT_PULL_INTERVAL || DEFAULT_INTERVAL);

if (!Number.isFinite(intervalSeconds) || intervalSeconds < 5) {
  console.error('Intervalo inválido. Use pelo menos 5 segundos.');
  process.exit(1);
}

const interval = intervalSeconds * 1000;
let checking = false;
let stopped = false;

function git(args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: process.cwd(), windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve((stdout || '').trim());
    });
  });
}

function log(message) {
  console.log('[git-pull-watcher] ' + new Date().toLocaleString() + ' - ' + message);
}

async function checkForUpdates() {
  if (checking || stopped) return;
  checking = true;

  try {
    const insideRepo = await git(['rev-parse', '--is-inside-work-tree']);
    if (insideRepo !== 'true') {
      throw new Error('O diretório atual não é um repositório Git.');
    }

    const branch = await git(['symbolic-ref', '--quiet', '--short', 'HEAD']);
    const upstream = await git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
    const remote = upstream.split('/')[0];

    await git(['fetch', '--prune', remote]);

    const counts = await git(['rev-list', '--left-right', '--count', 'HEAD...' + upstream]);
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

function shutdown() {
  stopped = true;
  log('Monitoramento encerrado.');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

log('Monitorando ' + process.cwd() + ' a cada ' + intervalSeconds + ' segundo(s).');
checkForUpdates();
setInterval(checkForUpdates, interval);
