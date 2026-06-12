const OPENROUTER_API_KEY = "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";
const MODELOS = ["deepseek/deepseek-r1:free","qwen/qwen3-32b:free","nex-agi/nex-n2-pro:free"];

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "togglePainel") {
    togglePainelKhan();
  }
});

function togglePainelKhan() {
  const existente = document.getElementById("khan-ia-panel");

  if (existente) {
    existente.remove();
    return;
  }

  criarPainel();
}

function criarPainel() {
  const panel = document.createElement("div");
  panel.id = "khan-ia-panel";

  panel.innerHTML = `
    <div id="khan-header">
      <div class="khan-title"><div id="khan-logo">KH</div><div><strong>Khan IA Helper</strong><span>v1.0</span></div></div>
      <button id="khan-minimizar">−</button>
    </div>

    <div id="khan-body">
      <button id="khan-analisar">Analisar questão</button>

      <div id="khan-status">Clique em analisar para ler a questão.</div>

      <div id="khan-resposta"></div>
    </div>
  `;

  document.body.appendChild(panel);
 
  adicionarEstilo();
  arrastarPainel(panel);

  const btn = panel.querySelector("#khan-analisar");
  const resposta = panel.querySelector("#khan-resposta");
  const status = panel.querySelector("#khan-status");

  btn.addEventListener("click", async () => {
    status.textContent = "Lendo questão...";
    resposta.textContent = "";

    const questao = pegarDadosDaQuestao();

    if (!questao || questao.length < 20) {
      status.textContent = "Não consegui ler a questão.";
      return;
    }

    status.textContent = "Enviando para IA...";

    try {
      const respostaIA = await perguntarIAComFallback(questao);
      status.textContent = "Resposta recebida:";
      resposta.textContent = limparResposta(respostaIA);
    } catch (err) {
      status.textContent = "Erro:";
      resposta.textContent = err.message;
    }
  });

  panel.querySelector("#khan-minimizar").addEventListener("click", () => {
    panel.remove();
  });
}

function adicionarEstilo() {
  if (document.getElementById("khan-ia-style")) return;

  const style = document.createElement("style");
  style.id = "khan-ia-style";

  style.textContent = `
    #khan-ia-panel {
      position: fixed;
      top: 90px;
      right: 35px;
      width: 360px;
      max-height: 560px;
      background: #111;
      color: white;
      border-radius: 18px;
      z-index: 999999999;
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
      font-family: Arial, sans-serif;
      overflow: hidden;
      animation: khanShow .25s ease;
      border: 1px solid rgba(255,255,255,.12);
    }

    @keyframes khanShow {
      from {
        opacity: 0;
        transform: scale(.94) translateY(12px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    #khan-header {
      height: 52px;
      background: linear-gradient(135deg, #6c5ce7, #4834d4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      cursor: move;
      user-select: none;
    }

    #khan-header strong {
      display: block;
      font-size: 15px;
    }

    #khan-header span {
      font-size: 11px;
      opacity: .75;
    }

    #khan-minimizar {
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 8px;
      background: rgba(255,255,255,.18);
      color: white;
      font-size: 20px;
      cursor: pointer;
    }

    #khan-body {
      padding: 14px;
    }

    #khan-analisar {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 11px;
      background: #6c5ce7;
      color: white;
      font-weight: bold;
      cursor: pointer;
      margin-bottom: 12px;
    }

    #khan-analisar:hover {
      filter: brightness(1.1);
    }

    #khan-status {
      font-size: 13px;
      opacity: .75;
      margin-bottom: 10px;
    }

    #khan-resposta {
      background: #1d1d1d;
      border-radius: 12px;
      padding: 12px;
      font-size: 14px;
      line-height: 1.4;
      white-space: pre-wrap;
      max-height: 390px;
      overflow-y: auto;
      border: 1px solid rgba(255,255,255,.08);
    }

    #khan-resposta:empty {display:none;}
#khan-floating-btn{position:fixed;right:20px;bottom:20px;width:64px;height:64px;border:none;border-radius:50%;background:#6c5ce7;cursor:pointer;z-index:2147483647;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.35);}
#khan-floating-btn img{width:36px;height:36px;}
.khan-title{display:flex;align-items:center;gap:8px;}
#khan-logo{width:28px;height:28px;border-radius:6px;background:#fff;color:#6c5ce7;display:flex;align-items:center;justify-content:center;font-weight:bold;}
  `;

  document.head.appendChild(style);
}

