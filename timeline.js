const SUPABASE_URL = "https://mcobunhsaqdjsslftmpj.supabase.co";
const SUPABASE_KEY = "sb_publishable_ed_ozJN13sNo_8PLAktKUg_Xph4bq17";
const BUCKET = "memorias";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginPanel = document.getElementById("timelineLogin");
const loginForm = document.getElementById("timelineLoginForm");
const loginButton = document.getElementById("timelineLoginButton");
const loginError = document.getElementById("timelineLoginError");
const content = document.getElementById("timelineContent");
const list = document.getElementById("timelineList");
const status = document.getElementById("timelineStatus");
const summary = document.getElementById("timelineSummary");
let activeUser = null;
let renderVersion = 0;

function formatTimelineDate(value) {
  if (!value) return "Data não informada";
  const date = new Date(value + "T12:00:00");
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function escapeText(value) {
  return String(value ?? "");
}

function showLoggedOut() {
  loginPanel.hidden = false;
  content.hidden = true;
  summary.hidden = true;
  list.replaceChildren();
}

async function loadTimeline() {
  if (!activeUser) return;
  const version = ++renderVersion;
  loginPanel.hidden = true;
  content.hidden = false;
  list.replaceChildren();
  status.textContent = "Reunindo nossas lembranças…";

  const { data: memories, error } = await db
    .from("memorias")
    .select("id,titulo,descricao,data_memoria,criado_em")
    .order("data_memoria", { ascending: true, nullsFirst: false });

  if (version !== renderVersion) return;
  if (error) {
    status.textContent = "Não foi possível carregar a linha do tempo. Atualize a página e tente novamente.";
    console.error("Erro ao buscar memórias:", error);
    return;
  }

  const rows = memories || [];
  if (!rows.length) {
    summary.hidden = true;
    list.innerHTML = '<div class="timeline-empty"><strong>A nossa história está começando…</strong>Quando vocês adicionarem lembranças ao álbum, elas aparecerão aqui automaticamente. ♥</div>';
    status.textContent = "";
    return;
  }

  const ids = rows.map(item => item.id);
  const { data: photos, error: photosError } = await db
    .from("fotos")
    .select("id,memoria_id,arquivo,criado_em")
    .in("memoria_id", ids)
    .order("criado_em", { ascending: true });

  if (version !== renderVersion) return;
  if (photosError) console.error("Erro ao buscar fotos da linha do tempo:", photosError);

  const firstPhotoByMemory = new Map();
  for (const photo of photos || []) {
    if (!firstPhotoByMemory.has(photo.memoria_id)) firstPhotoByMemory.set(photo.memoria_id, photo);
  }

  const entries = await Promise.all(rows.map(async (memory, index) => {
    const photo = firstPhotoByMemory.get(memory.id);
    let imageUrl = "";
    if (photo?.arquivo) {
      const { data, error: signedError } = await db.storage.from(BUCKET).createSignedUrl(photo.arquivo, 3600);
      if (!signedError && data?.signedUrl) imageUrl = data.signedUrl;
      else console.error("Não foi possível gerar o link da foto:", signedError);
    }
    return { memory, imageUrl, index };
  }));

  if (version !== renderVersion) return;

  const fragment = document.createDocumentFragment();
  entries.forEach(({ memory, imageUrl }, index) => {
    const article = document.createElement("article");
    article.className = "timeline-entry";

    const card = document.createElement("div");
    card.className = "timeline-card";

    if (imageUrl) {
      const image = document.createElement("img");
      image.className = "timeline-photo";
      image.src = imageUrl;
      image.alt = escapeText(memory.titulo || "Foto de uma lembrança");
      image.loading = "lazy";
      card.appendChild(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "timeline-photo-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = "♡";
      card.appendChild(placeholder);
    }

    const body = document.createElement("div");
    body.className = "timeline-card-body";
    const date = document.createElement("span");
    date.className = "timeline-date";
    date.textContent = formatTimelineDate(memory.data_memoria);
    const title = document.createElement("h2");
    title.textContent = escapeText(memory.titulo || "Uma lembrança nossa");
    body.append(date, title);

    if (memory.descricao) {
      const description = document.createElement("p");
      description.textContent = escapeText(memory.descricao);
      body.appendChild(description);
    }

    const number = document.createElement("small");
    number.className = "timeline-number";
    number.textContent = "CAPÍTULO " + String(index + 1).padStart(2, "0");
    body.appendChild(number);
    card.appendChild(body);
    article.appendChild(card);
    fragment.appendChild(article);
  });

  list.replaceChildren(fragment);
  summary.textContent = rows.length + (rows.length === 1 ? " lembrança reunida" : " lembranças reunidas") + " na nossa história ♥";
  summary.hidden = false;
  status.textContent = "Do primeiro registro ao mais recente.";
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Entrando…";
  const email = document.getElementById("timelineEmail").value.trim();
  const password = document.getElementById("timelinePassword").value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) loginError.textContent = "Não foi possível entrar. Confira seu e-mail e sua senha.";
  loginButton.disabled = false;
  loginButton.textContent = "Entrar ♥";
  if (!error) loginForm.reset();
});

document.getElementById("timelineLogout").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) status.textContent = "Não foi possível sair. Tente novamente.";
});

db.auth.onAuthStateChange((_event, session) => {
  setTimeout(() => {
    activeUser = session?.user || null;
    if (activeUser) loadTimeline();
    else showLoggedOut();
  }, 0);
});

(async function initializeTimeline() {
  const { data, error } = await db.auth.getSession();
  if (error) {
    loginError.textContent = "Não foi possível verificar sua sessão. Atualize a página.";
    return;
  }
  activeUser = data.session?.user || null;
  if (activeUser) loadTimeline();
  else showLoggedOut();
})();