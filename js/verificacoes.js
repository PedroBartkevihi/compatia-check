// verificacoes.js — recursos de PWA verificados pelo COMPATIA Check.
// Cada verificação confere se a API existe neste navegador (detecção de recursos), sem pedir permissão ao usuário.
// Detectar a API não prova que o recurso funciona: isso exige testar o comportamento.
// A ordem da lista entra no link de comparação: ao mudar a lista, aumente VERSAO_VERIFICACOES.
// Autor: Pedro Farias

const VERSAO_VERIFICACOES = 1;

// o app.js guarda aqui a promessa do registro do service worker
const estadoSW = {
	registro: null
};

// arquivos sem os quais o app não abre offline
const ARQUIVOS_ESSENCIAIS = ["./index.html", "./css/style.css", "./js/verificacoes.js", "./js/app.js"];

const CATEGORIAS = [
	{
		id: "base",
		nome: "Base offline",
		descricao: "O que faz a PWA abrir rápido e funcionar sem internet."
	},
	{
		id: "instalacao",
		nome: "Instalação",
		descricao: "Como o app chega à tela inicial e se liga ao sistema."
	},
	{
		id: "reengajamento",
		nome: "Reengajamento",
		descricao: "Formas de trazer o usuário de volta ao app."
	},
	{
		id: "segundo-plano",
		nome: "Segundo plano",
		descricao: "Tarefas que continuam com o app fechado."
	},
	{
		id: "integracao",
		nome: "Integração com o aparelho",
		descricao: "Recursos que aproximam a PWA de um app nativo."
	}
];

const AVISO_IOS = "No iPhone e no iPad (iOS e iPadOS 16.4 ou superior), só existe na PWA adicionada à Tela de Início e depende da permissão do usuário.";

function esperar(ms) {
	return new Promise(function (resolver) {
		setTimeout(resolver, ms);
	});
}

// Pronto para offline: o service worker deste app está ativo e os arquivos essenciais estão no cache.
// Se o registro falhou, responde na hora; se a instalação ainda não terminou, o app.js confere de novo depois.
async function verificarOffline() {
	if (!("serviceWorker" in navigator) || !("caches" in window) || !window.isSecureContext || !estadoSW.registro) {
		return false;
	}
	const registro = await estadoSW.registro.catch(function () {
		return null;
	});
	if (!registro) {
		return false;
	}
	if (!registro.active) {
		await Promise.race([navigator.serviceWorker.ready, esperar(6000)]);
	}
	if (!registro.active) {
		return false;
	}
	for (const arquivo of ARQUIVOS_ESSENCIAIS) {
		if (!(await caches.match(arquivo))) {
			return false;
		}
	}
	return true;
}

function verificarCompartilharArquivos() {
	if (!("canShare" in navigator) || typeof File !== "function") {
		return false;
	}
	try {
		const arquivo = new File(["COMPATIA"], "teste.txt", { type: "text/plain" });
		return navigator.canShare({ files: [arquivo] });
	} catch (erro) {
		return false;
	}
}

