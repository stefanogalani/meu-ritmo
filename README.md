# Meu Ritmo

App pessoal com tarefas, foco e notas. HTML, CSS e JavaScript, sem build.

Site: https://stefanogalani.github.io/meu-ritmo/

## Usar

No modo local, abra index.html no navegador. Tarefas e notas ficam neste navegador; use Exportar dados para backups. Dados locais não sincronizam automaticamente.

## Tela inicial

Escolha **Entrar** para uma conta existente ou **Criar conta** no primeiro acesso. Ambos usam um link enviado por e-mail, sem senha. A opção **Usar sem conta** abre o modo local. Ao sair, o app retorna à tela de acesso. A sessão é mantida neste navegador após atualizar ou reabrir o app. Em um dispositivo compartilhado, clique em Sair ao terminar.

## Login e banco de dados

A integração opcional com Supabase permite login por link de e-mail e sincronização manual de tarefas/notas entre dispositivos, com detecção de conflito e histórico de salvamentos no banco.

Siga [supabase/SETUP.md](supabase/SETUP.md) para criar o projeto, executar as regras de acesso e configurar a chave pública em cloud-config.js. A configuração vazia mantém o modo local. Nunca publique chaves administrativas.

## Desenvolvimento

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

O GitHub Pages publica a raiz da branch main. Mantenha index.html, cloud.js, cloud-config.js e a pasta vendor juntos. O cronômetro reinicia ao recarregar e não gera notificações de sistema.

## Dependência de autenticação

Cliente oficial `@supabase/supabase-js` 2.118.0, bundle UMD distribuído pelo npm, incluído em `vendor/` com licença MIT. Usa persistSession e autoRefreshToken. Não há dependência de CDN em execução. O navegador guarda os tokens para recuperar a sessão; Sair remove a sessão local e revoga seu refresh token. Não use em um perfil compartilhado sem sair ao terminar.
