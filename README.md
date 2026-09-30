# PixelSquad

Extensão de construção e Wired para Habblet.

**Criador:** Pricilao

## Atualização automática

O PixelSquad está preparado para um fluxo de distribuição empacotada:

```
GitHub → GitHub Actions → CRX3 + ZIP → GitHub Release
                         ↘ update.xml → Opera/Chromium
```

O manifest usa uma chave pública fixa e um `update_url` hospedado no GitHub. O workflow assina cada CRX com a mesma chave privada, publica uma release e mantém um arquivo `PixelSquad-latest.crx` com nome estável. O workflow também incrementa automaticamente o patch da versão quando necessário.

**Importante:** uma extensão instalada como **Load Unpacked** continua sendo uma instalação de desenvolvimento e não passa a se atualizar sozinha apenas por estar no GitHub. O Opera documenta o modo *Load Unpacked* separadamente do mecanismo de pacotes/atualização. citeturn0search11turn0search0

### Configuração única

É necessário cadastrar uma vez o segredo de assinatura no GitHub:

- **Nome:** `PIXELSQUAD_PRIVATE_KEY_B64`
- **Valor:** Base64 da chave privada fornecida para o projeto.

Caminho: **GitHub → Settings → Secrets and variables → Actions → New repository secret**.

Depois dessa configuração, você não precisa gerar ou baixar um novo arquivo a cada atualização: alterações em `extension/**` disparam o build, a release e a atualização do manifesto.

### Fluxo

1. Altere o código dentro de `extension/`.
2. Faça commit/push em `main`.
3. O Actions valida JavaScript e manifest.
4. A versão é incrementada quando necessário.
5. O CRX3 é assinado com a mesma chave.
6. Uma nova GitHub Release é publicada.
7. `updates/update.xml` passa a apontar para `PixelSquad-latest.crx`.
8. Instalações compatíveis com atualização externa podem consultar o `update_url` e receber a nova versão.

O GitHub documenta a URL `releases/latest/download/<asset>` para baixar um ativo da release mais recente, e o Opera documenta `update_url` e a comparação de versões no mecanismo de atualização. citeturn2search0turn0search0

## Desenvolvimento

Para testes locais, use `opera://extensions` → **Developer Mode** → **Load Unpacked**. Nesse modo, use **Reload** após alterar os arquivos. citeturn0search11

## Estrutura

- `extension/` — código da extensão Chromium/MV3.
- `dashboard/` — painel web do projeto.
- `.github/workflows/build.yml` — build, assinatura e publicação.
- `updates/update.xml` — manifesto de atualização.

## Projeto

```
https://github.com/Pricilaoo/PixelSquad
```
