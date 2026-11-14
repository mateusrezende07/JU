
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
let memoriesLoadId = 0;

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

function getYouTubeVideoId(value) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace("www.", "");
    let videoId = null;

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0];
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(parts[0])) {
          videoId = parts[1];
        }
      }
    }

    return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ? videoId
      : null;
  } catch {
    return null;
  }
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
    await loadCoupleData();
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

  // Impede que carregamentos simultâneos adicionem os mesmos cards mais de uma vez.
  const loadId = ++memoriesLoadId;
  showStatus("Carregando nossas lembranças...");
  memoryGrid.innerHTML = "";

  const { data: memories, error } = await db
    .from("memorias")
    .select("*")
    .order("data_memoria", { ascending: false });

  if (loadId !== memoriesLoadId) return;

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
    if (loadId !== memoriesLoadId) return;
    await renderMemory(memory, loadId);
  }

  if (loadId === memoriesLoadId) showStatus("");
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

async function renderMemory(memory, loadId) {
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

  // Uma sessão/carregada mais recente pode ter começado enquanto buscávamos a foto.
  if (loadId !== memoriesLoadId) return;
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
  const youtubeFrame = document.getElementById("memoryYoutube");
  const audioTip = document.getElementById("audioTip");

  viewPhoto.removeAttribute("src");
  audio.pause();
  audio.removeAttribute("src");
  youtubeFrame.removeAttribute("src");
  youtubeFrame.hidden = true;
  audio.hidden = false;
  audioArea.hidden = true;
  audioTip.textContent = "";

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
    const youtubeId = getYouTubeVideoId(memory.musica_url);

    if (youtubeId) {
      const start = Math.max(0, Number(memory.musica_inicio || 0));
      const end = Math.max(0, Number(memory.musica_fim || 0));
      const params = new URLSearchParams({
        start: String(Math.floor(start)),
        controls: "1",
        rel: "0",
        playsinline: "1"
      });

      if (end > start) params.set("end", String(Math.floor(end)));

      youtubeFrame.src = `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
      youtubeFrame.hidden = false;
      audio.hidden = true;
      audioTip.textContent = "Dê play no vídeo para ouvir a música. O YouTube pode exibir anúncios.";
      audioArea.hidden = false;
    } else if (!memory.musica_url.startsWith("http://") && !memory.musica_url.startsWith("https://")) {
      // Compatibilidade com músicas que já foram enviadas como arquivo ao site.
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
    } else {
      audioTip.textContent = "Esse link não parece ser um endereço válido do YouTube.";
      audioArea.hidden = false;
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
  const musicUrl = document.getElementById("memoryMusicUrl").value.trim();

  const musicStart = Number(document.getElementById("musicStart").value || 0);
  const musicEnd = Number(document.getElementById("musicEnd").value || 0);

  let photoPath = null;
  let memoryId = null;

  try {
    if (!photoFile) {
      throw new Error("Escolha uma foto para essa lembrança.");
    }

    if (musicUrl && !getYouTubeVideoId(musicUrl)) {
      throw new Error("Cole um link válido de vídeo do YouTube.");
    }

    if (musicEnd > 0 && musicEnd <= musicStart) {
      throw new Error("O tempo final da música precisa ser maior que o inicial.");
    }

    // Primeiro, cria o registro da memória.
    const { data: memory, error: memoryError } = await db
      .from("memorias")
      .insert({
        titulo: title,
        descricao: description,
        data_memoria: date || null,
        musica_url: musicUrl || null,
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

    memoryForm.reset();
    addDialog.close();

    await loadMemories();

  } catch (error) {
    console.error("Erro ao salvar memória:", error);

    // Tenta remover arquivos enviados caso alguma etapa falhe.
    const pathsToRemove = [photoPath].filter(Boolean);

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

    if (
      selectedMemory.musica_url &&
      !selectedMemory.musica_url.startsWith("http://") && !selectedMemory.musica_url.startsWith("https://")
    ) {
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

/* CASAL: PRESENTES, ROLÊS E AVALIAÇÕES */
let activeRoleId=null;
const giftListMateus=document.getElementById("giftListMateus"),giftListJulia=document.getElementById("giftListJulia"),roleList=document.getElementById("roleList");
const msg=(id,t)=>{document.getElementById(id).textContent=t||""};
const node=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=txt??"";return e};
async function loadCoupleData(){if(currentUser)await Promise.all([loadGifts(),loadRoles()])}
async function loadGifts(){
 const {data,error}=await db.from("presentes").select("*").order("created_at",{ascending:false});
 if(error){msg("giftStatus","Não carregou. Confira as colunas tipo e destinatario da tabela presentes.");console.error(error);return}
 giftListMateus.replaceChildren();giftListJulia.replaceChildren();
 const mateus=(data||[]).filter(g=>g.destinatario==="Mateus"),julia=(data||[]).filter(g=>g.destinatario==="Júlia");
 if(!mateus.length)giftListMateus.append(node("p","couple-empty","Nenhum presente para o Mateus por enquanto."));
 if(!julia.length)giftListJulia.append(node("p","couple-empty","Nenhum presente para a Júlia por enquanto."));
 (data||[]).forEach(g=>{
  const target=g.destinatario==="Mateus"?giftListMateus:giftListJulia;
  const card=node("article","couple-item gift-item"+(g.comprado?" is-done":"")),main=node("div","couple-item-main");
  main.append(node("small","gift-type",g.tipo||"Presente"),node("strong","",g.nome),node("small","","Adicionado por "+g.cadastrado_por));
  const label=node("label","check-line",""),cb=document.createElement("input");cb.type="checkbox";cb.checked=g.comprado;
  cb.addEventListener("change",async()=>{const {error:e}=await db.from("presentes").update({comprado:cb.checked}).eq("id",g.id);if(e)alert("Não foi possível atualizar.");await loadGifts()});
  label.append(cb,document.createTextNode(" Já compramos"));card.append(main,label);target.append(card)
 });
}
document.getElementById("saveGift").addEventListener("click",async()=>{
 const type=document.getElementById("giftType").value.trim(),name=document.getElementById("giftName").value.trim(),creator=document.getElementById("giftCreator").value,recipient=document.getElementById("giftRecipient").value;
 if(!type||!name){msg("giftStatus","Preencha o tipo e o nome do presente.");return}
 const b=document.getElementById("saveGift");b.disabled=true;
 const {error}=await db.from("presentes").insert({tipo:type,nome:name,destinatario:recipient,cadastrado_por:creator});
 b.disabled=false;
 if(error){msg("giftStatus","Erro ao salvar. Confira se executou o SQL de atualização dos presentes.");console.error(error);return}
 document.getElementById("giftType").value="";document.getElementById("giftName").value="";msg("giftStatus","Presente adicionado ♥");await loadGifts();
});
async function loadRoles(){
 const {data,error}=await db.from("roles").select("*").order("created_at",{ascending:false});
 if(error){msg("roleStatus","Não carregou. Confira o SQL novas-funcoes.sql.");console.error(error);return}
 const placesToGo=document.getElementById("placesToGo"),placesVisited=document.getElementById("placesVisited");
 placesToGo.replaceChildren();placesVisited.replaceChildren();
 const pending=(data||[]).filter(place=>!place.visitado),visited=(data||[]).filter(place=>place.visitado);
 if(!pending.length)placesToGo.append(node("p","couple-empty","Não há lugares pendentes. Que tal escolher o próximo passeio? ♥"));
 if(!visited.length)placesVisited.append(node("p","couple-empty","Vocês ainda não marcaram nenhum lugar como visitado."));
 for(const place of [...pending,...visited]){
  const {data:reviews,error:re}=await db.from("avaliacoes_roles").select("*").eq("role_id",place.id);if(re)console.error(re);
  const card=node("article","role-card"+(place.visitado?" is-done":"")),top=node("div","role-card-top"),main=node("div","couple-item-main");
  main.append(node("strong","",place.nome),node("small","","Adicionado por "+place.cadastrado_por));
  const label=node("label","check-line",""),cb=document.createElement("input");cb.type="checkbox";cb.checked=place.visitado;
  cb.addEventListener("change",async()=>{const {error:e}=await db.from("roles").update({visitado:cb.checked}).eq("id",place.id);if(e)alert("Não foi possível atualizar.");await loadRoles()});
  label.append(cb,document.createTextNode(" Já fomos"));top.append(main,label);card.append(top);
  if(reviews?.length){
   const avg=reviews.reduce((s,r)=>s+Number(r.nota),0)/reviews.length;
   card.append(node("div","role-average","Média do casal: "+avg.toLocaleString("pt-BR",{maximumFractionDigits:1})+"/10"));
   const grid=node("div","review-grid");
   ["Mateus","Júlia"].forEach(p=>{const r=reviews.find(x=>x.pessoa===p),box=node("div","review-person","");box.append(node("b","",p),node("strong","",r?Number(r.nota).toLocaleString("pt-BR")+"/10":"Sem nota"));
    if(r?.comentario)box.append(node("p","",r.comentario));if(r)box.append(node("small","",r.iria_novamente?"Voltaria novamente ♥":"Não voltaria"));grid.append(box)});
   card.append(grid)
  }else if(place.visitado)card.append(node("p","couple-empty","Esse rolê ainda não tem avaliações."));
  if(place.visitado){const b=node("button","add-button","Avaliar / editar minha nota");b.type="button";b.addEventListener("click",()=>openReview(place,reviews||[]));card.append(b)}
  else card.append(node("small","muted-note","Marque como visitado para mover para lugares que já fomos."));
  (place.visitado?placesVisited:placesToGo).append(card)
 }
}
document.getElementById("saveRole").addEventListener("click",async()=>{
 const name=document.getElementById("roleName").value.trim();if(!name){msg("roleStatus","Digite o nome do lugar.");return}
 const b=document.getElementById("saveRole");b.disabled=true;const {error}=await db.from("roles").insert({nome:name,cadastrado_por:document.getElementById("roleCreator").value});b.disabled=false;
 if(error){msg("roleStatus","Erro ao salvar. Confira o SQL novas-funcoes.sql.");console.error(error);return}
 document.getElementById("roleName").value="";msg("roleStatus","Rolê adicionado ♥");await loadRoles()
});
function openReview(place,reviews){activeRoleId=place.id;document.getElementById("reviewHeading").textContent="Como foi: "+place.nome+"?";
 const p=document.getElementById("reviewPerson").value,r=reviews.find(x=>x.pessoa===p);document.getElementById("reviewScore").value=r?.nota??"";
 document.getElementById("reviewComment").value=r?.comentario??"";document.getElementById("reviewAgain").value=String(r?.iria_novamente??true);document.getElementById("reviewDialog").showModal()}
document.getElementById("reviewPerson").addEventListener("change",async()=>{if(!activeRoleId)return;const {data}=await db.from("avaliacoes_roles").select("*").eq("role_id",activeRoleId).eq("pessoa",document.getElementById("reviewPerson").value).maybeSingle();document.getElementById("reviewScore").value=data?.nota??"";document.getElementById("reviewComment").value=data?.comentario??"";document.getElementById("reviewAgain").value=String(data?.iria_novamente??true)});
document.getElementById("reviewForm").addEventListener("submit",async e=>{e.preventDefault();if(!activeRoleId)return;const score=Number(document.getElementById("reviewScore").value),err=document.getElementById("reviewError");
 if(!Number.isFinite(score)||score<0||score>10){err.textContent="A nota deve ser de 0 a 10.";return}
 const payload={role_id:activeRoleId,pessoa:document.getElementById("reviewPerson").value,nota:score,comentario:document.getElementById("reviewComment").value.trim(),iria_novamente:document.getElementById("reviewAgain").value==="true"};
 const {error}=await db.from("avaliacoes_roles").upsert(payload,{onConflict:"role_id,pessoa"});if(error){err.textContent="Não foi possível salvar. Tente novamente.";console.error(error);return}
 document.getElementById("reviewDialog").close();activeRoleId=null;await loadRoles()
});
