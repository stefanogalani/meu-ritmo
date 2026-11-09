# Entrar com Google (sem SMTP)

O botão funciona para entrar ou criar conta. O envio de e-mails do Supabase não é usado nesse fluxo. É necessário configurar o provedor no seu projeto; o código do site sozinho não o habilita.

1. Abra https://console.cloud.google.com/ e crie/selecione um projeto chamado Meu Ritmo. A configuração básica de OAuth não requer ativar APIs pagas ou fornecer senha ao app.
2. Abra **Google Auth Platform** (ou **APIs & Services → OAuth consent screen**) e faça o cadastro inicial: nome Meu Ritmo, e-mail de suporte, público **External**, e-mail de contato. Para testar, mantenha o status **Testing** e inclua seu Gmail em **Audience → Test users**. Não peça escopos além de openid, email e profile, que identificam a conta.
3. Em **Clients → Create client** (ou **Credentials → Create credentials → OAuth client ID**), escolha **Web application**, nome Meu Ritmo Web.
4. Em **Authorized JavaScript origins**, adicione `https://stefanogalani.github.io` (sem /meu-ritmo/). Em **Authorized redirect URIs**, adicione EXATAMENTE `https://oexmlimftexnptjmnynm.supabase.co/auth/v1/callback`. Crie o cliente.
5. No Supabase, vá a **Authentication → Sign In / Providers → Google**. Habilite o provedor e cole o **Client ID** e o **Client Secret** obtidos do Google. Salve. Deixe opções avançadas de ignorar nonce ou aceitar e-mails sem verificação desativadas.
6. Em **Authentication → URL Configuration**, use `https://stefanogalani.github.io/meu-ritmo/` como **Site URL** e adicione exatamente esse endereço em **Redirect URLs**.
7. Abra o site, clique em **Continuar com Google** e escolha o mesmo Gmail usado antes, para que o Supabase possa associar a identidade ao usuário existente quando as regras de vinculação permitirem. Confira em Authentication → Users se o UID é o mesmo, e confirme que suas tarefas antigas aparecem. Não apague usuários nem mova dados entre contas para contornar uma diferença de UID; investigue a vinculação primeiro.

**Client Secret fica somente no Supabase. Nunca envie em chat, no GitHub ou no cloud-config.js.** O Client ID é público. A conta Google deve constar como usuário de teste enquanto o projeto estiver em Testing; para abrir a outras pessoas, configure a publicação do consentimento conforme as exigências mostradas pelo Google.

Erros comuns: `redirect_uri_mismatch` significa que a URI de callback do Supabase no cliente Google não coincide; `access_denied` pode indicar usuário fora da lista de teste ou consentimento recusado. Retorno para um endereço errado exige revisar Site URL/Redirect URLs no Supabase.

O app usa o cliente oficial Supabase, mantém a sessão no navegador e recupera o retorno OAuth. A segurança dos dados continua sendo aplicada pelo RLS do banco. A validação real requer configurar o cliente OAuth e completar o consentimento na conta Google.

## Criar tarefas no Google Tasks

1. No Google Cloud, habilite a **Google Tasks API**.
2. Em **Google Auth Platform → Data Access**, configure o escopo `https://www.googleapis.com/auth/tasks`. Em **Audience**, adicione a conta que vai testar se o app estiver em Testing.
3. Use um cliente OAuth do tipo **Web application**, com `https://stefanogalani.github.io` em **Authorized JavaScript origins**. Pode reutilizar o Client ID público já configurado para o login.
4. Preencha `MEU_RITMO_GOOGLE_TASKS_CLIENT_ID` em `cloud-config.js` com o Client ID público e publique a configuração junto com uma nova versão do cache da PWA.

Em **Agendar → Criar no Google Tasks**, selecione uma data e autorize a conta Google. A tarefa é criada na lista padrão, com título e data. O horário do formulário vale para eventos. A autorização do Tasks é separada do login e o token é usado apenas durante a requisição.
