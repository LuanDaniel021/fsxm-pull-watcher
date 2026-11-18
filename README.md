# fsxm-deploy

Ferramentas simples para automatizar tarefas de deploy e atualização de projetos.

## Git Pull Watcher

Monitora a branch atual do repositório Git e executa `git pull --ff-only` quando encontra commits novos no remoto.

### Requisitos

- Node.js 12 ou superior
- Git instalado e disponível no PATH
- Repositório local com remote e upstream configurados

### Uso

Dentro da pasta do repositório que deseja manter atualizado:

```bash
node caminho/para/fsxm-deploy/src/pull-watcher.js
```

Ou, se estiver executando a ferramenta a partir deste repositório:

```bash
npm start
```

O intervalo padrão é de 60 segundos. Para alterar:

```bash
node src/pull-watcher.js --interval=30
```

Também é possível definir a variável de ambiente `GIT_PULL_INTERVAL` (em segundos).

### Proteções

- Só atualiza quando a branch atual possui upstream configurado.
- Usa `git pull --ff-only`, evitando criar merges automáticos.
- Não atualiza se houver alterações locais não commitadas.
- Não tenta resolver branches divergentes automaticamente.
- Não exige token ou senha no código: a autenticação fica a cargo da configuração do Git.

Encerre com `Ctrl+C`.
