const GOOGLE_SCRIPT_URL =
 "https://script.google.com/macros/s/AKfycbzzhPCZWQRpDdwxsNM-tJ9EH2lslhZB0DwGGiSspmoaLN8oxM9zvl6B2uwlsa6kcAcn/exec"

 let currentStep = 1;

  const sections = [...document.querySelectorAll(".section")];
  const steps = [...document.querySelectorAll(".step")];

  function showStep(n){
    currentStep = n;
    sections.forEach(s => s.classList.toggle("active", Number(s.dataset.section) === n));
    steps.forEach(s => {
      const v = Number(s.dataset.step);
      s.classList.toggle("active", v === n);
      s.classList.toggle("done", v < n);
    });
    document.getElementById("register").scrollIntoView({behavior:"smooth",block:"start"});
    if(n === 4) buildReview();
  }

  function validateSection(n){
    const section = document.querySelector(`[data-section="${n}"]`);
    const fields = section.querySelectorAll("input,select");
    for(const field of fields){
      if(field.type === "checkbox") continue;
      if(!field.checkValidity()){
        field.reportValidity();
        return false;
      }
    }
    if(n === 2 && !checkFile("paymentProof")) return false;
    if(n === 3 && (!checkFile("igProof") || !checkFile("ytProof"))) return false;
    return true;
  }

  function checkFile(id){
    const f = document.getElementById(id).files[0];
    if(!f){ document.getElementById(id).reportValidity(); return false; }
    if(f.size > 5*1024*1024){
      showStatus("File terlalu besar. Maksimal 5 MB per file.", true);
      return false;
    }
    return true;
  }

  function nextStep(){
    if(validateSection(currentStep)) showStep(Math.min(4,currentStep+1));
  }
  function prevStep(){ showStep(Math.max(1,currentStep-1)); }

  function previewFile(input, boxId, nameId){
    const file = input.files[0];
    if(!file) return;
    document.getElementById(nameId).textContent = `${file.name} • ${(file.size/1024/1024).toFixed(2)} MB`;
    const box = document.getElementById(boxId);
    const img = box.querySelector("img");
    if(file.type.startsWith("image/")){
      const reader = new FileReader();
      reader.onload = e => { img.src = e.target.result; box.classList.add("show"); };
      reader.readAsDataURL(file);
    } else {
      img.removeAttribute("src");
      box.classList.add("show");
    }
  }

  function buildReview(){
    const data = {
      "Nama": document.getElementById("name").value,
      "Email": document.getElementById("email").value,
      "WhatsApp": document.getElementById("wa").value,
      "Jurusan": document.getElementById("major").value,
      "Bukti pembayaran": document.getElementById("paymentProof").files[0]?.name || "-",
      "Bukti Instagram": document.getElementById("igProof").files[0]?.name || "-",
      "Bukti YouTube": document.getElementById("ytProof").files[0]?.name || "-"
    };
    document.getElementById("reviewBox").innerHTML = Object.entries(data).map(([k,v]) =>
      `<div style="display:flex;justify-content:space-between;gap:15px;padding:12px 14px;background:#f7fafb;border-radius:12px;font-size:13px"><b>${escapeHtml(k)}</b><span style="text-align:right;color:#617277;word-break:break-word">${escapeHtml(v)}</span></div>`
    ).join("");
  }

  function escapeHtml(v){
    return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }

  function showStatus(msg,error=false){
    const el=document.getElementById("status");
    el.textContent=msg;
    el.className="status show "+(error?"error":"success");
  }

  function fileToBase64(file){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve({name:file.name,mimeType:file.type,data:r.result.split(",")[1]});
      r.onerror=reject;
      r.readAsDataURL(file);
    });
  }

  document.getElementById("registrationForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(!document.getElementById("consent").checked){
      showStatus("Centang pernyataan terlebih dahulu.", true); return;
    }
    if(!validateSection(4)) return;

    const submitBtn=document.getElementById("submitBtn");
    submitBtn.disabled=true;
    submitBtn.textContent="Mengirim…";
    showStatus("Sedang mengupload bukti dan menyimpan data…");

    try{
      const files = await Promise.all([
        fileToBase64(document.getElementById("paymentProof").files[0]),
        fileToBase64(document.getElementById("igProof").files[0]),
        fileToBase64(document.getElementById("ytProof").files[0])
      ]);

      const payload={
        name:document.getElementById("name").value.trim(),
        email:document.getElementById("email").value.trim(),
        wa:document.getElementById("wa").value.trim(),
        major:document.getElementById("major").value.trim(),
        paymentProof:files[0],
        igProof:files[1],
        ytProof:files[2]
      };

      // Apps Script callback.
     const response = await fetch(GOOGLE_SCRIPT_URL, {
  method: "POST",
  headers: {
    "Content-Type": "text/plain;charset=utf-8"
  },
  body: JSON.stringify(payload)
});

const res = await response.json();

if (!res || !res.ok) {
  throw new Error(res?.message || "Pendaftaran gagal.");
}

document.getElementById("registrationId").textContent =
  res.registrationId;

document.getElementById("registrationForm").style.display =
  "none";

document.querySelector(".steps").style.display =
  "none";

document.getElementById("successScreen").classList.add("show");

window.scrollTo({
  top: 0,
  behavior: "smooth"
});

    } catch(err) {
      showStatus(
        err.message || "Terjadi kesalahan.",
        true
      );

      submitBtn.disabled = false;
      submitBtn.textContent = "Kirim Pendaftaran 🚀";
    }
  });