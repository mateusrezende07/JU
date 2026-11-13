const DATA_INICIO = new Date(2024, 2, 13, 0, 0, 0);
const $ = (seletor) => document.querySelector(seletor);

const DB_NAME = "JuliaEMateusMemorias";
const STORE = "memorias";
let db;
let memoriaAberta = null;

/* CONTADOR */
function atualizarContador() {
  let total = Math.max(0, Math.floor((Date.now() - DATA_INICIO.getTime()) / 1000));
  const dias = Math.floor(total / 86400); total %= 86400;
  const horas = Math.floor(total / 3600); total %= 3600;
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;

  $("#days").textContent = dias.toLocaleString("pt-BR");
  $("#hours").textContent = String(horas).padStart(2, "0");
  $("#minutes").textContent = String(minutos).padStart(2, "0");
  $("#seconds").textContent = String(segundos).padStart(2, "0");
}

/* BANCO ORIGINAL: mesmo nome, mesma store e chave id.
   Não apaga nem recria os dados existentes. */
function abrirBanco() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const banco = request.result;
      if (!banco.objectStoreNames.contains(STORE)) {
        banco.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

function operacaoBanco(modo, metodo, valor) {
  return new Promise((resolve, reject) => {
    try {
      const transacao = db.transaction(STORE, modo);
      const loja = transacao.objectStore(STORE);
      const req = valor === undefined ? loja[metodo]() : loja[metodo](valor);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      transacao.onerror = () => reject(transacao.error);
    } catch (erro) {
      reject(erro);
    }
  });
}

function gerarId() {
  if (window.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function dataBonita(valor) {
  if (!valor) return "UMA DATA ESPECIAL";
  return new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric"
  });
}

function escapar(texto = "") {
  return String(texto).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
}

/* YOUTUBE */
function extrairIdYoutube(link) {
  try {
    const url = new URL(link.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let id = "";

    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v") || "";
      } else {
        const partes = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(partes[0]) && partes[1]) {
          id = partes[1];
        }
      }
    } else {
      return null;
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function urlIncorporacaoYoutube(videoId, inicio, fim) {
  const params = new URLSearchParams({
    playsinline: "1",
    controls: "1",
    rel: "0",
    autoplay: "1"
  });

  if (inicio > 0) params.set("start", String(inicio));
  if (fim !== null && fim > inicio) params.set("end", String(fim));
  if (location.protocol === "http:" || location.protocol === "https:") {
    params.set("origin", location.origin);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function pararPlayer() {
  const player = $("#youtubePlayer");
  player.src = "about:blank";
  $("#audioArea").hidden = true;
}

/* GALERIA */
async function carregarMemorias() {
  const grid = $("#memoryGrid");
  grid.querySelectorAll(".memory-card").forEach(card => card.remove());

  const memorias = await operacaoBanco("readonly", "getAll");
  memorias.sort((a, b) =>
    (b.data || "").localeCompare(a.data || "") ||
    (Number(b.criadaEm) || 0) - (Number(a.criadaEm) || 0)
  );

  $("#emptyState").hidden = memorias.length > 0;

  memorias.forEach(memoria => {
    const card = document.createElement("article");
    card.className = "memory-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Abrir memória ${memoria.titulo}`);

    const urlFoto = URL.createObjectURL(memoria.foto);
    card.innerHTML = `
      <div class="memory-thumb">
        <img src="${urlFoto}" alt="${escapar(memoria.titulo)}">
      </div>
      <div class="memory-info">
        <span class="memory-date">${escapar(dataBonita(memoria.data))}</span>
        <h3>${escapar(memoria.titulo)}</h3>
        <p>${escapar(memoria.descricao || "Uma lembrança para guardar com carinho.")}</p>
        <div class="memory-meta">♫ tem uma música especial</div>
      </div>`;

    card.addEventListener("click", () => abrirMemoria(memoria));
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrirMemoria(memoria);
      }
    });
    card.querySelector("img").addEventListener("load", () => URL.revokeObjectURL(urlFoto), { once: true });
    card.querySelector("img").addEventListener("error", () => URL.revokeObjectURL(urlFoto), { once: true });

    grid.appendChild(card);
  });
}

/* ABRIR MEMÓRIA */
function abrirMemoria(memoria) {
  memoriaAberta = memoria.id;
  pararPlayer();

  const fotoUrl = URL.createObjectURL(memoria.foto);
  $("#viewPhoto").src = fotoUrl;
  $("#viewPhoto").alt = memoria.titulo;
  $("#viewPhoto").onload = () => URL.revokeObjectURL(fotoUrl);

  $("#viewDate").textContent = dataBonita(memoria.data);
  $("#viewTitle").textContent = memoria.titulo;
  $("#viewNote").textContent = memoria.descricao || "";

  const videoId = extrairIdYoutube(memoria.linkYoutube || "");

  if (videoId) {
    const inicio = Math.max(0, Number(memoria.inicioMusica) || 0);
    const fimTexto = memoria.fimMusica;
    const fim = fimTexto === null || fimTexto === "" || fimTexto === undefined
      ? null
      : Number(fimTexto);

    $("#audioName").textContent = "A música dessa lembrança";
    $("#audioTip").textContent =
      `O trecho começa em ${inicio} segundos` +
      (fim !== null ? ` e termina em ${fim} segundos.` : ".");

    $("#youtubePlayer").src = urlIncorporacaoYoutube(videoId, inicio, fim);
    $("#audioArea").hidden = false;
  }

  $("#viewDialog").showModal();
}

/* MODAIS */
function fecharDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog && dialog.open) dialog.close();
}

