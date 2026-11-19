const acceptanceRoot = document.querySelector("#acceptanceWorkspace");
const acceptanceProjectId = acceptanceRoot.dataset.projectId;
const acceptancePrefix = `acceptance:${acceptanceProjectId}:`;

function acceptanceToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(acceptanceToast.timer);
  acceptanceToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function acceptanceEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function acceptanceRead(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(`${acceptancePrefix}${key}`) || "null") ?? fallback; }
  catch { return fallback; }
}

function acceptanceWrite(key, value) {
  localStorage.setItem(`${acceptancePrefix}${key}`, JSON.stringify(value));
}

function acceptanceSave(key, record) {
  const records = acceptanceRead(key);
  records.unshift(record);
  acceptanceWrite(key, records);
}

function acceptanceDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function switchAcceptanceTab(tabId) {
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    const active = button.dataset.tabTarget === tabId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    const active = panel.dataset.tabPanel === tabId;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}
document.querySelectorAll("[data-tab-target]").forEach((button) => button.addEventListener("click", () => switchAcceptanceTab(button.dataset.tabTarget)));
document.querySelectorAll("[data-open-tab]").forEach((button) => button.addEventListener("click", () => switchAcceptanceTab(button.dataset.openTab)));

function dossierStateInfo(status) {
  return ({
    draft: ["Bản nháp", "status-working"], internal_ready: ["Sẵn sàng nội bộ", "status-ready"],
    waiting_external: ["Chờ chủ đầu tư / TVGS", "status-working"], accepted: ["Đã nghiệm thu", "status-accepted"],
    needs_rework: ["Cần khắc phục", "status-working"], conditional: ["Chấp thuận có điều kiện", "status-working"],
  })[status] || ["Bản nháp", "status-working"];
}

function updateDossierState(row, status) {
  row.dataset.dossierStatus = status;
  const [label, className] = dossierStateInfo(status);
  const badge = row.querySelector(".acceptance-status");
  badge.textContent = label;
  badge.className = `acceptance-status ${className}`;
  const stateMap = acceptanceRead("dossier-statuses", {});
  stateMap[row.dataset.dossierId] = status;
  acceptanceWrite("dossier-statuses", stateMap);
  const dossiers = acceptanceRead("dossiers");
  const dossier = dossiers.find((item) => item.id === row.dataset.dossierId);
  if (dossier) { dossier.status = status; acceptanceWrite("dossiers", dossiers); }
  refreshAcceptanceMetrics();
}

function setWorkItemStatus(row, status) {
  row.dataset.status = status;
  const statusMap = acceptanceRead("work-item-statuses", {});
  statusMap[row.dataset.workItemId] = status;
  acceptanceWrite("work-item-statuses", statusMap);
  const badge = row.querySelector(".acceptance-status");
  const [label, className] = status === "accepted" ? ["Đã nghiệm thu", "status-accepted"] : status === "ready" ? ["Sẵn sàng nghiệm thu", "status-ready"] : ["Đang thi công", "status-working"];
  badge.textContent = label; badge.className = `acceptance-status ${className}`;
  refreshAcceptanceMetrics();
}

function refreshAcceptanceMetrics() {
  const readyItems = document.querySelectorAll('#workItemRows tr[data-status="ready"]').length;
  const dossierRows = [...document.querySelectorAll("#dossierList [data-dossier-id]")];
  const internalReady = dossierRows.filter((row) => row.dataset.dossierStatus === "internal-ready").length;
  const externalPending = dossierRows.filter((row) => row.dataset.dossierStatus === "waiting-external").length;
  const openIssues = document.querySelectorAll('#nonconformityList [data-nonconformity-status="open"]').length;
  document.querySelector("#waitingAcceptanceCount").textContent = String(readyItems).padStart(2, "0");
  document.querySelector("#internalReadyCount").textContent = String(internalReady).padStart(2, "0");
  document.querySelector("#externalPendingCount").textContent = String(externalPending).padStart(2, "0");
  document.querySelector("#openNonconformityCount").textContent = String(openIssues).padStart(2, "0");
  document.querySelector("#dossierTabCount").textContent = String(dossierRows.length);
  document.querySelector("#dossierListCount").textContent = `${dossierRows.length} bộ hồ sơ được theo dõi`;
  document.querySelector("#dossierReadyBadge").textContent = `${internalReady} sẵn sàng`;
  document.querySelector("#nonconformityListCount").textContent = `${openIssues} điểm chưa phù hợp đang mở`;
  document.querySelector("#nonconformitiesEmpty").hidden = openIssues > 0;
}

