# PixelSquad

Extensão de construção e Wired para Habblet.

**Criador:** Pricilao

## Estrutura
- `extension/` — código da extensão Chromium/MV3.
- `dashboard/` — painel web do projeto para registrar pedidos e consultar o estado da versão.
- `.github/workflows/build.yml` — gera automaticamente um ZIP da extensão quando houver alteração em `extension/`.

## Fluxo recomendado
1. Conecte o repositório ao Cloudflare Pages para publicar `dashboard/`.
2. Quando o código da extensão mudar, o GitHub Actions gera um novo artefato ZIP automaticamente.
3. Para alterações futuras feitas por mim, o repositório deve estar conectado à conversa por uma integração do GitHub.

## Atualização automática da extensão
Um site pode atualizar o código publicado automaticamente, mas uma extensão carregada como "Load unpacked" não recebe atualização silenciosa do navegador. Para atualização automática real no navegador, o PixelSquad precisa ser distribuído por uma loja de extensões (ou por um mecanismo de distribuição gerenciada/self-hosted compatível com o navegador). O dashboard não tenta burlar essa regra.
