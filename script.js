// CONFIGURAÇÃO: coloque aqui a URL e a chave anon/public do seu projeto Supabase.
const SUPABASE_URL = "COLE_A_URL_DO_PROJETO";
const SUPABASE_ANON_KEY = "COLE_A_CHAVE_ANON_PUBLICA";
const BUCKET = "memory-photos";
const DATA_INICIO = new Date(2024, 2, 13, 0, 0, 0);
const $ = s => document.querySelector(s);
const supabasePronto = SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.startsWith("COLE_");
const sb = supabasePronto ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let memoriaAberta = null, audioUrl = null, fotoUrl = null, memoriasAtuais = [];

function status(msg, erro=false){ const el=$("#statusMessage"); if(el){el.textContent=msg;el.classList.toggle("error",erro);} }
function atualizarContador(){
 let t=Math.max(0,Math.floor((Date.now()-DATA_INICIO.getTime())/1000));
 const d=Math.floor(t/86400);t%=86400;const h=Math.floor(t/3600);t%=3600;const m=Math.floor(t/60);const s=t%60;
 $("#days").textContent=d.toLocaleString("pt-BR");$("#hours").textContent=String(h).padStart(2,"0");$("#minutes").textContent=String(m).padStart(2,"0");$("#seconds").textContent=String(s).padStart(2,"0");
}
function dataBonita(v){return v?new Date(v+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"}):"UMA DATA ESPECIAL";}
function escapar(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function caminhoArquivo(id, tipo, arquivo){const ext=(arquivo.name.split(".").pop()||"bin").replace(/[^a-z0-9]/gi,"").toLowerCase();return `${id}/${tipo}.${ext}`;}
async function uploadArquivo(file,path){const {error}=await sb.storage.from(BUCKET).upload(path,file,{upsert:true,cacheControl:"3600"});if(error)throw error;return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;}
async function carregarMemorias(){
 const grid=$("#memoryGrid");grid.querySelectorAll(".memory-card").forEach(x=>x.remove());
 const {data,error}=await sb.from("memories").select("*").order("memory_date",{ascending:false}).order("created_at",{ascending:false});
 if(error)throw error;memoriasAtuais=data||[];$("#emptyState").hidden=memoriasAtuais.length>0;
 memoriasAtuais.forEach(mem=>{
  const card=document.createElement("article");card.className="memory-card";card.tabIndex=0;card.setAttribute("role","button");
  card.setAttribute("aria-label",`Abrir memória ${mem.title}`);
  card.innerHTML=`<div class="memory-thumb"><img loading="lazy" src="${escapar(mem.photo_url)}" alt="${escapar(mem.title)}"></div><div class="memory-info"><span class="memory-date">${escapar(dataBonita(mem.memory_date))}</span><h3>${escapar(mem.title)}</h3><p>${escapar(mem.description||"Uma lembrança para guardar com carinho.")}</p><div class="memory-meta">${mem.music_url?"♫ tem uma música especial":"♡ guardado no nosso álbum"}</div></div>`;
  card.addEventListener("click",()=>abrirMemoria(mem));card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();abrirMemoria(mem);}});
  grid.appendChild(card);
 });
}
function abrirMemoria(mem){
 memoriaAberta=mem;$("#viewPhoto").src=mem.photo_url;$("#viewPhoto").alt=mem.title;
 $("#viewDate").textContent=dataBonita(mem.memory_date);$("#viewTitle").textContent=mem.title;$("#viewNote").textContent=mem.description||"";
 const audio=$("#memoryAudio");audio.pause();audio.removeAttribute("src");audio.load();
 if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;}
 if(mem.music_url){
  audio.src=mem.music_url;$("#audioArea").hidden=false;$("#audioName").textContent=mem.music_name||"A música dessa lembrança";
  const inicio=Math.max(0,Number(mem.music_start)||0),fim=mem.music_end===null?null:Number(mem.music_end);
  $("#audioTip").textContent=`Trecho: ${inicio}s${fim!==null?` até ${fim}s`:" até o final"}. Aperte play para ouvir.`;
  audio.onloadedmetadata=()=>{if(inicio>0&&inicio<audio.duration)audio.currentTime=inicio;};
  audio.ontimeupdate=()=>{if(fim!==null&&fim>inicio&&audio.currentTime>=fim){audio.pause();audio.currentTime=inicio;}};
 }else{$("#audioArea").hidden=true;audio.onloadedmetadata=null;audio.ontimeupdate=null;}
 $("#deleteMemory").hidden=!sb.auth.getSession || !window.usuarioAdmin;
 $("#viewDialog").showModal();
}
function fecharDialog(id){const d=document.getElementById(id);if(d.open)d.close();}
function abrirCadastro(){
 $("#memoryForm").reset();const n=new Date();$("#memoryDate").value=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
 $("#formError").textContent="";$("#addDialog").showModal();
}
window.usuarioAdmin=false;
async function atualizarAcesso(){
 const {data}=await sb.auth.getSession();window.usuarioAdmin=!!data.session;
 $("#loginButton").hidden=window.usuarioAdmin;$("#logoutButton").hidden=!window.usuarioAdmin;
 $("#openAdd").hidden=!window.usuarioAdmin;$("#importLocal").hidden=!window.usuarioAdmin;
 if(memoriaAberta)$("#deleteMemory").hidden=!window.usuarioAdmin;
}
$("#loginButton").addEventListener("click",()=>{$("#loginError").textContent="";$("#loginDialog").showModal();});
$("#loginForm").addEventListener("submit",async e=>{
 e.preventDefault();$("#loginError").textContent="";
 const {error}=await sb.auth.signInWithPassword({email:$("#loginEmail").value.trim(),password:$("#loginPassword").value});
 if(error){$("#loginError").textContent="Não foi possível entrar. Confira e-mail e senha.";return;}
 fecharDialog("loginDialog");await atualizarAcesso();status("Você entrou na área de edição. ♥");
});
$("#logoutButton").addEventListener("click",async()=>{await sb.auth.signOut();await atualizarAcesso();status("Você saiu da área de edição.");});
$("#openAdd").addEventListener("click",abrirCadastro);
$("#emptyAdd")?.addEventListener("click",abrirCadastro);
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>fecharDialog(b.dataset.close)));
[$("#addDialog"),$("#viewDialog"),$("#loginDialog")].forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close();}));
$("#memoryForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!window.usuarioAdmin){$("#formError").textContent="Entre como administrador para salvar.";return;}
 const foto=$("#memoryPhoto").files[0],musica=$("#memoryMusic").files[0],inicio=Math.max(0,Number($("#musicStart").value)||0),fimTxt=$("#musicEnd").value.trim(),fim=fimTxt===""?null:Number(fimTxt),erro=$("#formError");erro.textContent="";
 if(!foto){erro.textContent="Escolha uma foto.";return;}if(fim!==null&&fim<=inicio){erro.textContent="O tempo final precisa ser maior que o inicial.";return;}
 const id=crypto.randomUUID();
 try{
  status("Enviando a lembrança para a nuvem…");
  const photoPath=caminhoArquivo(id,"foto",foto),photoUrl=await uploadArquivo(foto,photoPath);
  let musicPath=null,musicUrl=null;if(musica){musicPath=caminhoArquivo(id,"musica",musica);musicUrl=await uploadArquivo(musica,musicPath);}
  const payload={id,title:$("#memoryTitle").value.trim(),description:$("#memoryNote").value.trim(),memory_date:$("#memoryDate").value||null,photo_path:photoPath,photo_url:photoUrl,music_path:musicPath,music_url:musicUrl,music_name:musica?.name||null,music_start:inicio,music_end:fim};
  const {error}=await sb.from("memories").insert(payload);if(error)throw error;
  fecharDialog("addDialog");await carregarMemorias();status("Lembrança salva! Agora ela também aparece quando a Júlia abrir o link. ♥");
 }catch(err){console.error(err);erro.textContent="Não foi possível salvar. Confira a conexão e as configurações do Supabase.";status("Falha ao salvar a lembrança.",true);}
});
$("#deleteMemory").addEventListener("click",async()=>{
 if(!memoriaAberta||!window.usuarioAdmin||!confirm("Tem certeza de que deseja excluir esta memória?"))return;
 try{
  $("#memoryAudio").pause();const paths=[memoriaAberta.photo_path,memoriaAberta.music_path].filter(Boolean);
  const {error}=await sb.from("memories").delete().eq("id",memoriaAberta.id);if(error)throw error;
  if(paths.length)await sb.storage.from(BUCKET).remove(paths);
  fecharDialog("viewDialog");memoriaAberta=null;await carregarMemorias();status("Memória excluída.");
 }catch(err){console.error(err);status("Não foi possível excluir esta memória.",true);}
});