function dossierOptionLabel(record) {
  return `${record.id} · ${record.workName}`;
}

function updateDossierOptions(record) {
  ["#internalDossierId", "#externalDossierId"].forEach((selector) => {
    const select = document.querySelector(selector);
    if (select.querySelector(`option[value="${CSS.escape(record.id)}"]`)) return;
    select.add(new Option(dossierOptionLabel(record), record.id));
  });
}

const dossierStatusMap = acceptanceRead("dossier-statuses", {});
document.querySelectorAll("#dossierList [data-dossier-id]").forEach((row) => {
  if (dossierStatusMap[row.dataset.dossierId]) {
    row.dataset.dossierStatus = dossierStatusMap[row.dataset.dossierId];
    const [label, className] = dossierStateInfo(row.dataset.dossierStatus);
    const badge = row.querySelector(".acceptance-status"); badge.textContent = label; badge.className = `acceptance-status ${className}`;
  }
});
const workItemStatusMap = acceptanceRead("work-item-statuses", {});
document.querySelectorAll("#workItemRows [data-work-item-id]").forEach((row) => {
  const status = workItemStatusMap[row.dataset.workItemId];
  if (status) setWorkItemStatus(row, status);
});

function renderDossier(record) {
  const [label, className] = dossierStateInfo(record.status);
  const evidence = record.evidence || {};
  const evidenceText = [
    ["photos", "Ảnh"], ["diary", "Nhật ký"], ["material-certificates", "Chứng chỉ vật liệu"], ["drawings", "Bản vẽ"],
  ].map(([key, name]) => `${evidence[key] ? "✓" : "○"} ${name}`).join(" · ");
  return `<article class="dossier-row" data-dossier-id="${acceptanceEscape(record.id)}" data-work-item-id="${acceptanceEscape(record.workItemId)}" data-dossier-status="${acceptanceEscape(record.status)}"><span class="dossier-icon">▤</span><div class="dossier-main"><strong>${acceptanceEscape(record.id)} · ${acceptanceEscape(record.workName)}</strong><small>${acceptanceEscape(record.quantity)} ${acceptanceEscape(record.unit)} · ${acceptanceEscape(record.qualityLabel)} · ${acceptanceDate(record.updatedDate)}</small><span class="dossier-evidence">${evidenceText}</span></div><span class="acceptance-status ${className}">${label}</span></article>`;
}

