# COMPATIA Check

Protótipo da COMPATIA: uma Progressive Web App que verifica, no próprio navegador, quais recursos de PWA estão disponíveis e compara o resultado entre dois aparelhos.

Autor: Pedro Farias.

No ar: https://pedrobartkevihi.github.io/compatia-check/

## O que faz
- Identifica navegador, sistema, motor de renderização e modo de exibição (aba ou app instalado).
- Verifica 17 recursos em cinco grupos: base offline, instalação, reengajamento, segundo plano e integração com o aparelho. A verificação é por detecção de recursos (a API existe neste navegador?), sem pedir permissão ao usuário.
- Mostra o placar, o impacto de cada recurso que falta e os detalhes do ambiente.
- **Comparar com outro aparelho:** gera um link com o resultado (no endereço, depois de `#comparar=`). Aberto em outro aparelho, mostra os dois resultados lado a lado e destaca as diferenças.
- Funciona offline (service worker com cache), pode ser instalado e imprime o relatório.
- Nada é enviado a servidores: tudo roda no navegador. O link de comparação leva o resultado só para quem você o enviar, e quem o recebe vê um aviso de que ele pode ter sido alterado.

## Rodar
É um site estático. Service worker e instalação exigem HTTPS ou `localhost`.

```
python -m http.server 8090 --bind 127.0.0.1
```

Depois, abra http://localhost:8090.

## Arquivos
- `index.html` — estrutura da página.
- `css/style.css` — estilos.
- `js/verificacoes.js` — a lista dos recursos verificados. A ordem entra no link de comparação: ao mudar a lista, aumente `VERSAO_VERIFICACOES`.
- `js/app.js` — interface, placar, comparação, instalação e impressão.
- `sw.js` — service worker: guarda os arquivos no cache e os atualiza em segundo plano, sempre conferindo com o servidor (o GitHub Pages manda o navegador guardar os arquivos por 10 minutos). A cada versão, troque o nome do cache (`CACHE_APP`, em `sw.js`); quando a versão nova assume, a página recarrega uma vez sozinha. A verificação "Pronto para offline" confere o service worker ativo e os arquivos essenciais em qualquer cache do app.
- `manifest.webmanifest` e `icons/` — manifesto e ícones (os PNG são gerados a partir dos SVG).

## Limites do protótipo
- O Check diagnostica o navegador em que é aberto, não a PWA de um cliente. Detectar uma API não garante que ela funcione igual em todo aparelho (permissões, configuração e implementação contam); testes de comportamento (por exemplo, receber um push de verdade) ficam para a versão completa.
- Navegador, sistema e motor são estimados pelo User-Agent.
- No iPhone e no iPad, push, notificações e contador no ícone só existem na PWA adicionada à Tela de Início; aberta numa aba do Safari, a mesma PWA mostra menos recursos.
