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

O GitHub Pages publica a raiz da branch main. Mantenha index.html, cloud.js, cloud-config.js e a pasta vendor juntos. O cronômetro reinicia ao recarregar e não gera notificações de sistema.

## Dependência de autenticação

Cliente oficial `@supabase/supabase-js` 2.118.0, bundle UMD distribuído pelo npm, incluído em `vendor/` com licença MIT. Usa persistSession e autoRefreshToken. Não há dependência de CDN em execução. O navegador guarda os tokens para recuperar a sessão; Sair remove a sessão local e revoga seu refresh token. Não use em um perfil compartilhado sem sair ao terminar.

## Salvamento automático e recuperação

Com login, tarefas e notas são enviadas cerca de um segundo após a última edição. O indicador distingue pendente, sincronizando, sincronizado e falha. **Sincronizar agora** antecipa o envio. Sem login, os dados continuam locais.

Cada aba guarda alterações pendentes em um registro local separado por usuário. Ao reabrir, uma cópia compatível com a revisão do servidor é recuperada e reenviada. Em falhas transitórias, o app tenta novamente com espera progressiva (até um minuto) e ao recuperar a conexão. O site precisa estar carregado no navegador; não há service worker para garantir abrir a página sem internet.

Se a nuvem mudou em outra aba/dispositivo, o envio recebe conflito e é pausado. O painel **Cópias pendentes** permite recuperar uma cópia para consultar/exportar ou descartá-la explicitamente e carregar a nuvem. Não há mesclagem automática. Exporte a cópia local antes de descartar e refaça na versão remota as alterações desejadas.

Não limpe o armazenamento do navegador enquanto houver alterações pendentes. Se o navegador recusar armazenamento, exporte um backup antes de fechar. O cronômetro ainda não sincroniza.