acceptanceRead("dossiers").slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-dossier-id="${CSS.escape(record.id)}"]`)) return;
  const status = dossierStatusMap[record.id] || record.status;
  record.status = status;
  document.querySelector("#dossierList").insertAdjacentHTML("afterbegin", renderDossier(record));
  updateDossierOptions(record);
});

const latestMeasurements = new Map();
acceptanceRead("measurements").forEach((record) => { if (!latestMeasurements.has(record.workItemId)) latestMeasurements.set(record.workItemId, record); });
latestMeasurements.forEach((record, itemId) => {
  const row = document.querySelector(`[data-work-item-id="${CSS.escape(itemId)}"]`);
  if (!row) return;
  row.querySelector("[data-measured-quantity]").dataset.measuredQuantity = String(record.quantity);
  row.querySelector("[data-measured-quantity]").textContent = `${Number(record.quantity).toLocaleString("vi-VN")} ${record.unit}`;
  const quality = row.querySelector(".quality-chip");
  quality.textContent = record.result === "passed" ? "Kiểm tra đạt" : record.result === "conditional" ? "Đạt có điều kiện" : "Không đạt";
  quality.className = `quality-chip ${record.result === "passed" ? "quality-passed" : "quality-pending"}`;
});

function renderNcr(record) {
  return `<article class="nonconformity-row" data-nonconformity-id="${acceptanceEscape(record.id)}" data-nonconformity-status="${acceptanceEscape(record.status || "open")}"><span class="severity-mark ${record.severity === "major" ? "major" : "minor"}">!</span><div><strong>${acceptanceEscape(record.description)}</strong><small>${acceptanceEscape(record.id)} · ${acceptanceEscape(record.workName)} · Hạn khắc phục ${acceptanceDate(record.dueDate)}</small><small class="corrective-summary">${acceptanceEscape(record.action || "Chưa cập nhật biện pháp khắc phục")}</small></div><button class="row-action close-nonconformity" type="button" data-close-nonconformity="${acceptanceEscape(record.id)}">${record.status === "closed" ? "Đã đóng" : "Đóng"}</button></article>`;
}
acceptanceRead("nonconformities").slice().reverse().forEach((record) => {
  if (!document.querySelector(`[data-nonconformity-id="${CSS.escape(record.id)}"]`)) document.querySelector("#nonconformityList").insertAdjacentHTML("afterbegin", renderNcr(record));
});
const nonconformityStatusMap = acceptanceRead("nonconformity-statuses", {});
document.querySelectorAll("#nonconformityList [data-nonconformity-id]").forEach((row) => {
  if (nonconformityStatusMap[row.dataset.nonconformityId] === "closed") {
    row.dataset.nonconformityStatus = "closed";
    const button = row.querySelector("[data-close-nonconformity]"); button.textContent = "Đã đóng"; button.disabled = true;
    row.querySelector(".severity-mark").className = "severity-mark minor";
  }
});

acceptanceRead("archive").slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-archive-id="${CSS.escape(record.id)}"]`)) return;
  document.querySelector("#acceptanceArchive").insertAdjacentHTML("afterbegin", `<article class="archive-row" data-archive-id="${acceptanceEscape(record.id)}"><span class="archive-file-icon">▤</span><div><strong>${acceptanceEscape(record.id)} · ${acceptanceEscape(record.title)}</strong><small>${acceptanceEscape(record.workName)} · ${acceptanceEscape(record.quantity)} ${acceptanceEscape(record.unit)} · Lưu ngày ${acceptanceDate(record.archivedDate)}</small></div><span class="archive-tag">Đã lưu hồ sơ</span></article>`);
});