function abrirCadastro() {
  $("#memoryForm").reset();

  const hoje = new Date();
  $("#memoryDate").value =
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  $("#musicStart").value = "0";
  $("#formError").textContent = "";
  $("#addDialog").showModal();
}

$("#openAdd").addEventListener("click", abrirCadastro);
$("#emptyAdd").addEventListener("click", abrirCadastro);

document.querySelectorAll("[data-close]").forEach(botao => {
  botao.addEventListener("click", () => fecharDialog(botao.dataset.close));
});

[$("#addDialog"), $("#viewDialog")].forEach(dialog => {
  dialog.addEventListener("click", e => {
    if (e.target === dialog) dialog.close();
  });
});

$("#viewDialog").addEventListener("close", pararPlayer);

/* SALVAR */
$("#memoryForm").addEventListener("submit", async e => {
  e.preventDefault();

  const foto = $("#memoryPhoto").files[0];
  const linkYoutube = $("#youtubeLink").value.trim();
  const inicio = Number($("#musicStart").value || 0);
  const fimTexto = $("#musicEnd").value.trim();
  const fim = fimTexto === "" ? null : Number(fimTexto);
  const erro = $("#formError");
  const botao = $("#saveMemoryButton");

  erro.textContent = "";

  if (!foto || !foto.type.startsWith("image/")) {
    erro.textContent = "Escolha uma foto válida para essa memória.";
    return;
  }

  if (!extrairIdYoutube(linkYoutube)) {
    erro.textContent = "Cole um link válido do YouTube.";
    return;
  }

  if (!Number.isInteger(inicio) || inicio < 0) {
    erro.textContent = "O início precisa ser um número inteiro igual ou maior que zero.";
    return;
  }

  if (fim !== null && (!Number.isInteger(fim) || fim <= inicio)) {
    erro.textContent = "O tempo final precisa ser maior que o inicial.";
    return;
  }

  const memoria = {
    id: gerarId(),
    titulo: $("#memoryTitle").value.trim(),
    descricao: $("#memoryNote").value.trim(),
    data: $("#memoryDate").value,
    foto,
    linkYoutube,
    inicioMusica: inicio,
    fimMusica: fim,
    criadaEm: Date.now()
  };

  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    await operacaoBanco("readwrite", "add", memoria);
    fecharDialog("addDialog");
    await carregarMemorias();
  } catch (err) {
    console.error("Erro ao salvar memória:", err);
    erro.textContent = "Não foi possível salvar. Tente uma foto menor ou confira o armazenamento do navegador.";
  } finally {
    botao.disabled = false;
    botao.textContent = "Salvar essa memória ♥";
  }
});

/* EXCLUIR */
$("#deleteMemory").addEventListener("click", async () => {
  if (memoriaAberta === null) return;
  if (!confirm("Tem certeza de que deseja excluir esta memória?")) return;

  try {
    pararPlayer();
    await operacaoBanco("readwrite", "delete", memoriaAberta);
    fecharDialog("viewDialog");
    memoriaAberta = null;
    await carregarMemorias();
  } catch (err) {
    console.error(err);
    alert("Não foi possível excluir esta memória.");
  }
});

/* CORAÇÕES */
const camada = $(".ambient-hearts");

function criarCoracao() {
  const coracao = document.createElement("span");
  coracao.className = "floating-heart";
  coracao.textContent = Math.random() > .5 ? "♥" : "♡";
  coracao.style.left = `${Math.random() * 100}%`;
  coracao.style.fontSize = `${10 + Math.random() * 17}px`;

  const duracao = 11 + Math.random() * 12;
  coracao.style.animationDuration = `${duracao}s`;
  camada.appendChild(coracao);

  setTimeout(() => coracao.remove(), duracao * 1000);
}

/* INICIALIZAÇÃO */
async function iniciar() {
  atualizarContador();
  setInterval(atualizarContador, 1000);
  setInterval(criarCoracao, 1500);

  for (let i = 0; i < 7; i++) {
    setTimeout(criarCoracao, i * 450);
  }

  try {
    db = await abrirBanco();
    await carregarMemorias();
  } catch (erro) {
    console.error("Erro ao iniciar o banco:", erro);
    $("#emptyState").querySelector("p").textContent =
      "Não foi possível acessar o armazenamento local. Abra em um navegador atualizado.";
  }
}

iniciar();
