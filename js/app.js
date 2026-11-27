// app.js — interface do COMPATIA Check: identifica o aparelho, roda as verificações,
// mostra o relatório e compara com o relatório de outro aparelho recebido pelo link (#comparar=...).
// Autor: Pedro Farias

(function () {
	"use strict";

	const PREFIXO_LINK = "#comparar=";
	const TAMANHO_MAXIMO_LINK = 600;

	const estado = {
		aparelho: null,
		resultados: {},
		concluido: false,
		eventoInstalacao: null
	};

	function el(id) {
		return document.getElementById(id);
	}

	function criar(tag, classe, texto) {
		const elemento = document.createElement(tag);
		if (classe) {
			elemento.className = classe;
		}
		if (texto !== undefined) {
			elemento.textContent = texto;
		}
		return elemento;
	}

	// símbolo só visual (o leitor de tela lê apenas a palavra)
	function preencherComSimbolo(elemento, simbolo, texto) {
		elemento.replaceChildren();
		const marca = criar("span", "", simbolo + " ");
		marca.setAttribute("aria-hidden", "true");
		elemento.appendChild(marca);
		elemento.appendChild(document.createTextNode(texto));
	}

	function menosMovimento() {
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	function mostrarAviso(texto) {
		const aviso = el("aviso");
		aviso.textContent = texto;
		aviso.classList.add("visivel");
		clearTimeout(mostrarAviso.timer);
		mostrarAviso.timer = setTimeout(function () {
			aviso.classList.remove("visivel");
		}, 3500);
	}

	// ---------- aparelho (estimado pelo User-Agent) ----------

	function identificarAparelho() {
		const ua = navigator.userAgent;
		const regras = [
			[/EdgiOS\/(\d+)/, "Edge"],
			[/EdgA\/(\d+)/, "Edge"],
			[/Edg\/(\d+)/, "Edge"],
			[/OPR\/(\d+)/, "Opera"],
			[/SamsungBrowser\/(\d+)/, "Samsung Internet"],
			[/CriOS\/(\d+)/, "Chrome"],
			[/FxiOS\/(\d+)/, "Firefox"],
			[/Firefox\/(\d+)/, "Firefox"],
			[/Electron\/(\d+)/, "Electron"],
			[/Chrome\/(\d+)/, "Chrome"],
			[/Version\/(\d+(?:\.\d+)?).*Safari/, "Safari"]
		];
		let navegador = "Navegador desconhecido";
		let versao = "";
		for (const [expressao, nome] of regras) {
			const achado = ua.match(expressao);
			if (achado) {
				navegador = nome;
				versao = achado[1];
				break;
			}
		}

		const toque = navigator.maxTouchPoints > 1;
		let sistema = "sistema desconhecido";
		if (/iPhone|iPod/.test(ua)) {
			sistema = "iOS";
		} else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && toque)) {
			sistema = "iPadOS";
		} else if (/Android/.test(ua)) {
			sistema = "Android";
		} else if (/CrOS/.test(ua)) {
			sistema = "ChromeOS";
		} else if (/Windows/.test(ua)) {
			sistema = "Windows";
		} else if (/Macintosh/.test(ua)) {
			sistema = "macOS";
		} else if (/Linux/.test(ua)) {
			sistema = "Linux";
		}

		let motor = "Blink";
		if (sistema === "iOS" || sistema === "iPadOS" || navegador === "Safari") {
			motor = "WebKit";
		} else if (navegador === "Firefox") {
			motor = "Gecko";
		} else if (navegador === "Navegador desconhecido") {
			motor = "desconhecido";
		}

		const movel = /Mobi|Android|iPhone|iPad|iPod/.test(ua) || sistema === "iPadOS";
		const instalado = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

		return {
			navegador: navegador,
			versao: versao,
			sistema: sistema,
			motor: motor,
			movel: movel,
			instalado: instalado,
			nome: (versao ? navegador + " " + versao : navegador) + " · " + sistema
		};
	}

	function mostrarAparelho() {
		const aparelho = estado.aparelho;
		el("aparelho-nome").textContent = aparelho.nome;
		const etiquetas = el("aparelho-etiquetas");
		etiquetas.replaceChildren();
		[
			aparelho.movel ? "Celular ou tablet" : "Computador",
			"Motor " + aparelho.motor,
			aparelho.instalado ? "Rodando como app instalado" : "Rodando numa aba do navegador"
		].forEach(function (texto) {
			etiquetas.appendChild(criar("li", "etiqueta", texto));
		});
	}

	// ---------- verificações ----------

	function criarCartoes() {
		const recursos = el("recursos");
		recursos.replaceChildren();
		CATEGORIAS.forEach(function (categoria) {
			const bloco = criar("article", "categoria");
			const cabecalho = criar("div", "categoria-cabecalho");
			cabecalho.appendChild(criar("h2", "", categoria.nome));
			const placar = criar("span", "categoria-placar", "");
			placar.id = "placar-" + categoria.id;
			cabecalho.appendChild(placar);
			bloco.appendChild(cabecalho);
			bloco.appendChild(criar("p", "categoria-descricao", categoria.descricao));

			const lista = criar("ul", "lista-recursos");
			VERIFICACOES.filter(function (verificacao) {
				return verificacao.categoria === categoria.id;
			}).forEach(function (verificacao) {
				const item = criar("li", "recurso pendente");
				item.id = "recurso-" + verificacao.id;
				const texto = criar("div", "recurso-texto");
				texto.appendChild(criar("strong", "", verificacao.nome));
				texto.appendChild(criar("span", "recurso-descricao", verificacao.descricao));
				if (verificacao.nota) {
					texto.appendChild(criar("span", "recurso-nota", verificacao.nota));
				}
				item.appendChild(texto);
				item.appendChild(criar("span", "selo", "Verificando…"));
				lista.appendChild(item);
			});
			bloco.appendChild(lista);
			recursos.appendChild(bloco);
		});
	}

	function marcarResultado(verificacao, disponivel) {
		estado.resultados[verificacao.id] = disponivel;
		const item = el("recurso-" + verificacao.id);
		item.classList.remove("pendente", "disponivel", "indisponivel");
		item.classList.add(disponivel ? "disponivel" : "indisponivel");
		preencherComSimbolo(item.querySelector(".selo"), disponivel ? "✔" : "✘", disponivel ? "Detectado" : "Não detectado");
	}

	async function executarVerificacoes() {
		await Promise.all(VERIFICACOES.map(async function (verificacao) {
			let disponivel = false;
			try {
				disponivel = Boolean(await verificacao.testar());
			} catch (erro) {
				disponivel = false;
			}
			marcarResultado(verificacao, disponivel);
		}));
		estado.concluido = true;
	}

	function contar(resultados) {
		return VERIFICACOES.filter(function (verificacao) {
			return resultados[verificacao.id];
		}).length;
	}

	function mostrarPlacar() {
		const total = VERIFICACOES.length;
		const disponiveis = contar(estado.resultados);
		const proporcao = disponiveis / total;
		el("placar-valor").textContent = disponiveis;
		el("placar-total").textContent = total;
		const barra = el("barra");
		barra.style.width = Math.round(proporcao * 100) + "%";
		barra.className = "barra-preenchida " + (proporcao >= 0.85 ? "nivel-alto" : proporcao >= 0.55 ? "nivel-medio" : "nivel-baixo");
		el("placar-texto").textContent = "verificações de recursos de PWA deram positivo neste navegador";

		CATEGORIAS.forEach(function (categoria) {
			const daCategoria = VERIFICACOES.filter(function (verificacao) {
				return verificacao.categoria === categoria.id;
			});
			const disponiveisNaCategoria = daCategoria.filter(function (verificacao) {
				return estado.resultados[verificacao.id];
			}).length;
			el("placar-" + categoria.id).textContent = disponiveisNaCategoria + "/" + daCategoria.length;
		});
	}

	function mostrarImpacto() {
		const lista = el("impacto-lista");
		lista.replaceChildren();
		const faltando = VERIFICACOES.filter(function (verificacao) {
			return !estado.resultados[verificacao.id];
		});
		if (faltando.length === 0) {
			lista.appendChild(criar("li", "impacto-ok", "Os " + VERIFICACOES.length + " recursos verificados foram detectados neste navegador."));
			return;
		}
		faltando.forEach(function (verificacao) {
			const item = criar("li", "");
			item.appendChild(criar("strong", "", verificacao.nome + ": "));
			item.appendChild(document.createTextNode(verificacao.impacto));
			lista.appendChild(item);
		});
	}

	async function mostrarDetalhes() {
		const lista = el("detalhes-lista");
		lista.replaceChildren();
		const linhas = [
			["Navegador (estimado)", estado.aparelho.versao ? estado.aparelho.navegador + " " + estado.aparelho.versao : estado.aparelho.navegador],
			["Sistema (estimado)", estado.aparelho.sistema],
			["Motor de renderização (estimado)", estado.aparelho.motor],
			["Modo de exibição", estado.aparelho.instalado ? "app instalado (standalone)" : "aba do navegador"],
			["Data da verificação", new Date().toLocaleDateString("pt-BR")]
		];
		if (navigator.storage && navigator.storage.estimate) {
			try {
				const estimativa = await navigator.storage.estimate();
				if (estimativa.quota) {
					const gigas = estimativa.quota / (1024 * 1024 * 1024);
					linhas.push(["Limite estimado de armazenamento do site", gigas >= 1 ? "cerca de " + gigas.toFixed(1).replace(".", ",") + " GB" : "cerca de " + Math.round(gigas * 1024) + " MB"]);
				}
			} catch (erro) {
				// sem estimativa de armazenamento neste navegador
			}
		}
		linhas.forEach(function (linha) {
			lista.appendChild(criar("dt", "", linha[0]));
			lista.appendChild(criar("dd", "", linha[1]));
		});
	}

	// ---------- comparação ----------

	function paraBase64Url(texto) {
		const bytes = new TextEncoder().encode(texto);
		let binario = "";
		bytes.forEach(function (byte) {
			binario += String.fromCharCode(byte);
		});
		return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	}

	function deBase64Url(texto) {
		let base64 = texto.replace(/-/g, "+").replace(/_/g, "/");
		while (base64.length % 4) {
			base64 += "=";
		}
		const binario = atob(base64);
		const bytes = Uint8Array.from(binario, function (caractere) {
			return caractere.charCodeAt(0);
		});
		return new TextDecoder().decode(bytes);
	}

	function dataLocal() {
		const hoje = new Date();
		return hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0") + "-" + String(hoje.getDate()).padStart(2, "0");
	}

	function montarLink() {
		const dados = {
			v: VERSAO_VERIFICACOES,
			a: estado.aparelho.nome,
			d: dataLocal(),
			m: estado.aparelho.instalado ? 1 : 0,
			r: VERIFICACOES.map(function (verificacao) {
				return estado.resultados[verificacao.id] ? "1" : "0";
			}).join("")
		};
		return location.origin + location.pathname + PREFIXO_LINK + paraBase64Url(JSON.stringify(dados));
	}

	// O link vem de outra pessoa e pode ter sido editado: valida tudo e só usa textContent ao mostrar.
	function lerRelatorioDoLink() {
		if (location.hash.indexOf(PREFIXO_LINK) !== 0) {
			return null;
		}
		const codigo = location.hash.slice(PREFIXO_LINK.length);
		if (codigo.length === 0 || codigo.length > TAMANHO_MAXIMO_LINK || !/^[A-Za-z0-9_-]+$/.test(codigo)) {
			return { invalido: true };
		}
		try {
			const dados = JSON.parse(deBase64Url(codigo));
			if (!dados || typeof dados !== "object" || dados.v !== VERSAO_VERIFICACOES || typeof dados.r !== "string" || !/^[01]+$/.test(dados.r) || dados.r.length !== VERIFICACOES.length) {
				return { invalido: true };
			}
			const resultados = {};
			VERIFICACOES.forEach(function (verificacao, indice) {
				resultados[verificacao.id] = dados.r[indice] === "1";
			});
			// tira caracteres de controle e de direção de texto, que poderiam embaralhar a exibição
			const nome = typeof dados.a === "string" ? dados.a.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim().slice(0, 60) : "";
			const data = typeof dados.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dados.d) ? dados.d.split("-").reverse().join("/") : "";
			return {
				nome: nome || "Outro aparelho",
				data: data,
				instalado: dados.m === 1,
				resultados: resultados
			};
		} catch (erro) {
			return { invalido: true };
		}
	}

	function celulaResultado(disponivel) {
		const celula = criar("td", disponivel ? "celula-sim" : "celula-nao");
		preencherComSimbolo(celula, disponivel ? "✔" : "✘", disponivel ? "Sim" : "Não");
		return celula;
	}

	function mostrarComparacao(levarAte) {
		const secao = el("comparacao");
		const outro = lerRelatorioDoLink();
		if (!outro) {
			secao.hidden = true;
			return;
		}
		secao.hidden = false;
		const linhas = el("comparacao-linhas");
		linhas.replaceChildren();
		const impactos = el("comparacao-impacto");
		impactos.replaceChildren();
		el("comparacao-impacto-bloco").hidden = true;
		if (outro.invalido) {
			el("tabela-comparacao").hidden = true;
			el("comparacao-resumo").textContent = "Este link de comparação está incompleto, foi alterado ou é de outra versão do COMPATIA Check. Gere um novo link no outro aparelho.";
			levarAteComparacao(levarAte);
			return;
		}
		el("tabela-comparacao").hidden = false;
		el("coluna-este").textContent = estado.aparelho.nome + (estado.aparelho.instalado ? " (app instalado)" : "");
		el("coluna-outro").textContent = "Recebido pelo link: " + outro.nome + (outro.instalado ? " (app instalado)" : "") + (outro.data ? ", " + outro.data : "");

		let diferencas = 0;
		VERIFICACOES.forEach(function (verificacao) {
			const aqui = Boolean(estado.resultados[verificacao.id]);
			const la = outro.resultados[verificacao.id];
			const linha = criar("tr", aqui !== la ? "linha-diferente" : "");
			const cabecalho = criar("th", "", verificacao.nome);
			cabecalho.scope = "row";
			linha.appendChild(cabecalho);
			linha.appendChild(celulaResultado(aqui));
			linha.appendChild(celulaResultado(la));
			linhas.appendChild(linha);
			if (aqui !== la) {
				diferencas += 1;
				// o impacto vale para o aparelho em que o recurso não foi detectado, seja este ou o outro
				const semRecurso = aqui ? outro.nome : estado.aparelho.nome;
				const item = criar("li", "");
				item.appendChild(criar("strong", "", verificacao.nome + ", não detectado em " + semRecurso + ": "));
				item.appendChild(document.createTextNode(verificacao.impacto));
				impactos.appendChild(item);
			}
		});
		el("comparacao-impacto-bloco").hidden = diferencas === 0;

		const resumo = el("comparacao-resumo");
		resumo.replaceChildren();
		if (diferencas === 0) {
			resumo.textContent = "As " + VERIFICACOES.length + " verificações deram o mesmo resultado nos dois aparelhos.";
		} else {
			resumo.appendChild(criar("strong", "", diferencas + " de " + VERIFICACOES.length + " verificações"));
			resumo.appendChild(document.createTextNode(" deram resultados diferentes nos dois aparelhos. A mesma PWA pode entregar experiências diferentes: é a fragmentação que a COMPATIA mede."));
		}
		levarAteComparacao(levarAte);
	}

	function levarAteComparacao(levarAte) {
		if (!levarAte) {
			return;
		}
		el("comparacao").scrollIntoView({ behavior: menosMovimento() ? "auto" : "smooth", block: "start" });
		el("comparacao-titulo").focus({ preventScroll: true });
	}

	// ---------- ações ----------

	function abrirPainelLink() {
		if (!estado.concluido) {
			mostrarAviso("Aguarde o fim da verificação.");
			return;
		}
		const painel = el("painel-link");
		const campo = el("link-relatorio");
		campo.value = montarLink();
		painel.hidden = false;
		el("compartilhar-link").hidden = !("share" in navigator);
		campo.focus();
		campo.select();
	}

	async function copiarLink() {
		const campo = el("link-relatorio");
		try {
			await navigator.clipboard.writeText(campo.value);
			mostrarAviso("Link copiado. Abra no outro aparelho para comparar.");
		} catch (erro) {
			campo.select();
			mostrarAviso("Selecione o link e copie com Ctrl+C.");
		}
	}

	async function compartilharLink() {
		try {
			await navigator.share({
				title: "Relatório COMPATIA Check",
				text: "Compare a compatibilidade de PWAs do meu aparelho com o seu:",
				url: el("link-relatorio").value
			});
		} catch (erro) {
			if (erro.name !== "AbortError") {
				mostrarAviso("Não foi possível compartilhar; use o botão Copiar.");
			}
		}
	}

	function fecharComparacao() {
		history.replaceState(null, "", location.pathname + location.search);
		el("comparacao").hidden = true;
		el("comparar").focus();
	}

	function prepararInstalacao() {
		const botao = el("instalar");
		window.addEventListener("beforeinstallprompt", function (evento) {
			evento.preventDefault();
			estado.eventoInstalacao = evento;
			botao.hidden = false;
			botao.disabled = false;
		});
		botao.addEventListener("click", async function () {
			if (!estado.eventoInstalacao) {
				return;
			}
			botao.disabled = true;
			const evento = estado.eventoInstalacao;
			estado.eventoInstalacao = null;
			try {
				await evento.prompt();
				await evento.userChoice;
			} catch (erro) {
				// o navegador recusou mostrar o convite
			}
			botao.hidden = true;
		});
		window.addEventListener("appinstalled", function () {
			mostrarAviso("COMPATIA Check instalado.");
		});
	}

	function registrarServiceWorker() {
		if (!("serviceWorker" in navigator) || !window.isSecureContext) {
			return;
		}
		// quando uma versão nova do app assume o controle, recarrega uma vez para mostrá-la
		// (só se uma versão antiga já controlava a página; na primeira visita, não)
		if (navigator.serviceWorker.controller) {
			let recarregou = false;
			navigator.serviceWorker.addEventListener("controllerchange", function () {
				if (!recarregou) {
					recarregou = true;
					location.reload();
				}
			});
		}
		// updateViaCache "none": a busca por uma versão nova do sw.js ignora o cache HTTP
		estadoSW.registro = navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
		estadoSW.registro.catch(function () {
			// sem service worker, a verificação "Pronto para offline" dá não detectado
		});
	}

	// Numa primeira visita lenta, a instalação pode terminar depois da verificação: confere de novo.
	function reverificarOffline() {
		if (estado.resultados.offline || !estadoSW.registro) {
			return;
		}
		navigator.serviceWorker.ready.then(async function () {
			const verificacao = VERIFICACOES.find(function (item) {
				return item.id === "offline";
			});
			if (await verificarOffline()) {
				marcarResultado(verificacao, true);
				mostrarPlacar();
				mostrarImpacto();
				mostrarComparacao(false);
				if (!el("painel-link").hidden) {
					el("link-relatorio").value = montarLink();
				}
			}
		});
	}

	// ---------- início ----------

	async function iniciar() {
		estado.aparelho = identificarAparelho();
		mostrarAparelho();
		criarCartoes();
		prepararInstalacao();
		registrarServiceWorker();

		el("comparar").addEventListener("click", abrirPainelLink);
		el("copiar-link").addEventListener("click", copiarLink);
		el("compartilhar-link").addEventListener("click", compartilharLink);
		el("imprimir").addEventListener("click", function () {
			window.print();
		});
		el("fechar-comparacao").addEventListener("click", fecharComparacao);
		window.addEventListener("hashchange", function () {
			if (estado.concluido) {
				mostrarComparacao(true);
			}
		});

		await executarVerificacoes();
		mostrarPlacar();
		mostrarImpacto();
		mostrarComparacao(true);
		reverificarOffline();
		await mostrarDetalhes();
	}

	iniciar();
})();
