const SUPABASE_URL = "https://mcobunhsaqdjsslftmpj.supabase.co";
const SUPABASE_KEY = "sb_publishable_ed_ozJN13sNo_8PLAktKUg_Xph4bq17";
const BUCKET = "memorias";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginPanel = document.getElementById("playlistLogin");
const loginForm = document.getElementById("playlistLoginForm");
const loginButton = document.getElementById("playlistLoginButton");
const loginError = document.getElementById("playlistLoginError");
const content = document.getElementById("playlistContent");
const list = document.getElementById("playlistList");
const status = document.getElementById("playlistStatus");
const count = document.getElementById("playlistCount");
const sortSelect = document.getElementById("playlistSort");
let activeUser = null;
let songs = [];
let renderVersion = 0;

function formatSongDate(value) {
  if (!value) return "Data não informada";
  return new Date(value + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric"
  });
}

function getYouTubeVideoId(value) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace("www.", "");
    let id = null;
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0];
    else if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(parts[0])) id = parts[1];
      }
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function stopOtherPlayers(exceptCard) {
  list.querySelectorAll(".song-card").forEach(card => {
    if (card === exceptCard) return;
    const frame = card.querySelector("iframe");
    if (frame) frame.remove();
    const audio = card.querySelector("audio");
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    const button = card.querySelector(".song-play");
    if (button) button.textContent = "▶ Ouvir música";
  });
}

function makeSongCard(song) {
  const card = document.createElement("article");
  card.className = "song-card";

  const cover = document.createElement("div");
  cover.className = "song-cover";
  const videoId = getYouTubeVideoId(song.musica_url);

  if (videoId) {
    const thumbnail = document.createElement("img");
    thumbnail.src = "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg";
    thumbnail.alt = "Capa do vídeo da música";
    thumbnail.loading = "lazy";
    cover.appendChild(thumbnail);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "song-cover-placeholder";
    placeholder.textContent = "♫";
    cover.appendChild(placeholder);
  }

  const body = document.createElement("div");
  body.className = "song-body";
  const date = document.createElement("span");
  date.className = "song-date";
  date.textContent = formatSongDate(song.data_memoria);
  const title = document.createElement("h2");
  title.textContent = song.titulo || "Uma música da nossa história";
  body.append(date, title);

  if (song.descricao) {
    const description = document.createElement("p");
    description.className = "song-description";
    description.textContent = song.descricao;
    body.appendChild(description);
  }

  const actions = document.createElement("div");
  actions.className = "song-actions";
  const play = document.createElement("button");
  play.type = "button";
  play.className = "song-play";
  play.textContent = "▶ Ouvir música";
  const memory = document.createElement("span");
  memory.className = "song-memory";
  memory.textContent = "Da lembrança: " + (song.titulo || "Sem título");
  actions.append(play, memory);
  body.appendChild(actions);
  card.append(cover, body);

  play.addEventListener("click", async () => {
    stopOtherPlayers(card);
    const existingFrame = cover.querySelector("iframe");
    const existingAudio = cover.querySelector("audio");
    if (existingFrame || (existingAudio && !existingAudio.paused)) {
      if (existingFrame) existingFrame.remove();
      if (existingAudio) { existingAudio.pause(); existingAudio.remove(); }
      play.textContent = "▶ Ouvir música";
      return;
    }

    if (videoId) {
      cover.replaceChildren();
      const frame = document.createElement("iframe");
      const start = Math.max(0, Number(song.musica_inicio || 0));
      const end = Math.max(0, Number(song.musica_fim || 0));
      const params = new URLSearchParams({
        autoplay: "1", start: String(Math.floor(start)),
        controls: "1", rel: "0", playsinline: "1"
      });
      if (end > start) params.set("end", String(Math.floor(end)));
      frame.src = "https://www.youtube.com/embed/" + videoId + "?" + params.toString();
      frame.title = "Música da lembrança " + (song.titulo || "");
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      cover.appendChild(frame);
      play.textContent = "■ Parar música";
    } else if (song.audioUrl) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.autoplay = true;
      audio.src = song.audioUrl;
      audio.addEventListener("loadedmetadata", () => {
        const start = Math.max(0, Number(song.musica_inicio || 0));
        if (start > 0 && start < audio.duration) audio.currentTime = start;
      }, { once: true });
      const end = Math.max(0, Number(song.musica_fim || 0));
      if (end > 0) audio.addEventListener("timeupdate", () => {
        if (audio.currentTime >= end) audio.pause();
      });
      cover.appendChild(audio);
      play.textContent = "■ Parar música";
    } else {
      status.textContent = "Não foi possível abrir esse áudio antigo. Tente atualizar a página.";
    }
  });

  return card;
}

