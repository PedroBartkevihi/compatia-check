// sw.js — service worker do COMPATIA Check: guarda os arquivos do app no cache para que ele abra sem internet.
// Ao mudar qualquer arquivo da lista, troque o nome do cache (também em js/verificacoes.js, CACHE_APP).
// Autor: Pedro Farias

const CACHE_APP = "compatia-check-v1";
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
			return cache.addAll(ARQUIVOS);
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
	if (pedido.method !== "GET" || new URL(pedido.url).origin !== self.location.origin) {
		return;
	}
	evento.respondWith(
		caches.open(CACHE_APP).then(function (cache) {
			return cache.match(pedido, { ignoreSearch: true }).then(function (guardado) {
				const daRede = fetch(pedido).then(function (resposta) {
					if (resposta.ok) {
						cache.put(pedido, resposta.clone());
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
						return cache.match("./index.html");
					}
					return Response.error();
				});
			});
		})
	);
});