const VERIFICACOES = [
	{
		id: "contexto-seguro",
		categoria: "base",
		nome: "Contexto seguro (HTTPS)",
		descricao: "Pré-requisito do service worker, do push e da instalação.",
		impacto: "Sem HTTPS, o service worker não roda: nada de modo offline, push ou instalação.",
		testar: function () {
			return window.isSecureContext === true;
		}
	},
	{
		id: "service-worker",
		categoria: "base",
		nome: "Service Worker",
		descricao: "Script em segundo plano que controla a rede e permite o modo offline.",
		impacto: "Sem service worker, não há modo offline nem push: a PWA funciona como um site comum.",
		testar: function () {
			return "serviceWorker" in navigator;
		}
	},
	{
		id: "cache-storage",
		categoria: "base",
		nome: "Cache Storage",
		descricao: "Guarda os arquivos do app para abrir sem rede.",
		impacto: "Sem Cache Storage, o app depende da rede para abrir.",
		testar: function () {
			return "caches" in window;
		}
	},
	{
		id: "offline",
		categoria: "base",
		nome: "Pronto para offline",
		descricao: "O service worker deste app está ativo e os arquivos essenciais estão guardados no aparelho.",
		impacto: "O COMPATIA Check ainda não ficou guardado para abrir sem internet no aparelho.",
		testar: verificarOffline
	},
	{
		id: "indexeddb",
		categoria: "base",
		nome: "IndexedDB",
		descricao: "Banco de dados local para guardar o que o usuário faz offline.",
		impacto: "Sem IndexedDB, o app perde o banco local para guardar o que o usuário faz offline.",
		testar: function () {
			return "indexedDB" in window;
		}
	},
	{
		id: "armazenamento-persistente",
		categoria: "base",
		nome: "Armazenamento persistente",
		descricao: "Pede ao navegador que não apague os dados do app quando faltar espaço.",
		impacto: "O app não pode pedir que o navegador preserve os dados dele quando faltar espaço.",
		testar: function () {
			return Boolean(navigator.storage && "persist" in navigator.storage);
		}
	},
	{
		id: "convite-instalacao",
		categoria: "instalacao",
		nome: "Convite de instalação",
		descricao: "O navegador permite que o app mostre o próprio botão Instalar (evento beforeinstallprompt).",
		nota: "No Safari e no Firefox para Android, a instalação é feita pelo menu do navegador.",
		impacto: "O app não pode oferecer o próprio botão Instalar: o usuário precisa achar a opção no menu do navegador.",
		testar: function () {
			return "onbeforeinstallprompt" in window || "BeforeInstallPromptEvent" in window;
		}
	},
	{
		id: "abrir-arquivos",
		categoria: "instalacao",
		nome: "Abrir arquivos pelo app",
		descricao: "API launchQueue: o app instalado pode receber arquivos abertos pelo sistema (exige file_handlers no manifesto).",
		impacto: "O app instalado não recebe, por esse mecanismo, arquivos abertos pelo sistema.",
		testar: function () {
			return "launchQueue" in window;
		}
	},
	{
		id: "push",
		categoria: "reengajamento",
		nome: "Push API",
		descricao: "Recebe mensagens do servidor mesmo com o app fechado.",
		nota: AVISO_IOS,
		impacto: "Campanhas e alertas por push não chegam ao aparelho.",
		testar: function () {
			return "PushManager" in window;
		}
	},
	{
		id: "notificacoes",
		categoria: "reengajamento",
		nome: "Notificações",
		descricao: "Mostra avisos do sistema operacional.",
		nota: AVISO_IOS,
		impacto: "O app não consegue mostrar notificações do sistema.",
		testar: function () {
			return "Notification" in window;
		}
	},
	{
		id: "badge",
		categoria: "reengajamento",
		nome: "Contador no ícone",
		descricao: "Mostra um número no ícone do app instalado, como mensagens não lidas.",
		nota: AVISO_IOS,
		impacto: "O ícone do app não mostra o contador de pendências.",
		testar: function () {
			return "setAppBadge" in navigator;
		}
	},
	{
		id: "sincronizacao",
		categoria: "segundo-plano",
		nome: "Sincronização em segundo plano",
		descricao: "Envia o que foi feito offline quando a internet volta, mesmo com o app fechado.",
		impacto: "Sem esse mecanismo, o que o usuário fez offline é enviado quando ele volta a abrir o app.",
		testar: function () {
			return "SyncManager" in window;
		}
	},
	{
		id: "sincronizacao-periodica",
		categoria: "segundo-plano",
		nome: "Sincronização periódica",
		descricao: "Atualiza o conteúdo de tempos em tempos no app instalado.",
		impacto: "Sem esse mecanismo, o app não se atualiza sozinho em intervalos.",
		testar: function () {
			return "PeriodicSyncManager" in window;
		}
	},
	{
		id: "download-segundo-plano",
		categoria: "segundo-plano",
		nome: "Downloads em segundo plano",
		descricao: "Baixa arquivos grandes mesmo se o app for fechado.",
		impacto: "Sem esse mecanismo, um download grande para se o usuário fechar o app.",
		testar: function () {
			return "BackgroundFetchManager" in window;
		}
	},
	{
		id: "compartilhar",
		categoria: "integracao",
		nome: "Compartilhar",
		descricao: "Abre o menu de compartilhar do sistema (Web Share).",
		impacto: "O app não abre o menu de compartilhar do sistema; só dá para copiar o link.",
		testar: function () {
			return "share" in navigator;
		}
	},
	{
		id: "compartilhar-arquivos",
		categoria: "integracao",
		nome: "Compartilhar arquivos",
		descricao: "Envia fotos e documentos pelo menu de compartilhar.",
		impacto: "Não dá para compartilhar arquivos direto do app.",
		testar: verificarCompartilharArquivos
	},
	{
		id: "tela-ligada",
		categoria: "integracao",
		nome: "Tela sempre ligada",
		descricao: "Impede que a tela apague durante uma tarefa, como uma receita ou um pagamento (Wake Lock).",
		impacto: "A tela pode apagar no meio de uma tarefa longa.",
		testar: function () {
			return "wakeLock" in navigator;
		}
	}
];
