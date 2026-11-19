const handoverRoot = document.querySelector("#handoverWorkspace");
const handoverProjectId = handoverRoot.dataset.projectId;
const handoverPrefix = `handover:${handoverProjectId}:`;

function handoverRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`${handoverPrefix}${key}`) || "null") ?? fallback; }
  catch { return fallback; }
}
function handoverWrite(key, value) { localStorage.setItem(`${handoverPrefix}${key}`, JSON.stringify(value)); }
function handoverEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function handoverToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message; toast.classList.add("show"); clearTimeout(handoverToast.timer);
  handoverToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function handoverMoney(value) { return `${Number(value || 0).toLocaleString("vi-VN")} ₫`; }
function handoverDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function activateHandoverTab(tabId) {
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    const active = button.dataset.tabTarget === tabId;
    button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    const active = panel.dataset.tabPanel === tabId;
    panel.classList.toggle("active", active); panel.hidden = !active;
  });
}
document.querySelectorAll("[data-tab-target]").forEach((button) => button.addEventListener("click", () => activateHandoverTab(button.dataset.tabTarget)));
document.querySelectorAll("[data-tab-jump]").forEach((button) => button.addEventListener("click", () => activateHandoverTab(button.dataset.tabJump)));

function refreshChecklist() {
  const checks = [...document.querySelectorAll("[data-check-id]")];
  const complete = checks.filter((input) => input.checked).length;
  const total = checks.length;
  const label = `Đã hoàn thành ${complete} trên ${total} hạng mục`;
  document.querySelector("#checklistProgressText").textContent = label;
  document.querySelector("#handoverItemCount").textContent = `${String(complete).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
  document.querySelector("#handoverTabBadge").textContent = `${complete}/${total}`;
  const completeAll = complete === total;
  const progress = document.querySelector("#handoverProgressLabel");
  progress.textContent = completeAll ? "Sẵn sàng bàn giao" : "Đang hoàn thiện";
  progress.className = `status-pill ${completeAll ? "status-signed" : "status-progress"}`;
  handoverWrite("checklist", Object.fromEntries(checks.map((input) => [input.dataset.checkId, input.checked])));
}
const savedChecklist = handoverRead("checklist", {});
document.querySelectorAll("[data-check-id]").forEach((input) => {
  if (Object.hasOwn(savedChecklist, input.dataset.checkId)) input.checked = savedChecklist[input.dataset.checkId];
  input.addEventListener("change", refreshChecklist);
});
refreshChecklist();

const initialDocs = [...document.querySelectorAll("#handoverDocuments [data-document-id]")];
const savedDocs = handoverRead("documents", {});
initialDocs.forEach((row) => {
  const status = savedDocs[row.dataset.documentId];
  if (status) setDocumentStatus(row, status);
});
function setDocumentStatus(row, status) {
  row.dataset.documentStatus = status;
  const badge = row.querySelector(".status-pill");
  const button = row.querySelector("[data-document-action]");
  if (status === "approved") {
    badge.textContent = "Đã xác nhận"; badge.className = "status-pill status-signed";
    button.textContent = "Xem hồ sơ"; button.dataset.documentAction = row.dataset.documentId;
  } else if (status === "pending") {
    badge.textContent = "Chờ xác nhận"; badge.className = "status-pill status-progress";
    button.textContent = "Xác nhận";
  } else {
    badge.textContent = "Cần bổ sung"; badge.className = "status-pill status-missing";
    button.textContent = "Đánh dấu đã nhận";
  }
  refreshDocumentCount();
}
function refreshDocumentCount() {
  const rows = [...document.querySelectorAll("#handoverDocuments [data-document-id]")];
  const outstanding = rows.filter((row) => row.dataset.documentStatus !== "approved").length;
  document.querySelector("#handoverDocumentCount").textContent = String(outstanding).padStart(2, "0");
  document.querySelector("#documentTabBadge").textContent = String(outstanding);
}
refreshDocumentCount();
document.querySelector("#handoverDocuments").addEventListener("click", (event) => {
  const button = event.target.closest("[data-document-action]");
  if (!button) return;
  const row = button.closest("[data-document-id]");
  if (row.dataset.documentStatus === "approved") return handoverToast(`Mở hồ sơ ${row.dataset.documentId}`);
  setDocumentStatus(row, "approved");
  const documents = handoverRead("documents", {}); documents[row.dataset.documentId] = "approved"; handoverWrite("documents", documents);
  handoverToast(`Đã cập nhật hồ sơ ${row.dataset.documentId}`);
});
document.querySelector("#documentStatusFilter").addEventListener("change", (event) => {
  let visible = 0;
  document.querySelectorAll("#handoverDocuments [data-document-id]").forEach((row) => {
    row.hidden = event.target.value !== "all" && row.dataset.documentStatus !== event.target.value;
    if (!row.hidden) visible++;
  });
  document.querySelector("#documentsEmpty").hidden = visible > 0;
});

document.querySelector("#startHandover").addEventListener("click", () => {
  activateHandoverTab("handover"); document.querySelector("#handoverChecklist").scrollIntoView({ behavior: "smooth", block: "center" });
});
document.querySelector("#createHandoverMinutes").addEventListener("click", () => {
  const unchecked = [...document.querySelectorAll("[data-check-id]")].filter((input) => !input.checked);
  if (unchecked.length) {
    unchecked[0].focus();
    handoverToast(`Còn ${unchecked.length} hạng mục chưa hoàn thành`);
    return;
  }
  const record = { id: `BG-${String(Date.now()).slice(-5)}`, projectId: handoverProjectId, contractId: handoverRoot.dataset.contractId, createdAt: "2026-11-18", status: "draft" };
  const records = handoverRead("minutes", []); records.unshift(record); handoverWrite("minutes", records);
  const row = document.createElement("tr"); row.dataset.minuteId = record.id;
  row.innerHTML = `<td><strong>${handoverEscape(record.id)}</strong><small>Bàn giao công trình · ${handoverEscape(handoverRoot.dataset.contractId)}</small></td><td>${handoverDate(record.createdAt)}</td><td>Chưa phân công</td><td><span class="status-pill status-progress">Chờ ký hai bên</span></td><td><span class="file-link">Chưa đính kèm</span></td>`;
  document.querySelector("#handoverMinutesRows").prepend(row);
  handoverToast(`Đã tạo bản nháp biên bản ${record.id}`);
});

const settlementForm = document.querySelector("#settlementForm");
function calculateSettlement() {
  const work = Number(document.querySelector("#settlementWorkValue").value || 0);
  const paid = Number(document.querySelector("#settlementPaidValue").value || 0);
  const balance = work - paid;
  document.querySelector("#settlementBalance").textContent = handoverMoney(balance);
  document.querySelector("#settlementTotal").innerHTML = `${(work / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} <small>tỷ</small>`;
  return balance;
}
["#contractFinalValue", "#settlementWorkValue", "#settlementPaidValue", "#settlementRetention"].forEach((selector) => document.querySelector(selector).addEventListener("input", calculateSettlement));
const savedSettlement = handoverRead("settlement", null);
if (savedSettlement) {
  document.querySelector("#contractFinalValue").value = savedSettlement.contractFinalValue;
  document.querySelector("#settlementWorkValue").value = savedSettlement.workValue;
  document.querySelector("#settlementPaidValue").value = savedSettlement.paidValue;
  document.querySelector("#settlementRetention").value = savedSettlement.retention;
  document.querySelector("#settlementAdjustments").value = savedSettlement.adjustments || "";
  document.querySelector("#settlementNotes").value = savedSettlement.notes || "";
  document.querySelector("#settlementHistoryStatus").textContent = savedSettlement.status === "submitted" ? "Đã trình ký" : "Bản nháp";
  document.querySelector("#settlementWorkflowStatus").textContent = savedSettlement.status === "submitted" ? "Đang chờ các bên ký" : "Đang chuẩn bị đối chiếu";
  document.querySelector("#settlementHistoryAmount").textContent = handoverMoney(savedSettlement.workValue);
  if (savedSettlement.status === "submitted") document.querySelector("#submitSettlement").textContent = "Đã trình ký";
}
calculateSettlement();
settlementForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!settlementForm.reportValidity()) return;
  const data = new FormData(settlementForm);
  const record = { projectId: handoverProjectId, contractId: handoverRoot.dataset.contractId, contractFinalValue: Number(data.get("contract_final_value")), workValue: Number(data.get("settlement_work_value")), paidValue: Number(data.get("paid_value")), retention: Number(data.get("retention_value") || 0), adjustments: data.get("adjustments").trim(), notes: data.get("notes").trim(), balance: calculateSettlement(), status: "draft", updatedAt: "2026-11-18" };
  if (record.workValue > record.contractFinalValue) return handoverToast("Giá trị quyết toán không được vượt giá trị hợp đồng sau điều chỉnh");
  handoverWrite("settlement", record);
  document.querySelector("#settlementHistoryAmount").textContent = handoverMoney(record.workValue);
  document.querySelector("#settlementHistoryStatus").textContent = "Bản nháp";
  document.querySelector("#settlementWorkflowStatus").textContent = "Đã lưu bản nháp đối chiếu";
  document.querySelector("#submitSettlement").textContent = "Trình ký quyết toán";
  handoverToast("Đã lưu đối chiếu quyết toán");
});
document.querySelector("#submitSettlement").addEventListener("click", () => {
  const current = handoverRead("settlement", null);
  if (!current) { handoverToast("Hãy lưu đối chiếu quyết toán trước khi trình ký"); return; }
  current.status = "submitted"; handoverWrite("settlement", current);
  document.querySelector("#settlementHistoryStatus").textContent = "Đã trình ký";
  document.querySelector("#settlementWorkflowStatus").textContent = "Đang chờ các bên ký";
  document.querySelector("#submitSettlement").textContent = "Đã trình ký";
  handoverToast("Đã chuyển hồ sơ quyết toán sang bước trình ký");
});

const warrantyDialog = document.querySelector("#warrantyDialog");
document.querySelector("#newWarrantyRequest").addEventListener("click", () => warrantyDialog.showModal());
function refreshWarrantyCount() {
  const active = document.querySelectorAll('#warrantyList [data-warranty-status="in-progress"]').length;
  document.querySelector("#warrantyCount").textContent = String(active).padStart(2, "0");
  document.querySelector("#warrantyEmpty").hidden = document.querySelectorAll("#warrantyList [data-warranty-id]").length > 0;
}
const savedWarranties = handoverRead("warranties", []);
savedWarranties.slice().reverse().forEach((record) => appendWarranty(record));
function appendWarranty(record) {
  const row = document.createElement("article"); row.className = "warranty-row";
  row.dataset.warrantyId = record.id; row.dataset.warrantyStatus = record.status || "in-progress";
  const completed = row.dataset.warrantyStatus === "completed";
  row.innerHTML = `<span class="warranty-indicator ${completed ? "green" : "amber"}"></span><div><strong>${handoverEscape(record.item)}</strong><small>${handoverEscape(record.id)} · Báo ngày ${handoverDate(record.reportedDate)} · Hạn xử lý ${handoverDate(record.dueDate)} · ${handoverEscape(record.assignee)}</small></div><span class="status-pill ${completed ? "status-signed" : "status-progress"}">${completed ? "Đã hoàn tất" : "Đang xử lý"}</span><button class="document-action" ${completed ? "disabled" : `data-close-warranty="${handoverEscape(record.id)}"` } type="button">${completed ? "Đã đóng" : "Đánh dấu hoàn tất"}</button>`;
  document.querySelector("#warrantyList").prepend(row); refreshWarrantyCount();
}
refreshWarrantyCount();
document.querySelector("#warrantyList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-close-warranty]");
  if (!button) return;
  const row = button.closest("[data-warranty-id]"); row.dataset.warrantyStatus = "completed";
  row.querySelector(".warranty-indicator").className = "warranty-indicator green";
  row.querySelector(".status-pill").textContent = "Đã hoàn tất"; row.querySelector(".status-pill").className = "status-pill status-signed";
  button.textContent = "Đã đóng"; button.disabled = true; button.removeAttribute("data-close-warranty");
  const records = handoverRead("warranties", []); const record = records.find((item) => item.id === row.dataset.warrantyId);
  if (record) { record.status = "completed"; handoverWrite("warranties", records); }
  refreshWarrantyCount(); handoverToast("Đã cập nhật yêu cầu bảo hành hoàn tất");
});
document.querySelector("#warrantyForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const record = { id: `WR-${String(Date.now()).slice(-5)}`, projectId: handoverProjectId, item: data.get("item").trim(), reportedDate: data.get("reported_date"), dueDate: data.get("due_date"), assignee: data.get("assignee").trim(), description: data.get("description").trim(), status: "in-progress" };
  const records = handoverRead("warranties", []); records.unshift(record); handoverWrite("warranties", records);
  appendWarranty(record); form.reset(); warrantyDialog.close();
  handoverToast(`Đã ghi nhận yêu cầu ${record.id}`);
});

const initialWarranties = document.querySelectorAll("#warrantyList [data-warranty-id]");
document.querySelector("#warrantyEmpty").hidden = initialWarranties.length > 0;