// Migra as lembranças antigas do IndexedDB deste navegador para a nuvem.
// Não apaga os dados locais; só os copia. Execute uma única vez.
async function abrirBancoAntigo(){
 return new Promise((resolve,reject)=>{const req=indexedDB.open("JuliaEMateusMemorias",1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
}
$("#importLocal").addEventListener("click",async()=>{
 if(!window.usuarioAdmin)return;
 if(!confirm("Copiar para a nuvem as lembranças salvas neste navegador? Os dados locais não serão apagados."))return;
 try{
  const old=await abrirBancoAntigo();if(!old.objectStoreNames.contains("memorias")){status("Não encontrei um álbum local antigo neste navegador.");return;}
  const rows=await new Promise((resolve,reject)=>{const tx=old.transaction("memorias","readonly"),req=tx.objectStore("memorias").getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  let total=0;
  for(const m of rows){
   const {data:existing}=await sb.from("memories").select("id").eq("id",m.id).maybeSingle();if(existing)continue;
   const photoFile=m.foto;if(!photoFile)continue;
   const photoPath=caminhoArquivo(m.id,"foto",photoFile),photoUrl=await uploadArquivo(photoFile,photoPath);
   let musicPath=null,musicUrl=null;
   if(m.musica){musicPath=caminhoArquivo(m.id,"musica",m.musica);musicUrl=await uploadArquivo(m.musica,musicPath);}
   const {error}=await sb.from("memories").insert({id:m.id,title:m.titulo,description:m.descricao,memory_date:m.data||null,photo_path:photoPath,photo_url:photoUrl,music_path:musicPath,music_url:musicUrl,music_name:m.nomeMusica||null,music_start:m.inicioMusica||0,music_end:m.fimMusica??null});
   if(error)throw error;total++;
  }
  await carregarMemorias();status(`${total} lembrança(s) antiga(s) copiadas para a nuvem. Os originais continuam neste navegador.`);
 }catch(err){console.error(err);status("Não consegui importar tudo. Os arquivos locais continuam preservados; tente novamente.",true);}
});
const camada=$(".ambient-hearts");
function criarCoracao(){const c=document.createElement("span");c.className="floating-heart";c.textContent=Math.random()>.5?"♥":"♡";c.style.left=`${Math.random()*100}%`;c.style.fontSize=`${10+Math.random()*17}px`;const d=11+Math.random()*12;c.style.animationDuration=`${d}s`;camada.appendChild(c);setTimeout(()=>c.remove(),d*1000);}
async function iniciar(){
 atualizarContador();setInterval(atualizarContador,1000);setInterval(criarCoracao,1500);for(let i=0;i<7;i++)setTimeout(criarCoracao,i*450);
 if(!supabasePronto){status("Configure a URL e a chave pública do Supabase no início do script.js para ativar o álbum compartilhado.",true);$("#loginButton").disabled=true;return;}
 try{await atualizarAcesso();sb.auth.onAuthStateChange(()=>atualizarAcesso());await carregarMemorias();}
 catch(err){console.error(err);status("Não foi possível conectar ao álbum online. Confira a configuração do Supabase.",true);}
}
iniciar();