function arrastarPainel(panel) {
  const header = panel.querySelector("#khan-header");

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener("mousedown", (e) => {
    isDragging = true;

    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    panel.style.left = `${e.clientX - offsetX}px`;
    panel.style.top = `${e.clientY - offsetY}px`;
    panel.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.userSelect = "";
  });
}

function pegarTextoDaQuestao() {
  const seletores = [
    "[data-test-id='exercise-content']",
    "[data-test-id='question-area']",
    ".perseus-renderer",
    "main",
    "article",
    "body"
  ];

  for (const seletor of seletores) {
    const el = document.querySelector(seletor);

    if (el && el.innerText.trim().length > 30) {
      return limparTexto(el.innerText);
    }
  }

  return limparTexto(document.body.innerText);
}

function limparTexto(texto) {
  return texto
    .replace(/\s+/g, " ")
    .replace(/Verificar/g, "")
    .replace(/Check/g, "")
    .replace(/Mostrar calculadora/g, "")
    .replace(/Show calculator/g, "")
    .replace(/Próxima pergunta/g, "")
    .replace(/Next question/g, "")
    .trim()
    .slice(0, 6000);
}

async function perguntarIA(questao) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://www.khanacademy.org",
      "X-Title": "Khan IA Helper"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
  role: "system",
  content: `
Você deve responder SOMENTE com a resposta final.

Regras:
- Responda RAPIDO
- Não explique.
- Não mostre cálculos.
- Não use markdown.
- Não use LaTeX.
- Não escreva frases como "a resposta é".
- Retorne apenas o resultado.
- Verifique a resposta antes de responder.
- Se for múltipla escolha, retorne apenas a alternativa correta.
`
        },
        {
          role: "user",
          content: "Analise esta questão:\n\n" + questao
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Erro desconhecido na IA.");
  }

  return data.choices?.[0]?.message?.content || "A IA não retornou resposta.";
}

function limparResposta(texto){
 return texto
 .replace(/\\boxed\{([^}]*)\}/g,'$1')
 .replace(/\\\(|\\\)/g,'')
 .replace(/\\\[|\\\]/g,'')
 .replace(/\*\*/g,'')
 .trim();
}

function criarBotaoFlutuante(){
 if(document.getElementById('khan-floating-btn')) return;
 const btn=document.createElement('button');
 btn.id='khan-floating-btn';
 btn.textContent='KH';
 document.body.appendChild(btn);
 btn.onclick=()=>{
   const p=document.getElementById('khan-ia-panel');
   if(p) p.remove(); else criarPainel();
 };
}
setTimeout(()=>{adicionarEstilo();criarBotaoFlutuante();},500);


function pegarDadosDaQuestao() {
  const renderer = document.querySelector(".perseus-renderer");
  if (!renderer) return pegarTextoDaQuestao();

  const partes = [];
  partes.push("TEXTO:");
  partes.push(renderer.innerText || "");

  renderer.querySelectorAll("img").forEach((img, i) => {
    partes.push(`IMAGEM ${i+1}: ${img.src}`);
  });

  renderer.querySelectorAll("svg").forEach((svg, i) => {
    partes.push(`SVG ${i+1}:`);
    partes.push(svg.outerHTML.slice(0, 5000));
  });

  return partes.join("\\n\\n");
}


async function perguntarIAComFallback(questao){
 let lastErr;
 for(const modelo of MODELOS){
  try{
   const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{
    method:"POST",
    headers:{"Authorization":`Bearer ${OPENROUTER_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:modelo,messages:[{role:"system",content:"Resolva cuidadosamente internamente. Verifique a resposta. Responda SOMENTE com a resposta final."},{role:"user",content:questao}]})
   });
   const data=await response.json();
   if(response.ok && data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  }catch(e){lastErr=e}
 }
 throw lastErr||new Error("Todos os modelos falharam");
}
