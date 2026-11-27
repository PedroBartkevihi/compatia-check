// sw.js — service worker do COMPATIA Check: guarda os arquivos do app no cache para que ele abra sem internet.
// A cada versão nova do app, troque o nome do cache (CACHE_APP): a instalação guarda tudo de novo,
// a ativação apaga o cache antigo e a página recarrega uma vez sozinha (js/app.js).
// Autor: Pedro Farias

const CACHE_APP = "compatia-check-v3";
const ARQUIVOS = [
	"./",
	"./index.html",
	"./css/style.css",
	"./js/verificacoes.js",
	"./js/app.js",
	"./manifest.webmanifest",
	"./icons/icon.svg",
	"./icons/icon-192.png",
	"./icons/icon-512.png",
	"./icons/icon-maskable-512.png"
];

self.addEventListener("install", function (evento) {
	evento.waitUntil(
		caches.open(CACHE_APP).then(function (cache) {
			// "reload" ignora o cache HTTP do navegador (o GitHub Pages manda guardar por 10 minutos)
			return cache.addAll(ARQUIVOS.map(function (arquivo) {
				return new Request(arquivo, { cache: "reload" });
			}));
		}).then(function () {
			return self.skipWaiting();
		})
	);
});

self.addEventListener("activate", function (evento) {
	evento.waitUntil(
		caches.keys().then(function (nomes) {
			return Promise.all(nomes.filter(function (nome) {
				return nome.startsWith("compatia-check-") && nome !== CACHE_APP;
			}).map(function (nome) {
				return caches.delete(nome);
			}));
		}).then(function () {
			return self.clients.claim();
		})
	);
});

// Responde com o cache na hora e atualiza o arquivo pela rede em segundo plano (vale na próxima abertura);
// sem cache, vai à rede; sem rede, a navegação cai na página inicial guardada.
self.addEventListener("fetch", function (evento) {
	const pedido = evento.request;
	const endereco = new URL(pedido.url);
	if (pedido.method !== "GET" || endereco.origin !== self.location.origin) {
		return;
	}
	// uma entrada por arquivo, sem a parte "?..." do endereço
	endereco.search = "";
	const chave = endereco.href;
	evento.respondWith(
		caches.open(CACHE_APP).then(function (cache) {
			return cache.match(pedido, { ignoreSearch: true }).then(function (guardado) {
				// "no-cache" confere com o servidor antes de usar a cópia do navegador
				const daRede = fetch(pedido, { cache: "no-cache" }).then(function (resposta) {
					// não guarda erro, redirecionamento nem resposta de outra origem
					if (resposta.ok && !resposta.redirected && resposta.type === "basic") {
						return cache.put(chave, resposta.clone()).then(function () {
							return resposta;
						});
					}
					return resposta;
				}).catch(function () {
					return null;
				});
				if (guardado) {
					evento.waitUntil(daRede);
					return guardado;
				}
				return daRede.then(function (resposta) {
					if (resposta) {
						return resposta;
					}
					if (pedido.mode === "navigate") {
						return cache.match("./index.html").then(function (pagina) {
							return pagina || Response.error();
						});
					}
					return Response.error();
				});
			});
		})
	);
});
