// Configure com a URL e a chave anon/public do Supabase.
const SUPABASE_URL = "COLE_A_URL_DO_PROJETO";
const SUPABASE_ANON_KEY = "COLE_A_CHAVE_ANON_PUBLICA";
const BUCKET = "memory-photos";
const DATA_INICIO = new Date(2024, 2, 13, 0, 0, 0);
const $ = s => document.querySelector(s);
const pronto = SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.startsWith("COLE_");
const sb = pronto ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let memoriaAberta=null;
function status(t,err=false){$("#statusMessage").textContent=t;$("#statusMessage").classList.toggle("error",err);}
function contador(){let n=Math.max(0,Math.floor((Date.now()-DATA_INICIO)/1000)),d=Math.floor(n/86400);n%=86400;let h=Math.floor(n/3600);n%=3600;let m=Math.floor(n/60),s=n%60;$("#days").textContent=d.toLocaleString("pt-BR");$("#hours").textContent=String(h).padStart(2,"0");$("#minutes").textContent=String(m).padStart(2,"0");$("#seconds").textContent=String(s).padStart(2,"0");}
function safe(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function dateText(v){return v?new Date(v+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"}):"UMA DATA ESPECIAL";}
function pathFor(id,kind,file){let ext=(file.name.split(".").pop()||"bin").replace(/[^a-z0-9]/gi,"");return `${id}/${kind}.${ext}`;}
async function upload(file,path){let {error}=await sb.storage.from(BUCKET).upload(path,file,{upsert:true});if(error)throw error;return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;}
async function load(){
 const grid=$("#memoryGrid");grid.querySelectorAll(".memory-card").forEach(e=>e.remove());
 const {data,error}=await sb.from("memories").select("*").order("memory_date",{ascending:false}).order("created_at",{ascending:false});if(error)throw error;
 $("#emptyState").hidden=!!data.length;
 data.forEach(m=>{let card=document.createElement("article");card.className="memory-card";card.tabIndex=0;card.innerHTML=`<div class="memory-thumb"><img loading="lazy" src="${safe(m.photo_url)}" alt="${safe(m.title)}"></div><div class="memory-info"><span class="memory-date">${safe(dateText(m.memory_date))}</span><h3>${safe(m.title)}</h3><p>${safe(m.description||"Uma lembrança para guardar com carinho.")}</p><div class="memory-meta">${m.music_url?"♫ tem uma música especial":"♡ guardado no nosso álbum"}</div></div>`;card.onclick=()=>openMemory(m);card.onkeydown=e=>{if(e.key==="Enter")openMemory(m)};grid.append(card);});
}
function openMemory(m){memoriaAberta=m;$("#viewPhoto").src=m.photo_url;$("#viewTitle").textContent=m.title;$("#viewDate").textContent=dateText(m.memory_date);$("#viewNote").textContent=m.description||"";let a=$("#memoryAudio");a.pause();a.removeAttribute("src");a.load();a.ontimeupdate=null;
 if(m.music_url){a.src=m.music_url;$("#audioArea").hidden=false;$("#audioName").textContent=m.music_name||"Música dessa lembrança";let start=Number(m.music_start)||0,end=m.music_end==null?null:Number(m.music_end);$("#audioTip").textContent=`Trecho: ${start}s${end!==null?` até ${end}s`:" até o final"}. Aperte play para ouvir.`;a.onloadedmetadata=()=>{if(start>0&&start<a.duration)a.currentTime=start;};a.ontimeupdate=()=>{if(end!==null&&end>start&&a.currentTime>=end){a.pause();a.currentTime=start;}};}else $("#audioArea").hidden=true;
 $("#viewDialog").showModal();}
function close(id){let d=document.getElementById(id);if(d.open)d.close();}
$("#openAdd").onclick=()=>{$("#memoryForm").reset();let n=new Date();$("#memoryDate").value=n.toISOString().slice(0,10);$("#formError").textContent="";$("#addDialog").showModal();};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>close(b.dataset.close));
[$("#addDialog"),$("#viewDialog")].forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close();}));
$("#memoryForm").onsubmit=async e=>{e.preventDefault();let err=$("#formError"),photo=$("#memoryPhoto").files[0],music=$("#memoryMusic").files[0],start=Math.max(0,Number($("#musicStart").value)||0),endTxt=$("#musicEnd").value.trim(),end=endTxt===""?null:Number(endTxt);err.textContent="";
 if(!photo){err.textContent="Escolha uma foto.";return;}if(end!==null&&end<=start){err.textContent="O tempo final precisa ser maior que o inicial.";return;}
 let id=crypto.randomUUID();try{status("Salvando a lembrança na nuvem…");let photoPath=pathFor(id,"foto",photo),photoUrl=await upload(photo,photoPath),musicPath=null,musicUrl=null;if(music){musicPath=pathFor(id,"musica",music);musicUrl=await upload(music,musicPath);}
 let {error}=await sb.from("memories").insert({id,title:$("#memoryTitle").value.trim(),description:$("#memoryNote").value.trim(),memory_date:$("#memoryDate").value||null,photo_path:photoPath,photo_url:photoUrl,music_path:musicPath,music_url:musicUrl,music_name:music?.name||null,music_start:start,music_end:end});if(error)throw error;
 close("addDialog");await load();status("Memória salva! Ela já aparece para quem abrir o link. ♥");}catch(ex){console.error(ex);err.textContent="Não consegui salvar. Confira as configurações e a conexão.";status("Erro ao salvar a lembrança.",true);}};
$("#deleteMemory").onclick=async()=>{if(!memoriaAberta||!confirm("Excluir esta lembrança para todos que acessam o site?"))return;try{let paths=[memoriaAberta.photo_path,memoriaAberta.music_path].filter(Boolean);let {error}=await sb.from("memories").delete().eq("id",memoriaAberta.id);if(error)throw error;if(paths.length)await sb.storage.from(BUCKET).remove(paths);close("viewDialog");await load();status("Lembrança excluída do álbum compartilhado.");}catch(e){console.error(e);status("Não foi possível excluir.",true);}};
function heart(){let c=document.createElement("span");c.className="floating-heart";c.textContent=Math.random()>.5?"♥":"♡";c.style.left=Math.random()*100+"%";c.style.fontSize=(10+Math.random()*17)+"px";let d=11+Math.random()*12;c.style.animationDuration=d+"s";$(".ambient-hearts").append(c);setTimeout(()=>c.remove(),d*1000);}
async function start(){contador();setInterval(contador,1000);setInterval(heart,1400);for(let i=0;i<7;i++)setTimeout(heart,i*400);if(!pronto){status("Falta configurar a URL e a chave pública do Supabase no início do script.js.",true);$("#openAdd").disabled=true;return;}try{await load();}catch(e){console.error(e);status("Não consegui conectar ao álbum. Confira a configuração do Supabase.",true);}}
start();