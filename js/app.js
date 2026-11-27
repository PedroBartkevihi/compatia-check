// app.js — interface do COMPATIA Check: identifica o aparelho, roda as verificações,
// mostra o relatório e compara com o relatório de outro aparelho recebido pelo link (#comparar=...).
// Autor: Pedro Farias

(function () {
	"use strict";

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

	function mostrarAviso(texto) {
		const aviso = el("aviso");
		aviso.textContent = texto;
		aviso.classList.add("visivel");
		clearTimeout(mostrarAviso.timer);
		mostrarAviso.timer = setTimeout(function () {
			aviso.classList.remove("visivel");
		}, 3500);
	}

	// ---------- aparelho ----------

	function identificarAparelho() {
		const ua = navigator.userAgent;
		const regras = [
			[/EdgiOS\/(\d+)/, "Edge"],
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
			cabecalho.appendChild(criar("span", "categoria-placar", ""));
			cabecalho.lastChild.id = "placar-" + categoria.id;
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
		item.classList.remove("pendente");
		item.classList.add(disponivel ? "disponivel" : "indisponivel");
		item.querySelector(".selo").textContent = disponivel ? "✔ Disponível" : "✘ Indisponível";
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
		let nivel = "suporte limitado a PWAs";
		if (proporcao >= 0.85) {
			nivel = "ótimo para PWAs";
		} else if (proporcao >= 0.55) {
			nivel = "bom, com lacunas";
		}
		el("placar-texto").textContent = "recursos de PWA disponíveis · " + nivel;

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
			lista.appendChild(criar("li", "impacto-ok", "Nenhuma limitação nos " + VERIFICACOES.length + " recursos verificados."));
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
			["Navegador", estado.aparelho.versao ? estado.aparelho.navegador + " " + estado.aparelho.versao : estado.aparelho.navegador],
			["Sistema", estado.aparelho.sistema],
			["Motor de renderização", estado.aparelho.motor],
			["Modo de exibição", estado.aparelho.instalado ? "app instalado (standalone)" : "aba do navegador"],
			["Data da verificação", new Date().toLocaleDateString("pt-BR")]
		];
		if (navigator.storage && navigator.storage.estimate) {
			try {
				const estimativa = await navigator.storage.estimate();
				if (estimativa.quota) {
					const gigas = estimativa.quota / (1024 * 1024 * 1024);
					linhas.push(["Espaço disponível para o app", gigas >= 1 ? "cerca de " + gigas.toFixed(1).replace(".", ",") + " GB" : "cerca de " + Math.round(gigas * 1024) + " MB"]);
				}
			} catch (erro) {
				// sem estimativa de espaço neste navegador
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

	function montarLink() {
		const dados = {
			v: VERSAO_VERIFICACOES,
			a: estado.aparelho.nome,
			d: new Date().toISOString().slice(0, 10),
			r: VERIFICACOES.map(function (verificacao) {
				return estado.resultados[verificacao.id] ? "1" : "0";
			}).join("")
		};
		return location.origin + location.pathname + "#comparar=" + paraBase64Url(JSON.stringify(dados));
	}

	// O link vem de outra pessoa: valida tudo e só usa textContent ao mostrar.
	function lerRelatorioDoLink() {
		const achado = location.hash.match(/^#comparar=([A-Za-z0-9_-]+)$/);
		if (!achado) {
			return null;
		}
		try {
			const dados = JSON.parse(deBase64Url(achado[1]));
			if (dados.v !== VERSAO_VERIFICACOES || typeof dados.r !== "string" || !/^[01]+$/.test(dados.r) || dados.r.length !== VERIFICACOES.length) {
				return { invalido: true };
			}
			const resultados = {};
			VERIFICACOES.forEach(function (verificacao, indice) {
				resultados[verificacao.id] = dados.r[indice] === "1";
			});
			const data = /^\d{4}-\d{2}-\d{2}$/.test(dados.d) ? dados.d.split("-").reverse().join("/") : "";
			return {
				nome: String(dados.a || "Outro aparelho").slice(0, 60),
				data: data,
				resultados: resultados
			};
		} catch (erro) {
			return { invalido: true };
		}
	}

	function celulaResultado(disponivel) {
		const celula = criar("td", disponivel ? "celula-sim" : "celula-nao", disponivel ? "✔ Sim" : "✘ Não");
		return celula;
	}

	function mostrarComparacao() {
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
			el("comparacao-resumo").textContent = "Este link de comparação é de outra versão do COMPATIA Check ou está incompleto. Gere um novo link no outro aparelho.";
			return;
		}
		el("coluna-este").textContent = estado.aparelho.nome;
		el("coluna-outro").textContent = outro.nome + (outro.data ? " (" + outro.data + ")" : "");

		let diferencas = 0;
		VERIFICACOES.forEach(function (verificacao) {
			const aqui = Boolean(estado.resultados[verificacao.id]);
			const la = outro.resultados[verificacao.id];
			const linha = criar("tr", aqui !== la ? "linha-diferente" : "");
			linha.appendChild(criar("th", "", verificacao.nome));
			linha.lastChild.scope = "row";
			linha.appendChild(celulaResultado(aqui));
			linha.appendChild(celulaResultado(la));
			linhas.appendChild(linha);
			if (aqui !== la) {
				diferencas += 1;
				// o impacto vale para o aparelho que não tem o recurso, seja este ou o outro
				const semRecurso = aqui ? outro.nome : estado.aparelho.nome;
				const item = criar("li", "");
				item.appendChild(criar("strong", "", verificacao.nome + ", falta em " + semRecurso + ": "));
				item.appendChild(document.createTextNode(verificacao.impacto));
				impactos.appendChild(item);
			}
		});
		el("comparacao-impacto-bloco").hidden = diferencas === 0;

		const resumo = el("comparacao-resumo");
		resumo.replaceChildren();
		if (diferencas === 0) {
			resumo.textContent = "Os dois aparelhos têm o mesmo resultado nos " + VERIFICACOES.length + " recursos verificados.";
		} else {
			resumo.appendChild(criar("strong", "", diferencas + " de " + VERIFICACOES.length + " recursos"));
			resumo.appendChild(document.createTextNode(" funcionam de um jeito num aparelho e de outro no segundo. A mesma PWA entrega experiências diferentes: é a fragmentação que a COMPATIA mede."));
		}
		secao.scrollIntoView({ behavior: "smooth", block: "start" });
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
	}

	function prepararInstalacao() {
		const botao = el("instalar");
		window.addEventListener("beforeinstallprompt", function (evento) {
			evento.preventDefault();
			estado.eventoInstalacao = evento;
			botao.hidden = false;
		});
		botao.addEventListener("click", async function () {
			if (!estado.eventoInstalacao) {
				return;
			}
			estado.eventoInstalacao.prompt();
			await estado.eventoInstalacao.userChoice;
			estado.eventoInstalacao = null;
			botao.hidden = true;
		});
		window.addEventListener("appinstalled", function () {
			mostrarAviso("COMPATIA Check instalado.");
		});
	}

	function registrarServiceWorker() {
		if ("serviceWorker" in navigator && window.isSecureContext) {
			navigator.serviceWorker.register("./sw.js").catch(function () {
				// sem service worker, a verificação "Pronto para offline" dá indisponível
			});
		}
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
				mostrarComparacao();
			}
		});

		await executarVerificacoes();
		mostrarPlacar();
		mostrarImpacto();
		mostrarComparacao();
		await mostrarDetalhes();
	}

	iniciar();
})();
