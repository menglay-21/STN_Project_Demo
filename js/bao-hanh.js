const warrantyRoot = document.querySelector("#warrantyWorkspace");
const warrantyProjectId = warrantyRoot.dataset.projectId;
const warrantyStorageKey = `warranty:${warrantyProjectId}:records`;
const statusLabels = { reported: ["Mới tiếp nhận", "status-reported"], "in-progress": ["Đang xử lý", "status-in-progress"], "waiting-material": ["Chờ vật tư", "status-waiting"], completed: ["Đã hoàn tất", "status-completed"] };

function warrantyRead() {
  try { return JSON.parse(localStorage.getItem(warrantyStorageKey) || "{}") || {}; }
  catch { return {}; }
}
function warrantyWrite(records) { localStorage.setItem(warrantyStorageKey, JSON.stringify(records)); }
function warrantyEscape(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function warrantyFormatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
function warrantyToast(message) {
  const toast = document.querySelector("#toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(warrantyToast.timer); warrantyToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function rowToRecord(row) {
  return { id: row.dataset.warrantyId, projectId: row.dataset.projectId, contractId: warrantyRoot.dataset.contractId, status: row.dataset.warrantyStatus, dueDate: row.dataset.dueDate || "", priority: row.dataset.priority || "normal", item: row.querySelector(".request-body > p")?.textContent || "", title: row.querySelector(".request-title-line > strong")?.textContent || "", assignee: row.querySelector(".request-meta span:nth-child(2)")?.textContent.replace(/^♧\s*/, "") || "", description: row.querySelector(".request-body > p")?.textContent || "", reportedDate: "", resolution: "", evidenceReference: "" };
}
function persistRow(row, extra = {}) {
  const records = warrantyRead();
  records[row.dataset.warrantyId] = { ...(records[row.dataset.warrantyId] || rowToRecord(row)), ...extra, status: row.dataset.warrantyStatus };
  warrantyWrite(records);
}
function applyStatus(row, status) {
  row.dataset.warrantyStatus = status;
  const [label, cssClass] = statusLabels[status] || statusLabels.reported;
  const badge = row.querySelector(".request-status"); badge.textContent = label; badge.className = `request-status ${cssClass}`;
  const indicator = row.querySelector(".request-indicator");
  indicator.className = `request-indicator ${status === "completed" ? "indicator-done" : row.dataset.priority === "high" ? "indicator-high" : "indicator-normal"}`;
}
function refreshWarrantyStats() {
  const rows = [...document.querySelectorAll("#warrantyList [data-warranty-id]")];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const openRows = rows.filter((row) => row.dataset.warrantyStatus !== "completed");
  const overdue = openRows.filter((row) => row.dataset.dueDate && new Date(`${row.dataset.dueDate}T00:00:00`) < today);
  const day90 = new Date(today); day90.setDate(day90.getDate() + 90);
  const warrantyEnd = new Date("2028-11-12T00:00:00");
  const expiring = warrantyEnd >= today && warrantyEnd <= day90 ? 1 : 0;
  document.querySelector("#openWarrantyCount").textContent = String(openRows.length).padStart(2, "0");
  document.querySelector("#overdueWarrantyCount").textContent = String(overdue.length).padStart(2, "0");
  document.querySelector("#expiringWarrantyCount").textContent = String(expiring).padStart(2, "0");
  document.querySelector("#warrantyResultCount").textContent = `Hiển thị ${rows.filter((row) => !row.hidden).length} yêu cầu`;
  document.querySelector("#warrantyEmpty").hidden = rows.some((row) => !row.hidden);
  document.querySelector("#warrantyListSummary").textContent = `${openRows.length} yêu cầu đang mở · ${overdue.length} quá hạn xử lý`;
  rows.forEach((row) => {
    const due = row.querySelector("[data-due-label]");
    if (!due || row.dataset.warrantyStatus === "completed" || !row.dataset.dueDate) return;
    const dueDate = new Date(`${row.dataset.dueDate}T00:00:00`);
    due.classList.toggle("due-overdue", dueDate < today);
    due.classList.toggle("due-soon", dueDate >= today && dueDate.getTime() - today.getTime() <= 7 * 86400000);
    due.textContent = dueDate < today ? `Quá hạn ${Math.ceil((today - dueDate) / 86400000)} ngày` : `Hạn ${warrantyFormatDate(row.dataset.dueDate)}`;
  });
}
function applyWarrantyFilters() {
  const status = document.querySelector("#warrantyStatusFilter").value;
  const project = document.querySelector("#warrantyProjectFilter").value;
  const query = document.querySelector("#warrantySearch").value.trim().toLocaleLowerCase("vi");
  document.querySelectorAll("#warrantyList [data-warranty-id]").forEach((row) => {
    const matchesStatus = status === "all" || row.dataset.warrantyStatus === status;
    const matchesProject = project === "all" || row.dataset.projectId === project;
    const matchesQuery = !query || row.textContent.toLocaleLowerCase("vi").includes(query);
    row.hidden = !(matchesStatus && matchesProject && matchesQuery);
  });
  refreshWarrantyStats();
}

const savedRecords = warrantyRead();
document.querySelectorAll("#warrantyList [data-warranty-id]").forEach((row) => {
  const saved = savedRecords[row.dataset.warrantyId];
  if (!saved) return;
  applyStatus(row, saved.status || row.dataset.warrantyStatus);
  if (saved.title) row.querySelector(".request-title-line > strong").textContent = saved.title;
  if (saved.description) row.querySelector(".request-body > p").textContent = saved.description;
  if (saved.assignee) row.querySelector(".request-meta span:nth-child(2)").textContent = `♧ ${saved.assignee}`;
  if (saved.dueDate) row.dataset.dueDate = saved.dueDate;
  row.dataset.priority = saved.priority || row.dataset.priority;
  if (saved.evidenceReference && row.dataset.warrantyStatus === "completed") row.querySelector(".request-side .request-due").textContent = `Biên bản ${saved.evidenceReference}`;
});
Object.values(savedRecords).filter((record) => !document.querySelector(`[data-warranty-id="${CSS.escape(record.id)}"]`)).forEach((record) => addWarrantyRow(record));
refreshWarrantyStats();

document.querySelectorAll("#warrantyStatusFilter, #warrantyProjectFilter").forEach((select) => select.addEventListener("change", applyWarrantyFilters));
document.querySelector("#warrantySearch").addEventListener("input", applyWarrantyFilters);

const createDialog = document.querySelector("#warrantyDialog");
const createForm = document.querySelector("#warrantyForm");
document.querySelector("#newWarrantyRequest").addEventListener("click", () => {
  createForm.reset(); createForm.elements.project_id.value = warrantyProjectId; createForm.elements.contract_id.value = warrantyRoot.dataset.contractId;
  document.querySelector("#warrantyReportedDate").value = "2026-11-18";
  createDialog.showModal();
});
function addWarrantyRow(record) {
  if (document.querySelector(`[data-warranty-id="${CSS.escape(record.id)}"]`)) return;
  const row = document.createElement("article"); row.className = "warranty-request";
  row.dataset.warrantyId = record.id; row.dataset.warrantyStatus = record.status || "reported"; row.dataset.projectId = record.projectId || warrantyProjectId; row.dataset.dueDate = record.dueDate || ""; row.dataset.priority = record.priority || "normal";
  const [label, statusClass] = statusLabels[row.dataset.warrantyStatus] || statusLabels.reported;
  row.innerHTML = `<span class="request-indicator ${row.dataset.priority === "high" ? "indicator-high" : "indicator-normal"}"></span><div class="request-body"><div class="request-title-line"><strong>${warrantyEscape(record.item)}</strong><span class="request-code">${warrantyEscape(record.id)}</span></div><p>${warrantyEscape(record.description)}</p><div class="request-meta"><span>▣ ${warrantyEscape(record.location || record.item)}</span><span>♧ ${warrantyEscape(record.assignee)}</span><span>Tiếp nhận ${warrantyFormatDate(record.reportedDate)}</span></div></div><div class="request-side"><span class="request-status ${statusClass}">${label}</span><span class="request-due" data-due-label>${row.dataset.warrantyStatus === "completed" && record.evidenceReference ? `Biên bản ${warrantyEscape(record.evidenceReference)}` : `Hạn ${warrantyFormatDate(record.dueDate)}`}</span><button class="request-action" type="button" data-open-warranty="${warrantyEscape(record.id)}">Chi tiết <span>→</span></button></div>`;
  document.querySelector("#warrantyList").prepend(row); applyWarrantyFilters();
}
createForm.addEventListener("submit", (event) => {
  event.preventDefault(); if (!createForm.reportValidity()) return;
  const data = new FormData(createForm);
  const record = { id: `WR-${String(Date.now()).slice(-5)}`, projectId: data.get("project_id"), contractId: data.get("contract_id"), item: data.get("item").trim(), title: data.get("item").trim(), location: data.get("item").trim(), priority: data.get("priority"), reportedDate: data.get("reported_date"), dueDate: data.get("due_date"), assignee: data.get("assignee").trim(), status: data.get("status"), description: data.get("description").trim(), resolution: data.get("resolution").trim(), evidenceReference: "" };
  const records = warrantyRead(); records[record.id] = record; warrantyWrite(records);
  addWarrantyRow(record); addWarrantyActivity(`${record.id} · Yêu cầu mới được tiếp nhận`, `${record.item} · Phụ trách ${record.assignee}`);
  createDialog.close(); warrantyToast(`Đã tạo yêu cầu ${record.id}`);
});

const detailDialog = document.querySelector("#warrantyDetailDialog");
const detailForm = document.querySelector("#warrantyDetailForm");
document.querySelector("#warrantyList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-warranty]"); if (!button) return;
  const row = button.closest("[data-warranty-id]");
  const record = warrantyRead()[row.dataset.warrantyId] || rowToRecord(row);
  document.querySelector("#warrantyDetailId").value = record.id;
  document.querySelector("#warrantyDetailTitle").textContent = record.title || row.querySelector(".request-title-line > strong").textContent;
  document.querySelector("#warrantyDetailCode").textContent = `${record.id} · ${record.item || record.title || ""}`;
  document.querySelector("#warrantyDetailStatus").value = record.status || row.dataset.warrantyStatus;
  document.querySelector("#warrantyDetailAssignee").value = record.assignee || "";
  document.querySelector("#warrantyDetailResolution").value = record.resolution || "";
  document.querySelector("#warrantyDetailEvidence").value = record.evidenceReference || "";
  detailDialog.showModal();
});
function addWarrantyActivity(title, detail) {
  const item = document.createElement("article"); item.className = "warranty-activity";
  item.innerHTML = `<span class="activity-avatar avatar-blue">QL</span><div><strong>${warrantyEscape(title)}</strong><small>${warrantyEscape(detail)}</small></div><time>Vừa cập nhật</time>`;
  document.querySelector("#warrantyActivityList").prepend(item);
}
detailForm.addEventListener("submit", (event) => {
  event.preventDefault(); if (!detailForm.reportValidity()) return;
  const data = new FormData(detailForm); const id = data.get("warranty_id");
  const row = document.querySelector(`[data-warranty-id="${CSS.escape(id)}"]`);
  const records = warrantyRead(); const record = records[id] || rowToRecord(row);
  record.status = data.get("status"); record.assignee = data.get("assignee").trim(); record.resolution = data.get("resolution").trim(); record.evidenceReference = data.get("evidence_reference").trim();
  records[id] = record; warrantyWrite(records);
  applyStatus(row, record.status);
  const assignee = row.querySelector(".request-meta span:nth-child(2)"); if (assignee) assignee.textContent = `♧ ${record.assignee}`;
  if (record.status === "completed") {
    row.querySelector(".request-meta span:nth-child(3)").textContent = `Hoàn tất ${warrantyFormatDate("2026-11-18")}`;
    row.querySelector(".request-side .request-due").textContent = record.evidenceReference ? `Biên bản ${record.evidenceReference}` : "Đã khắc phục";
  }
  applyWarrantyFilters(); addWarrantyActivity(`${id} · ${statusLabels[record.status][0]}`, record.resolution || "Đã cập nhật trạng thái và người phụ trách.");
  detailDialog.close(); warrantyToast(`Đã cập nhật yêu cầu ${id}`);
});
