# PixelSquad

Extensão de construção e Wired para Habblet.

**Criador:** Pricilao

## Estrutura
- `extension/` — código da extensão Chromium/MV3.
- `dashboard/` — painel web do projeto.
- `.github/workflows/build.yml` — valida, empacota e publica automaticamente a extensão.
- `updates/update.xml` — manifesto usado pelo mecanismo de atualização do Opera/Chromium.

## Atualização automática

O PixelSquad agora está preparado para distribuição empacotada:

```
GitHub → GitHub Actions → CRX3 + ZIP → GitHub Release
                         ↘ update.xml → Opera
```

O manifest da extensão usa uma chave pública fixa e um `update_url` hospedado no GitHub. O workflow assina cada CRX com a mesma chave privada, publica a versão e atualiza o manifesto de atualização.

**Importante:** uma extensão instalada como **Load Unpacked** continua sendo uma instalação de desenvolvimento e não passa a se atualizar sozinha apenas por estar no GitHub. Para usar o mecanismo de atualização, a extensão precisa ser instalada/distribuída como pacote compatível com o navegador e o método de instalação precisa permitir atualização externa. A própria documentação do Opera diferencia claramente o modo *Load Unpacked* do pacote CRX. citeturn0search11turn0search0

### Configuração única do segredo

No GitHub, abra **Settings → Secrets and variables → Actions → New repository secret** e crie:

- **Nome:** `PIXELSQUAD_PRIVATE_KEY_B64`
- **Valor:** conteúdo em Base64 da chave privada fornecida para este projeto.

Depois disso, cada alteração em `extension/**` dispara o build e a publicação.

### Fluxo de uso

1. Faça uma alteração no código dentro de `extension/`.
2. Faça commit/push na branch `main`.
3. O GitHub Actions valida os arquivos.
4. O workflow gera o CRX3 e o ZIP.
5. O workflow publica uma nova GitHub Release.
6. O `updates/update.xml` aponta para a nova versão.
7. Instalações compatíveis com atualização externa podem consultar o `update_url` e atualizar quando o navegador fizer a verificação.

O GitHub fornece uma URL estável para o download de um ativo da release mais recente, e o Opera documenta `update_url` e comparação de versões para seu mecanismo de atualização. citeturn2search0turn0search0

## Teste atual

Para desenvolvimento, continue usando `opera://extensions` → **Developer Mode** → **Load Unpacked**. Nesse modo, use **Reload** depois de alterações locais. citeturn0search11

## Projeto

urlPixelSquad no GitHubhttps://github.com/Pricilaoo/PixelSquad
