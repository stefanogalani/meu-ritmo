# Meu Ritmo

App pessoal com tarefas, foco e notas. HTML, CSS e JavaScript, sem build.

Site: https://stefanogalani.github.io/meu-ritmo/

## Usar

No modo local, abra index.html no navegador. Tarefas e notas ficam neste navegador; use Exportar dados para backups. Dados locais não sincronizam automaticamente.

## Tela inicial

Escolha **Entrar** para uma conta existente ou **Criar conta** no primeiro acesso. Ambos usam um link enviado por e-mail, sem senha. A opção **Usar sem conta** abre o modo local. Ao sair, o app retorna à tela de acesso. A sessão é mantida neste navegador após atualizar ou reabrir o app. Em um dispositivo compartilhado, clique em Sair ao terminar.

## Login com Google

Use **Continuar com Google** para entrar/criar conta sem envio de e-mails. Configure o provedor seguindo [supabase/GOOGLE.md](supabase/GOOGLE.md). Client Secret deve ficar somente no Supabase.

## Login e banco de dados

A integração opcional com Supabase permite login por link de e-mail e sincronização automática de tarefas/notas entre dispositivos, com detecção de conflito e histórico de salvamentos no banco.

Siga [supabase/SETUP.md](supabase/SETUP.md) para criar o projeto, executar as regras de acesso e configurar a chave pública em cloud-config.js. A configuração vazia mantém o modo local. Nunca publique chaves administrativas.

## Desenvolvimento

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

O GitHub Pages publica a raiz da branch main. Publique todos os arquivos da raiz e as pastas assets/ e vendor/. O cronômetro retoma nesta aba após recarregar e não gera notificações de sistema.

## Dependência de autenticação

Cliente oficial `@supabase/supabase-js` 2.118.0, bundle UMD distribuído pelo npm, incluído em `vendor/` com licença MIT. Usa persistSession e autoRefreshToken. Não há dependência de CDN em execução. O navegador guarda os tokens para recuperar a sessão; Sair remove a sessão local e revoga seu refresh token. Não use em um perfil compartilhado sem sair ao terminar.

## Salvamento automático e recuperação

Com login, tarefas e notas são enviadas cerca de um segundo após a última edição. O indicador distingue pendente, sincronizando, sincronizado e falha. **Sincronizar agora** antecipa o envio. Sem login, os dados continuam locais.

Cada aba guarda alterações pendentes em um registro local separado por usuário. Ao reabrir, uma cópia compatível com a revisão do servidor é recuperada e reenviada. Em falhas transitórias, o app tenta novamente com espera progressiva (até um minuto) e ao recuperar a conexão. Após a primeira abertura com internet, o service worker guarda os arquivos do app para reabertura offline. O navegador pode remover o cache; mantenha backups.

Se a nuvem mudou em outra aba/dispositivo, o envio recebe conflito e é pausado. O painel **Cópias pendentes** permite recuperar uma cópia para consultar/exportar ou descartá-la explicitamente e carregar a nuvem. Não há mesclagem automática. Exporte a cópia local antes de descartar e refaça na versão remota as alterações desejadas.

Não limpe o armazenamento do navegador enquanto houver alterações pendentes. Se o navegador recusar armazenamento, exporte um backup antes de fechar. O estado do cronômetro em andamento pertence a esta aba; sessões de foco concluídas sincronizam com a conta.

## Prazos, prioridades e busca

Tarefas aceitam prazo e prioridade (alta, normal ou baixa). Use Editar para ajustar uma tarefa existente. Busca ignora acentos. Os filtros mostram pendentes, concluídas, hoje ou atrasadas e podem ser combinados com prioridade; a ordenação pode usar prazo ou prioridade. Hoje/atrasada usam a data local do navegador, sem deslocar datas por fuso horário.

## Histórico de foco

