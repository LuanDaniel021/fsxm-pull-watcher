# fsxm-pull-watcher

Ferramenta Node.js para monitorar atualizações em um repositório Git e executar `git pull --ff-only` automaticamente.

## Requisitos

- Node.js 12 ou superior
- Git instalado e disponível no PATH
- Repositório local com remote e upstream configurados

## Uso pelo terminal

Dentro da pasta do repositório que deseja manter atualizado:

```bash
node caminho/para/fsxm-pull-watcher/src/index.js
```

Ou, se estiver executando a ferramenta a partir deste repositório:

```bash
npm start
```

O intervalo padrão é de 60 segundos. Para alterar:

```bash
node src/index.js --interval=30
```

Também é possível definir a variável de ambiente `GIT_PULL_INTERVAL` (em segundos).

## Uso como módulo

O módulo utiliza CommonJS e pode ser importado com `require`. Importá-lo não inicia o monitoramento automaticamente.

```js
const { createWatcher } = require('./src');

const watcher = createWatcher({
  cwd: process.cwd(),
  interval: 30000
});

watcher.start();

process.on('SIGINT', () => {
  watcher.stop();
});
```

### API

- `createWatcher(options)`: cria uma instância independente.
- `options.cwd`: diretório do repositório Git. Padrão: diretório atual.
- `options.interval`: intervalo em milissegundos. Padrão: 60000; mínimo: 5000.
- `options.logger`: objeto com método `log`. Padrão: `console`.
- `watcher.start()`: inicia o monitoramento e executa uma verificação imediata.
- `watcher.stop()`: encerra o agendamento.
- `watcher.checkForUpdates()`: solicita uma verificação manual.

## Proteções

- Só atualiza quando a branch atual possui upstream configurado.
- Usa `git pull --ff-only`, evitando criar merges automáticos.
- Não atualiza se houver alterações locais não commitadas.
- Não tenta resolver branches divergentes automaticamente.
- Não exige token ou senha no código: a autenticação fica a cargo da configuração do Git.