acceptanceRead("meetings").slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-acceptance-event-id="${CSS.escape(record.id)}"]`)) return;
  const [, month, day] = record.date.split("-");
  document.querySelector("#acceptanceHistory").insertAdjacentHTML("afterbegin", `<article class="history-row" data-acceptance-event-id="${acceptanceEscape(record.id)}"><span class="history-date"><strong>${day}</strong><small>THG ${month}</small></span><div><strong>${acceptanceEscape(record.title)}</strong><small>${acceptanceEscape(record.participant)} · ${acceptanceEscape(record.resultLabel)}</small></div><span class="acceptance-status ${record.result === "accepted" ? "status-accepted" : "status-working"}">${acceptanceEscape(record.resultLabel)}</span></article>`);
});
refreshAcceptanceMetrics();

document.querySelector("#workItemStatusFilter").addEventListener("change", (event) => {
  let visible = 0;
  document.querySelectorAll("#workItemRows tr").forEach((row) => {
    row.hidden = event.target.value !== "all" && row.dataset.status !== event.target.value;
    if (!row.hidden) visible++;
  });
  document.querySelector("#workItemCountLabel").textContent = `Hiển thị ${visible} hạng mục`;
});

document.querySelector("#workItemRows").addEventListener("click", (event) => {
  const measure = event.target.closest("[data-measure-item]");
  const create = event.target.closest("[data-create-dossier-for]");
  if (measure) {
    const itemId = measure.dataset.measureItem;
    const row = document.querySelector(`[data-work-item-id="${CSS.escape(itemId)}"]`);
    document.querySelector("#measurementWorkItem").value = itemId;
    document.querySelector("#measuredQuantityInput").value = row.querySelector("[data-measured-quantity]").dataset.measuredQuantity;
    switchAcceptanceTab("work-items");
    document.querySelector("#quantityMeasurementForm").scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelector("#measurementInspector").focus();
  }
  if (create) {
    document.querySelector("#dossierWorkItem").value = create.dataset.createDossierFor;
    switchAcceptanceTab("dossiers");
    document.querySelector("#acceptanceDossierForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

document.querySelector("#quantityMeasurementForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const itemId = data.get("work_item_id");
  const row = document.querySelector(`[data-work-item-id="${CSS.escape(itemId)}"]`);
  const quantity = Number(data.get("measured_quantity"));
  const result = data.get("quality_result");
  const planned = Number(row.children[1].textContent.replace(/[^\d,\.]/g, "").replace(/\./g, "").replace(",", "."));
  if (planned && quantity > planned) return acceptanceToast("Khối lượng nghiệm thu không thể vượt khối lượng hợp đồng");
  const unit = row.children[1].textContent.replace(/[\d,.\s]/g, "");
  row.querySelector("[data-measured-quantity]").dataset.measuredQuantity = String(quantity);
  row.querySelector("[data-measured-quantity]").textContent = `${quantity.toLocaleString("vi-VN")} ${unit}`;
  const quality = row.querySelector(".quality-chip");
  quality.textContent = result === "passed" ? "Kiểm tra đạt" : result === "conditional" ? "Đạt có điều kiện" : "Không đạt";
  quality.className = `quality-chip ${result === "passed" ? "quality-passed" : "quality-pending"}`;
  setWorkItemStatus(row, result === "passed" ? "ready" : "in-progress");
  const state = row.querySelector(".acceptance-status");
  state.textContent = result === "passed" ? "Sẵn sàng nghiệm thu" : "Đang khắc phục";
  state.className = `acceptance-status ${result === "passed" ? "status-ready" : "status-working"}`;
  const record = { id: `MEAS-${String(Date.now()).slice(-5)}`, workItemId: itemId, quantity, unit, result, inspector: data.get("inspector"), standard: data.get("standard_reference"), notes: data.get("notes") };
  acceptanceSave("measurements", record);
  refreshAcceptanceMetrics();
  form.reset();
  acceptanceToast("Đã lưu khối lượng và kết quả kiểm tra");
});

document.querySelector("#acceptanceDossierForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const itemId = data.get("work_item_id");
  const workRow = document.querySelector(`[data-work-item-id="${CSS.escape(itemId)}"]`);
  const workName = workRow.querySelector("td:first-child strong").textContent;
  const quantity = Number(data.get("measured_quantity"));
  const unit = data.get("unit").trim();
  const result = data.get("quality_result");
  const evidence = Object.fromEntries([...form.querySelectorAll("[data-evidence-key]")].map((input) => [input.dataset.evidenceKey, input.checked]));
  const allEvidence = Object.values(evidence).every(Boolean);
  const status = result === "passed" && allEvidence ? "internal_ready" : "draft";
  const qualityLabel = result === "passed" ? "Kiểm tra đạt" : result === "conditional" ? "Đạt có điều kiện" : "Không đạt";
  const record = { id: `NT-${String(Date.now()).slice(-5)}`, workItemId: itemId, workName, quantity, unit, qualityResult: result, qualityLabel, inspector: data.get("inspector"), inspectionDate: data.get("inspection_date"), standard: data.get("standard_reference"), notes: data.get("quality_notes"), evidence, status, updatedDate: data.get("inspection_date") };
  acceptanceSave("dossiers", record);
  document.querySelector("#dossierList").insertAdjacentHTML("afterbegin", renderDossier(record));
  updateDossierOptions(record);
  refreshAcceptanceMetrics();
  form.reset(); document.querySelector("#dossierInspectionDate").value = "2026-11-18";
  acceptanceToast(status === "internal_ready" ? "Đã tạo hồ sơ đầy đủ, sẵn sàng nghiệm thu nội bộ" : "Đã lưu bản nháp hồ sơ nghiệm thu");
});

document.querySelector("#internalAcceptanceForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const dossierId = data.get("dossier_id");
  const dossier = document.querySelector(`[data-dossier-id="${CSS.escape(dossierId)}"]`);
  if (!dossier || dossier.dataset.dossierStatus !== "internal-ready") return acceptanceToast("Hồ sơ cần đủ chứng cứ và kiểm tra đạt trước khi nghiệm thu nội bộ");
  const result = data.get("result");
  const workName = dossier.querySelector(".dossier-main strong").textContent.split(" · ").slice(1).join(" · ");
  const record = { id: `INT-${String(Date.now()).slice(-5)}`, dossierId, date: data.get("acceptance_date"), participant: data.get("lead_name"), result, resultLabel: result === "passed" ? "Nội bộ đạt · Chờ chủ đầu tư" : "Chưa đạt · Cần khắc phục", title: `Nghiệm thu nội bộ · ${workName}`, notes: data.get("notes") };
  acceptanceSave("meetings", record);
  const [month, day] = record.date.split("-").slice(1);
  document.querySelector("#acceptanceHistory").insertAdjacentHTML("afterbegin", `<article class="history-row" data-acceptance-event-id="${record.id}"><span class="history-date"><strong>${day}</strong><small>THG ${month}</small></span><div><strong>Nghiệm thu nội bộ · ${acceptanceEscape(workName)}</strong><small>${acceptanceEscape(record.participant)} · ${acceptanceEscape(record.resultLabel)}</small></div><span class="acceptance-status ${result === "passed" ? "status-ready" : "status-working"}">${acceptanceEscape(record.resultLabel)}</span></article>`);
  updateDossierState(dossier, result === "passed" ? "waiting_external" : "needs_rework");
  form.reset(); document.querySelector("#internalAcceptanceDate").value = "2026-11-18";
  acceptanceToast(result === "passed" ? "Đã duyệt nội bộ, có thể mời chủ đầu tư / TVGS" : "Nghiệm thu nội bộ chưa đạt, cần ghi nhận khắc phục");
});

document.querySelector("#externalAcceptanceForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const dossierId = data.get("dossier_id");
  const dossier = document.querySelector(`[data-dossier-id="${CSS.escape(dossierId)}"]`);
  if (!dossier || dossier.dataset.dossierStatus !== "waiting_external") return acceptanceToast("Cần hoàn tất nghiệm thu nội bộ trước bước này");
  const result = data.get("result");
  const labels = { accepted: "Chấp thuận nghiệm thu", conditional: "Chấp thuận có điều kiện", rejected: "Không chấp thuận" };
  const workName = dossier.querySelector(".dossier-main strong").textContent.split(" · ").slice(1).join(" · ");
  const record = { id: `EXT-${String(Date.now()).slice(-5)}`, dossierId, date: data.get("acceptance_date"), participant: data.get("external_representative"), minutes: data.get("minutes_number"), result, resultLabel: labels[result], title: `Nghiệm thu chủ đầu tư / TVGS · ${workName}`, notes: data.get("notes") };
  acceptanceSave("meetings", record);
  const [, month, day] = record.date.split("-");
  document.querySelector("#acceptanceHistory").insertAdjacentHTML("afterbegin", `<article class="history-row" data-acceptance-event-id="${record.id}"><span class="history-date"><strong>${day}</strong><small>THG ${month}</small></span><div><strong>Nghiệm thu chủ đầu tư / TVGS · ${acceptanceEscape(workName)}</strong><small>${acceptanceEscape(record.participant)} · ${acceptanceEscape(record.minutes)}</small></div><span class="acceptance-status ${result === "accepted" ? "status-accepted" : "status-working"}">${acceptanceEscape(record.resultLabel)}</span></article>`);
  if (result === "accepted") {
    updateDossierState(dossier, "accepted");
    const item = document.querySelector(`[data-work-item-id="${CSS.escape(dossier.dataset.workItemId)}"]`);
    if (item) setWorkItemStatus(item, "accepted");
    archiveAcceptedDossier(dossier, record, workName);
  } else {
    updateDossierState(dossier, result === "conditional" ? "conditional" : "needs_rework");
  }
  form.reset();
  acceptanceToast(result === "accepted" ? "Đã nghiệm thu và lưu biên bản" : `Đã ghi nhận kết quả: ${labels[result]}`);
});

function archiveAcceptedDossier(dossier, externalRecord, workName) {
  const archiveId = `ARC-${externalRecord.id.slice(-5)}`;
  const record = { id: archiveId, dossierId: dossier.dataset.dossierId, title: externalRecord.minutes, workName, quantity: dossier.querySelector(".dossier-main small").textContent.split(" ")[0], unit: dossier.querySelector(".dossier-main small").textContent.split(" ")[1], archivedDate: externalRecord.date };
  const archive = acceptanceRead("archive"); archive.unshift(record); acceptanceWrite("archive", archive);
  document.querySelector("#acceptanceArchive").insertAdjacentHTML("afterbegin", `<article class="archive-row" data-archive-id="${archiveId}"><span class="archive-file-icon">▤</span><div><strong>${acceptanceEscape(archiveId)} · ${acceptanceEscape(record.title)}</strong><small>${acceptanceEscape(workName)} · ${acceptanceEscape(record.quantity)} ${acceptanceEscape(record.unit)} · Lưu ngày ${acceptanceDate(record.archivedDate)}</small></div><span class="archive-tag">Đã lưu hồ sơ</span></article>`);
}

document.querySelector("#nonconformityForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const workId = data.get("work_item_id");
  const workRow = document.querySelector(`[data-work-item-id="${CSS.escape(workId)}"]`);
  const record = { id: `NCR-${String(Date.now()).slice(-5)}`, workItemId: workId, workName: workRow.querySelector("td:first-child strong").textContent, date: data.get("recorded_date"), dueDate: data.get("due_date"), severity: data.get("severity"), description: data.get("description").trim(), action: data.get("corrective_action").trim(), status: "open" };
  acceptanceSave("nonconformities", record);
  document.querySelector("#nonconformityList").insertAdjacentHTML("afterbegin", renderNcr(record));
  refreshAcceptanceMetrics();
  form.reset(); document.querySelector("#nonconformityDate").value = "2026-11-18";
  acceptanceToast("Đã ghi nhận điểm chưa phù hợp");
});

document.querySelector("#nonconformityList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-close-nonconformity]");
  if (!button) return;
  const row = button.closest("[data-nonconformity-id]");
  if (row.dataset.nonconformityStatus === "closed") return;
  row.dataset.nonconformityStatus = "closed";
  button.textContent = "Đã đóng";
  button.disabled = true;
  row.querySelector(".severity-mark").className = "severity-mark minor";
  const records = acceptanceRead("nonconformities");
  const record = records.find((item) => item.id === row.dataset.nonconformityId);
  if (record) { record.status = "closed"; acceptanceWrite("nonconformities", records); }
  const statusMap = acceptanceRead("nonconformity-statuses", {}); statusMap[row.dataset.nonconformityId] = "closed"; acceptanceWrite("nonconformity-statuses", statusMap);
  refreshAcceptanceMetrics();
  acceptanceToast("Đã đánh dấu điểm chưa phù hợp đã khắc phục");
});

document.querySelectorAll("[data-create-dossier-for]").forEach((button) => button.addEventListener("click", () => {
  document.querySelector("#dossierWorkItem").value = button.dataset.createDossierFor;
  switchAcceptanceTab("dossiers");
  document.querySelector("#acceptanceDossierForm").scrollIntoView({ behavior: "smooth", block: "center" });
}));

document.querySelector("#exportAcceptanceArchive").addEventListener("click", () => {
  const rows = [["Mã lưu trữ", "Biên bản", "Hạng mục", "Khối lượng", "Ngày lưu"]];
  document.querySelectorAll("#acceptanceArchive [data-archive-id]").forEach((row) => rows.push([row.dataset.archiveId, row.querySelector("strong").textContent, row.querySelector("small").textContent, "", ""]));
  const csv = "\uFEFF" + rows.map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = "ho-so-nghiem-thu.csv"; link.click(); URL.revokeObjectURL(link.href);
  acceptanceToast("Đã xuất danh sách hồ sơ nghiệm thu");
});

document.querySelector("#acceptanceMore").addEventListener("click", () => acceptanceToast("Các thao tác bổ sung sẽ được cấu hình cùng backend"));
