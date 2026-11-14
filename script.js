
// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================

const SUPABASE_URL = "https://mcobunhsaqdjsslftmpj.supabase.co";
const SUPABASE_KEY = "sb_publishable_ed_ozJN13sNo_8PLAktKUg_Xph4bq17";

const BUCKET = "memorias";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==========================================
// ELEMENTOS DO SITE
// ==========================================

const authPanel = document.getElementById("authPanel");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");

const memoriesSection = document.getElementById("memorias");
const memoryGrid = document.getElementById("memoryGrid");
const statusMessage = document.getElementById("statusMessage");

const addDialog = document.getElementById("addDialog");
const viewDialog = document.getElementById("viewDialog");

const memoryForm = document.getElementById("memoryForm");
const formError = document.getElementById("formError");

const openAddButton = document.getElementById("openAdd");
const logoutButton = document.getElementById("logoutButton");

let currentUser = null;
let selectedMemory = null;
let memoriesCache = [];

// ==========================================
// CONTADOR DO RELACIONAMENTO
// ==========================================

function updateCounter() {
  const startDate = new Date(2024, 2, 13);
  const now = new Date();

  let difference = Math.max(0, now - startDate);

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  document.getElementById("days").textContent = days;
  document.getElementById("hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
  document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
}

updateCounter();
setInterval(updateCounter, 1000);

// ==========================================
// MENSAGENS E FORMATAÇÃO
// ==========================================

function showStatus(message) {
  statusMessage.textContent = message;
}

function formatDate(dateString) {
  if (!dateString) return "Uma lembrança especial";

  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function createStoragePath(file) {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "file";

  return `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
}

function showError(element, message) {
  element.textContent = message;
}

// ==========================================
// LOGIN E SESSÃO
// ==========================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Entrando...";

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showError(loginError, "Não foi possível entrar. Confira seu e-mail e sua senha.");
    loginButton.disabled = false;
    loginButton.textContent = "Entrar ♥";
    return;
  }

  loginForm.reset();
});

async function handleSession(session) {
  currentUser = session?.user || null;

  if (currentUser) {
    authPanel.hidden = true;
    memoriesSection.hidden = false;
    await loadMemories();
  } else {
    authPanel.hidden = false;
    memoriesSection.hidden = true;
    memoryGrid.innerHTML = "";
    memoriesCache = [];
  }

  loginButton.disabled = false;
  loginButton.textContent = "Entrar ♥";
}

db.auth.onAuthStateChange((_event, session) => {
  setTimeout(() => {
    handleSession(session);
  }, 0);
});

async function initializeSite() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    showError(loginError, "Não foi possível verificar sua sessão. Atualize a página.");
    return;
  }

  await handleSession(data.session);
}

logoutButton.addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    showStatus("Não foi possível sair da conta. Tente novamente.");
  }
});

// ==========================================
// CARREGAR MEMÓRIAS DO BANCO
// ==========================================

async function loadMemories() {
  if (!currentUser) return;

  showStatus("Carregando nossas lembranças...");
  memoryGrid.innerHTML = "";

  const { data: memories, error } = await db
    .from("memorias")
    .select("*")
    .order("data_memoria", { ascending: false });

  if (error) {
    showStatus("Não foi possível carregar as lembranças. Confira as permissões do banco.");
    console.error(error);
    return;
  }

  memoriesCache = memories || [];

  if (memoriesCache.length === 0) {
    showEmptyState();
    showStatus("");
    return;
  }

  for (const memory of memoriesCache) {
    await renderMemory(memory);
  }

  showStatus("");
}

function showEmptyState() {
  const empty = document.createElement("div");
  empty.className = "empty-state";

  const icon = document.createElement("div");
  icon.className = "empty-icon";
  icon.textContent = "♡";

  const title = document.createElement("h3");
  title.textContent = "Nosso álbum começa aqui";

  const description = document.createElement("p");
  description.textContent = "Adicione a primeira lembrança de vocês.";

  empty.append(icon, title, description);
  memoryGrid.appendChild(empty);
}

// ==========================================
// MOSTRAR CADA MEMÓRIA
// ==========================================

async function renderMemory(memory) {
  const { data: photos, error } = await db
    .from("fotos")
    .select("*")
    .eq("memoria_id", memory.id)
    .order("criado_em", { ascending: true })
    .limit(1);

  if (error) {
    console.error("Erro ao buscar foto:", error);
  }

  const photo = photos?.[0];

  const card = document.createElement("button");
  card.type = "button";
  card.className = "memory-card";

  const image = document.createElement("img");
  image.alt = memory.titulo || "Nossa lembrança";
  image.loading = "lazy";

  if (photo?.arquivo) {
    const { data: signedImage, error: imageError } = await db
      .storage
      .from(BUCKET)
      .createSignedUrl(photo.arquivo, 3600);

    if (!imageError && signedImage?.signedUrl) {
      image.src = signedImage.signedUrl;
    } else {
      image.alt = "Não foi possível carregar esta foto";
      console.error(imageError);
    }
  }

  const content = document.createElement("div");
  content.className = "memory-card-content";

  const date = document.createElement("span");
  date.className = "memory-date";
  date.textContent = formatDate(memory.data_memoria);

  const title = document.createElement("h3");
  title.textContent = memory.titulo || "Nossa lembrança";

  content.append(date, title);
  card.append(image, content);

  card.addEventListener("click", () => {
    openMemory(memory);
  });

  memoryGrid.appendChild(card);
}

// ==========================================
// ABRIR UMA MEMÓRIA
// ==========================================

async function openMemory(memory) {
  selectedMemory = memory;

  document.getElementById("viewTitle").textContent = memory.titulo || "";
  document.getElementById("viewNote").textContent = memory.descricao || "";
  document.getElementById("viewDate").textContent = formatDate(memory.data_memoria);

  const viewPhoto = document.getElementById("viewPhoto");
  const audioArea = document.getElementById("audioArea");
  const audio = document.getElementById("memoryAudio");

  viewPhoto.removeAttribute("src");
  audio.pause();
  audio.removeAttribute("src");
  audioArea.hidden = true;

  const { data: photos, error: photoError } = await db
    .from("fotos")
    .select("*")
    .eq("memoria_id", memory.id)
    .limit(1);

  if (photoError) {
    console.error(photoError);
  }

  const photo = photos?.[0];

  if (photo?.arquivo) {
    const { data, error } = await db
      .storage
      .from(BUCKET)
      .createSignedUrl(photo.arquivo, 3600);

    if (!error && data?.signedUrl) {
      viewPhoto.src = data.signedUrl;
    }
  }

  if (memory.musica_url) {
    const { data, error } = await db
      .storage
      .from(BUCKET)
      .createSignedUrl(memory.musica_url, 3600);

    if (!error && data?.signedUrl) {
      audio.src = data.signedUrl;
      audioArea.hidden = false;

      audio.onloadedmetadata = () => {
        const start = Number(memory.musica_inicio || 0);
        const end = Number(memory.musica_fim || 0);

        audio.currentTime = Math.min(start, audio.duration || start);

        audio.ontimeupdate = () => {
          if (end > 0 && audio.currentTime >= end) {
            audio.pause();
          }
        };
      };
    } else {
      console.error("Erro ao carregar música:", error);
    }
  }

  viewDialog.showModal();
}

// ==========================================
// ABRIR E FECHAR JANELAS
// ==========================================

openAddButton.addEventListener("click", () => {
  formError.textContent = "";
  memoryForm.reset();

  document.getElementById("memoryDate").value =
    new Date().toISOString().slice(0, 10);

  addDialog.showModal();
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = document.getElementById(button.dataset.close);
    dialog.close();
  });
});

[addDialog, viewDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
});

// ==========================================
// ADICIONAR MEMÓRIA
// ==========================================

memoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showError(formError, "Você precisa entrar novamente.");
    return;
  }

  formError.textContent = "";

  const submitButton = memoryForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Salvando...";

  const title = document.getElementById("memoryTitle").value.trim();
  const description = document.getElementById("memoryNote").value.trim();
  const date = document.getElementById("memoryDate").value;

  const photoFile = document.getElementById("memoryPhoto").files[0];
  const musicFile = document.getElementById("memoryMusic").files[0];

  const musicStart = Number(document.getElementById("musicStart").value || 0);
  const musicEnd = Number(document.getElementById("musicEnd").value || 0);

  let photoPath = null;
  let musicPath = null;
  let memoryId = null;

  try {
    if (!photoFile) {
      throw new Error("Escolha uma foto para essa lembrança.");
    }

    // Primeiro, cria o registro da memória.
    const { data: memory, error: memoryError } = await db
      .from("memorias")
      .insert({
        titulo: title,
        descricao: description,
        data_memoria: date || null,
        musica_inicio: musicStart,
        musica_fim: musicEnd || null
      })
      .select()
      .single();

    if (memoryError) throw memoryError;

    memoryId = memory.id;

    // Envia a foto para o bucket privado.
    photoPath = createStoragePath(photoFile);

    const { error: photoUploadError } = await db
      .storage
      .from(BUCKET)
      .upload(photoPath, photoFile, {
        contentType: photoFile.type,
        upsert: false
      });

    if (photoUploadError) throw photoUploadError;

    // Registra o caminho da foto na tabela fotos.
    const { error: photoInsertError } = await db
      .from("fotos")
      .insert({
        memoria_id: memoryId,
        arquivo: photoPath
      });

    if (photoInsertError) throw photoInsertError;

    // Envia a música, caso tenha sido escolhida.
    if (musicFile) {
      musicPath = createStoragePath(musicFile);

      const { error: musicUploadError } = await db
        .storage
        .from(BUCKET)
        .upload(musicPath, musicFile, {
          contentType: musicFile.type,
          upsert: false
        });

      if (musicUploadError) throw musicUploadError;

      const { error: musicUpdateError } = await db
        .from("memorias")
        .update({ musica_url: musicPath })
        .eq("id", memoryId);

      if (musicUpdateError) throw musicUpdateError;
    }

    memoryForm.reset();
    addDialog.close();

    await loadMemories();

  } catch (error) {
    console.error("Erro ao salvar memória:", error);

    // Tenta remover arquivos enviados caso alguma etapa falhe.
    const pathsToRemove = [photoPath, musicPath].filter(Boolean);

    if (pathsToRemove.length > 0) {
      await db.storage.from(BUCKET).remove(pathsToRemove);
    }

    if (memoryId) {
      await db.from("fotos").delete().eq("memoria_id", memoryId);
      await db.from("memorias").delete().eq("id", memoryId);
    }

    showError(
      formError,
      error.message || "Não foi possível salvar. Tente novamente."
    );

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Salvar essa memória ♥";
  }
});

// ==========================================
// EXCLUIR MEMÓRIA
// ==========================================

document.getElementById("deleteMemory").addEventListener("click", async () => {
  if (!selectedMemory) return;

  const confirmed = confirm(
    "Tem certeza de que deseja excluir esta lembrança? Essa ação não pode ser desfeita."
  );

  if (!confirmed) return;

  const deleteButton = document.getElementById("deleteMemory");
  deleteButton.disabled = true;
  deleteButton.textContent = "Excluindo...";

  try {
    const memoryId = selectedMemory.id;

    const { data: photos, error: photosError } = await db
      .from("fotos")
      .select("arquivo")
      .eq("memoria_id", memoryId);

    if (photosError) throw photosError;

    const paths = (photos || [])
      .map((photo) => photo.arquivo)
      .filter(Boolean);

    if (selectedMemory.musica_url) {
      paths.push(selectedMemory.musica_url);
    }

    if (paths.length > 0) {
      const { error: storageError } = await db
        .storage
        .from(BUCKET)
        .remove(paths);

      if (storageError) throw storageError;
    }

    const { error: deletePhotosError } = await db
      .from("fotos")
      .delete()
      .eq("memoria_id", memoryId);

    if (deletePhotosError) throw deletePhotosError;

    const { error: deleteMemoryError } = await db
      .from("memorias")
      .delete()
      .eq("id", memoryId);

    if (deleteMemoryError) throw deleteMemoryError;

    viewDialog.close();
    selectedMemory = null;

    await loadMemories();

  } catch (error) {
    console.error("Erro ao excluir:", error);
    alert("Não foi possível excluir a lembrança. Tente novamente.");

  } finally {
    deleteButton.disabled = false;
    deleteButton.textContent = "Excluir esta lembrança";
  }
});

// ==========================================
// INICIAR
// ==========================================

initializeSite();
