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

## Meu dia e foco por tarefa

A visão **Meu dia** reúne tarefas pendentes com prazo hoje, atrasadas e até três prioridades escolhidas pelo botão **☆ Hoje**. As listas resumem até quatro tarefas por grupo; use Ver tarefas de hoje/Ver atrasadas para abrir o filtro completo. Prioridades concluídas continuam contando nos três espaços até serem removidas. As escolhas valem para a data local do navegador, e o painel se renova quando o dia muda.

Use **Focar** em uma tarefa ou escolha uma tarefa no cronômetro antes de iniciar o ciclo. A escolha fica vinculada ao ciclo iniciado e é preservada ao atualizar a mesma aba. Para mudar de tarefa durante um ciclo, confirme o reinício; ciclos incompletos não geram crédito. Focar novamente na mesma tarefa retoma um ciclo pausado. **Foco livre** continua disponível.

Cada sessão concluída pode incluir taskId e um retrato do título da tarefa ao iniciar. O histórico guarda essa identificação mesmo que a tarefa seja renomeada/excluída, e apresenta os minutos por tarefa nos últimos sete dias. A lista de tarefas mostra também o total de minutos de foco registrado para cada tarefa. Sessões antigas sem vínculo são tratadas como foco livre. Os campos opcionais cabem no schema existente, sem migração SQL.

Teste: `NODE_PATH=/tmp/meu-ritmo-tests/node_modules node tests/my-day.cjs` (com o servidor de testes em execução).

## Desfazer e lixeira

Excluir uma tarefa, ou usar **Limpar concluídas**, move os itens para **Lixeira**. O aviso **Desfazer** restaura a última exclusão desta sessão. Recarregar ou trocar de conta encerra esse atalho, mas os itens continuam na lixeira, sincronizada com a conta e incluída nos backups.

Na lixeira, busque pelo título/categoria, restaure ou exclua definitivamente um item. **Esvaziar lixeira** exige confirmação. Não há expiração automática. O limite de 5.000 tarefas inclui itens ativos e na lixeira. Restaurar preserva prazos, subtarefas, recorrência e identificadores; não cria uma nova ocorrência. Uma prioridade do dia só é restaurada como prioridade se ainda houver espaço nas três escolhas. Históricos de foco são independentes e não são apagados ao excluir tarefas.

## Repetições

Na criação ou em Editar, escolha **Diariamente**, **Semanalmente** ou **Mensalmente**. Sem prazo informado, a primeira data é hoje. Ao concluir a tarefa (também pelo último passo ou por Meu dia), surge uma única próxima ocorrência pendente, com título, categoria, prioridade e passos copiados; os passos ficam desmarcados e a prioridade do dia não é copiada.

A próxima data segue a data planejada, pulando ciclos vencidos até uma data futura. Não há criação agendada no servidor nem acumulação de tarefas enquanto uma ocorrência segue pendente. Em meses curtos, a repetição mensal usa o último dia possível e depois retorna ao dia de origem (31/01 → 28/02 → 31/03; considera anos bissextos).

Reabrir/concluir novamente a mesma ocorrência não duplica a próxima. Apagar ou restaurar também não cria outra. Ocorrências já geradas não são alteradas retroativamente ao editar a tarefa anterior; para parar a série, edite a próxima tarefa pendente e escolha **Não repetir**. Restaurar uma tarefa concluída também não recria uma ocorrência seguinte que tenha sido excluída deliberadamente.

Os dados continuam no documento existente do Supabase; nenhuma migração SQL é necessária. Backups anteriores sem lixeira/repetição continuam válidos.

Teste: `NODE_PATH=/tmp/meu-ritmo-tests/node_modules node tests/trash-repeat.cjs`, com o servidor local de testes em execução.

## Atualização sem mistura de versões

Os scripts app.js, cloud.js e pwa.js usam o parâmetro de versão `?v=7` no HTML e são precacheados com a mesma URL no service worker. Sempre que modificar arquivos do shell, atualize também esse identificador de versão nos scripts do HTML e na lista SHELL de sw.js, junto da versão CACHE. Isso evita que HTML novo use JavaScript antigo de outro cache.

**Verificar atualização** mostra progresso imediatamente, bloqueia cliques repetidos e encerra a espera após 12 segundos quando o navegador/rede não responde. A ativação continua exigindo ação explícita e ausência de alterações pendentes. Abas com uma versão já ativada em outra aba também podem recarregar com segurança. O parâmetro temporário `atualizar` é removido ao aplicar a atualização, mantendo a navegação normal compatível com o cache offline.

Teste de migração real de cache: `NODE_PATH=/tmp/meu-ritmo-tests/node_modules node tests/update.cjs`. Esse teste inicia seu próprio servidor temporário na porta 8767 e não usa contas reais.
