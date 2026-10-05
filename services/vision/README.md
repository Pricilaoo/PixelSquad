# PixelSquad Vision

Serviço privado para reconhecer fotos de Habbo/Habblet usando a Responses API da OpenAI. Não está hospedado nem ativado automaticamente pela atualização da extensão. É necessário configurar uma conta de API com faturamento e executar este servidor. A assinatura do ChatGPT não configura este serviço.

## Configuração por tela no Windows

1. Extraia o pacote `PixelSquad-IA-configurador.zip` numa pasta do seu computador. Não execute de dentro do ZIP.
2. Com Node.js 22 ou superior instalado, dê dois cliques em `INICIAR-IA.cmd`.
3. O navegador abre a tela local. Cole uma **nova chave da OpenAI** no campo e clique em **Salvar chave e iniciar**. Se o navegador não abrir, use o endereço que aparece na janela do servidor.
4. A tela mostra o endereço do servidor e o token PixelSquad. No jogo, vá a **Construção → Foto de referência → Configurar IA** e cole esses dois valores. A chave da OpenAI não vai na extensão.
5. Mantenha a janela do servidor aberta. Nas próximas vezes, abra `INICIAR-IA.cmd` novamente; a chave salva é reutilizada. Reconecte o token na extensão após reiniciar o navegador.

A chave fica no arquivo `.env` desta pasta, fora da extensão. Não compartilhe esse arquivo ou a pasta já configurada. O formulário não testa nem consome a API: a primeira análise verifica se a chave funciona e se há saldo. Para trocar a chave, feche o servidor, remova apenas o arquivo `.env` local e abra o configurador novamente.

A configuração serve para este computador; não hospeda o servidor online. A extensão 0.5.3.22 já é compatível.

## Ativação manual (Node.js 22+)

1. Crie uma chave de projeto na sua conta em https://platform.openai.com/api-keys. Configure limites de gastos na conta. Não cole a chave na extensão, no chat ou no GitHub.
2. Copie `.env.example` para `.env` nesta pasta. Preencha `OPENAI_API_KEY` apenas nesse arquivo/ambiente do servidor.
3. Gere um token privado executando `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e use o resultado como `PIXELSQUAD_VISION_TOKEN`. Esse é o token que será usado na extensão; não é a chave da OpenAI.
4. Nesta pasta execute `node --env-file=.env server.mjs`. O serviço local atende em `http://127.0.0.1:8787` e precisa permanecer executando no mesmo computador do navegador.
5. Na extensão abra Construção → Foto de referência → Configurar IA. Informe `http://127.0.0.1:8787` e o token PixelSquad; autorize o acesso somente a esse endereço. Reconecte após fechar o navegador: o token fica apenas na sessão.
6. Entre em um quarto, carregue os materiais, envie uma foto e clique em Analisar foto. Revise as identificações e clique em Revisar projeto na prévia. Confira materiais/preços reais, selecione o piso e então construa. A compra automática começa desligada em cada projeto importado.

## Hospedagem

O Dockerfile executa o mesmo servidor sem dependências npm. Construa nesta pasta com `docker build -t pixelsquad-vision .` e execute com as variáveis de ambiente acima. Exponha a porta 8787 apenas por um proxy HTTPS. Não exponha a chave OpenAI. HOST=0.0.0.0 já está definido no Dockerfile. O endereço HTTPS final é o que deve ser configurado na extensão.

Cada instância é privada, para um proprietário. Não distribua o token compartilhado para todos os jogadores; uma distribuição pública precisa de contas individuais e cotas por usuário. A chave não é incluída no CRX/ZIP.

## Comportamento e limites

- `POST /v1/analyze` recebe `{image: dataURL, catalog: [{id,name}]}`, com `Authorization: Bearer <token>`. Aceita PNG/JPEG/WebP até 8 MB, catálogo com até 5000 tipos compatíveis e corpo até 12,5 MB. Retorna 202 e `jobId`; consulte `GET /v1/jobs/<jobId>` com o mesmo token até concluir. Não repita o POST automaticamente após timeout.
- Apenas uma análise simultânea, 20 análises/hora por instância por padrão. `VISION_HOURLY_LIMIT` pode ser alterado de 1 a 1000. Reiniciar o processo reinicia a cota; o limite de gastos da conta da OpenAI continua necessário.
- `OPENAI_VISION_MODEL` padrão `gpt-4.1-mini`, configurável. Requisições usam `store:false`; este serviço não grava fotos, tokens ou respostas em disco/logs. O resultado fica na memória por até 5 minutos para consulta. O processamento da OpenAI segue os controles da conta/API.
- O reconhecimento é estimado, não garante reconstrução exata. Mobis ocultos, dimensões e IDs podem ser ambíguos. O catálogo enviado contém os mobis 1×1 suportados pelo construtor, não a loja inteira.
- A sugestão aceita até 256 blocos em uma área 16×16, altura até 8 camadas, com apoio contínuo, sem sobreposição. IDs desconhecidos ou com confiança insuficiente não são colocados. Fotos de outros jogos ou com identificação incerta não geram projetos.
- O modelo não decide preços nem executa compras. A extensão consulta o inventário e as ofertas reais, verifica a área antes de comprar e espera a confirmação de cada colocação. A altura final depende do empilhamento nativo.
- Os testes usam respostas simuladas, sem consumir uma chave real. Valide uma foto pequena da sua conta antes de usar projetos maiores.

Documentação: https://developers.openai.com/api/docs/guides/images-vision e https://developers.openai.com/api/docs/guides/structured-outputs