function renderSongs() {
  stopOtherPlayers(null);
  list.replaceChildren();
  const ordered = [...songs].sort((a, b) => {
    const dateA = a.data_memoria || a.criado_em || "";
    const dateB = b.data_memoria || b.criado_em || "";
    return sortSelect.value === "newest"
      ? dateB.localeCompare(dateA)
      : dateA.localeCompare(dateB);
  });

  if (!ordered.length) {
    const empty = document.createElement("div");
    empty.className = "playlist-empty";
    const title = document.createElement("strong");
    title.textContent = "Nossa trilha sonora está esperando…";
    const detail = document.createElement("span");
    detail.textContent = "As músicas aparecerão aqui automaticamente quando estiverem vinculadas às lembranças do álbum.";
    empty.append(title, detail);
    list.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  ordered.forEach(song => fragment.appendChild(makeSongCard(song)));
  list.appendChild(fragment);
}

async function loadSongs() {
  if (!activeUser) return;
  const version = ++renderVersion;
  loginPanel.hidden = true;
  content.hidden = false;
  list.replaceChildren();
  status.textContent = "Reunindo as músicas das nossas lembranças…";

  const { data, error } = await db
    .from("memorias")
    .select("id,titulo,descricao,data_memoria,criado_em,musica_url,musica_inicio,musica_fim")
    .not("musica_url", "is", null)
    .order("data_memoria", { ascending: true, nullsFirst: false });

  if (version !== renderVersion) return;
  if (error) {
    status.textContent = "Não foi possível carregar as músicas. Atualize a página e tente novamente.";
    console.error("Erro ao buscar músicas:", error);
    return;
  }

  const rows = data || [];
  songs = await Promise.all(rows.map(async song => {
    const videoId = getYouTubeVideoId(song.musica_url);
    if (videoId) return { ...song, videoId, audioUrl: null };

    // Músicas antigas enviadas como arquivo também são reaproveitadas.
    if (song.musica_url && !/^https?:\/\//i.test(song.musica_url)) {
      const { data: signed, error: signedError } = await db.storage
        .from(BUCKET).createSignedUrl(song.musica_url, 3600);
      if (!signedError && signed?.signedUrl) return { ...song, audioUrl: signed.signedUrl };
      console.warn("Não foi possível gerar link para áudio antigo:", signedError);
    }
    return { ...song, audioUrl: null };
  }));

  if (version !== renderVersion) return;
  count.textContent = rows.length + (rows.length === 1 ? " música encontrada" : " músicas encontradas") + " nas lembranças ♥";
  count.hidden = false;
  status.textContent = rows.length
    ? "Cada faixa está ligada à lembrança em que foi cadastrada."
    : "Ainda não há músicas cadastradas nas lembranças.";
  renderSongs();
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Entrando…";
  const email = document.getElementById("playlistEmail").value.trim();
  const password = document.getElementById("playlistPassword").value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) loginError.textContent = "Não foi possível entrar. Confira seu e-mail e sua senha.";
  loginButton.disabled = false;
  loginButton.textContent = "Entrar ♥";
  if (!error) loginForm.reset();
});

document.getElementById("playlistLogout").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) status.textContent = "Não foi possível sair. Tente novamente.";
});

sortSelect.addEventListener("change", renderSongs);

db.auth.onAuthStateChange((_event, session) => {
  setTimeout(() => {
    activeUser = session?.user || null;
    if (activeUser) loadSongs();
    else {
      loginPanel.hidden = false;
      content.hidden = true;
      count.hidden = true;
      list.replaceChildren();
    }
  }, 0);
});

(async function initializePlaylist() {
  const { data, error } = await db.auth.getSession();
  if (error) {
    loginError.textContent = "Não foi possível verificar sua sessão. Atualize a página.";
    return;
  }
  activeUser = data.session?.user || null;
  if (activeUser) loadSongs();
  else {
    loginPanel.hidden = false;
    content.hidden = true;
  }
})();
