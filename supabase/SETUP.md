# Ativar login e sincronização

O site continua funcionando no modo local até concluir estas etapas. Não é necessário pagar ou mudar o GitHub Pages.

1. Crie um projeto em https://supabase.com/dashboard. Guarde a senha do banco apenas no seu gerenciador de senhas; ela não entra no app.
2. No **SQL Editor**, execute o conteúdo completo de `supabase/schema.sql`, uma vez, em um projeto novo. O script é transacional; não o execute novamente após sucesso. As tabelas usam Row Level Security. Clientes só leem suas próprias linhas; gravações passam por uma função que usa o usuário autenticado, nunca um ID enviado pelo navegador.
3. Em **Authentication → Providers → Email**, habilite login por e-mail e cadastro de novos usuários. Em **Authentication → Email Templates → Magic Link**, mantenha o assunto e troque o corpo por `Seu código do Meu Ritmo é: {{ .Token }}`. Assim o usuário recebe um código digitável em vez de um link. Não use uma chave administrativa no site. Configure o Site URL como `https://stefanogalani.github.io/meu-ritmo/`.
4. Em **Project Settings → API** (ou na tela **Connect**), copie a URL do projeto e a chave **publishable**, ou a chave legada **anon**. Essas são configurações públicas; NÃO use `secret`, `service_role`, senha do banco ou token pessoal.
5. Preencha `cloud-config.js` com a URL e a chave pública e envie esse arquivo para a branch publicada. O próximo deploy habilita o painel de login. Não coloque segredos nesse repositório público.
6. Abra o site, digite seu e-mail, clique em **Receber código** e digite o código recebido em **Entrar**. No primeiro acesso, a conta na nuvem fica vazia. Use **Importar dados locais**, depois **Salvar na nuvem**. O armazenamento local anterior continua preservado. Também é possível usar **Importar cópia** para um backup JSON e depois enviar.
7. No segundo dispositivo, entre com o mesmo e-mail. Confirme que as tarefas e notas carregaram. Em **Table Editor → activity_logs**, confira os eventos `created`/`saved`. Logs de autenticação e API ficam nos painéis do próprio Supabase; esta versão não coleta telemetria de navegação nem erros do navegador.

## Funcionamento e limites

- A sessão fica somente na memória e termina para o app ao recarregar/fechar a página. Não há tokens de acesso no localStorage. Reentre por código para retomar a sincronização.
- Alterações são guardadas também em um cache local separado por usuário, mas a nuvem só muda com **Salvar na nuvem**. O carregamento ao entrar usa os dados da nuvem. Para recuperar mudanças não enviadas de um cache, exporte antes de sair/recarregar. Dados locais são texto simples e ficam acessíveis a quem usar o mesmo perfil do navegador; este app não é um cofre criptografado.
- **Carregar nuvem** atualiza a tela; se houver alterações, pede confirmação. Em conflito de revisão, exporte sua cópia local antes de carregar a versão remota; não há mesclagem automática.
- Não há sincronização automática de sessões do cronômetro nesta versão. Tarefas e notas são armazenadas juntas em um documento por conta. Os registros de salvamento são criados pelo banco, não pelo cliente.
- O serviço de e-mail padrão do Supabase pode limitar destinatários/envios e exigir configuração de SMTP próprio para uso amplo. Confira Authentication e os logs de entrega se o e-mail não chegar. As cotas do plano gratuito podem mudar; acompanhe Usage no Supabase.
- Para um app exclusivamente pessoal, desabilite novos cadastros após criar sua conta. Cada conta continua isolada por regras do banco.

## Validação obrigatória após conectar um projeto real

1. Conta A: crie uma tarefa e nota, salve, entre em outro navegador e confirme os dados.
2. Conta B: confirme que não vê os dados de A e que consultas diretas a user_data e activity_logs com o token de B e o ID de A retornam vazio.
3. Requisição sem login: leitura/gravação deve ser negada. Tentar modificar user_id na chamada não deve conceder acesso a outra conta.
4. Abra a conta A em duas abas: salve em uma; salvar uma revisão anterior na outra deve retornar conflito (HTTP 409), preservando o banco.
5. Confira os registros de autenticação e os eventos de salvamento. Não inclua conteúdo de notas, códigos ou tokens em logs adicionais.

A validação com um projeto Supabase real depende de sua configuração. Testes simulados do cliente não comprovam as regras de acesso do banco.