Ciclos de foco de 25 minutos concluídos geram um registro, com data e duração, no campo `sessions` do mesmo documento protegido por RLS. Pausas e ciclos reiniciados não contam. O painel resume hoje e os últimos sete dias e lista as dez últimas sessões; são mantidas até 5.000 sessões. A sessão em andamento é retomada após recarregar a mesma aba, separadamente por conta, e uma conclusão é registrada uma única vez nessa aba. Abas/dispositivos continuam sujeitos à resolução de conflitos descrita acima.

Backups antigos continuam válidos: tarefas antigas recebem prioridade normal e nenhum prazo. Backups novos incluem histórico, prioridades e datas. Não há migração SQL necessária no schema atual.

## Instalar e usar offline

No Chrome/Edge e Android, use **Instalar app**, quando o navegador disponibilizar a ação, ou o menu do navegador. No iPhone/iPad, use Safari → Compartilhar → Adicionar à Tela de Início. **Como instalar** explica as opções no próprio app.

O service worker guarda somente arquivos estáticos do app, nunca requisições do Supabase ou respostas de autenticação. Os rascunhos continuam no armazenamento local e sincronizam ao reconectar; a sessão pode precisar ser renovada com internet. O app instalado usa o armazenamento fornecido pelo navegador/plataforma, que pode diferir de outro navegador.

**Atualizações:** sempre altere a versão `CACHE` de `sw.js` ao modificar arquivos do shell. Use **Verificar atualização** no topo. Uma atualização preparada oferece **Atualizar agora**, que aguarda não haver operações ou alterações pendentes nesta aba antes de ativar e recarregar. Outras abas não são recarregadas à força. Fechar todas as abas/janelas e abrir novamente também ativa uma atualização preparada.

## Testes de navegador

Os testes em `tests/` usam Playwright como ferramenta de desenvolvimento, sem dependências de produção. Em Linux, prepare fora do checkout:

```sh
npm install --prefix /tmp/meu-ritmo-tests playwright@1.62.1
/tmp/meu-ritmo-tests/node_modules/.bin/playwright install chromium
python3 -m http.server 8765 --bind 127.0.0.1
```

Com o servidor em execução na raiz do repositório, em outro terminal:

```sh
NODE_PATH=/tmp/meu-ritmo-tests/node_modules node tests/features.cjs
NODE_PATH=/tmp/meu-ritmo-tests/node_modules node tests/backups.cjs
NODE_PATH=/tmp/meu-ritmo-tests/node_modules node tests/offline.cjs
NODE_PATH=/tmp/meu-ritmo-tests/node_modules node tests/autosync.cjs
```

Para Chromium já instalado, defina `CHROMIUM_PATH`. A suíte de sincronização simula o Supabase e não usa credenciais reais; não substitui uma validação do banco e das regras RLS no projeto real.

## Categorias e subtarefas

No formulário de criação, escolha uma categoria sugerida ou digite uma própria (até 40 caracteres). O filtro de categoria combina com status, prioridade e busca. Nomes de categoria são agrupados ignorando acentos e maiúsculas. A busca inclui título, categoria e texto das subtarefas.

Abra **Dividir em subtarefas** e escreva um passo por linha (até 30 passos de 120 caracteres por tarefa). O checklist mostra progresso. Concluir todos os passos conclui a tarefa; reabrir um passo reabre a tarefa. Marcar/desmarcar a tarefa principal aplica o mesmo estado a todos os passos.

Em **Editar**, você pode mudar a categoria e a lista de passos. Passos de texto igual preservam seu progresso ao reordenar; um passo renomeado é considerado novo e fica pendente. Campos opcionais mantêm compatibilidade com tarefas e backups anteriores. Tudo sincroniza no documento existente do Supabase, sem nova migração SQL.

Teste adicional: `NODE_PATH=/tmp/meu-ritmo-tests/node_modules node tests/organization.cjs` (com o mesmo servidor e dependências descritos acima).
