const constructionRoot = document.querySelector("#constructionWorkspace");
const projectId = constructionRoot.dataset.projectId;

function constructionToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(constructionToast.timer);
  constructionToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function activateTab(tabId) {
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

document.querySelectorAll("[data-tab-target]").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.tabTarget)));
document.querySelectorAll("[data-open-tab]").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.openTab)));

function saveRecord(key, record) {
  const storageKey = `construction:${projectId}:${key}`;
  const records = JSON.parse(localStorage.getItem(storageKey) || "[]");
  records.unshift(record);
  localStorage.setItem(storageKey, JSON.stringify(records));
}

function restoreRecords(key, listId, renderRecord) {
  const records = JSON.parse(localStorage.getItem(`construction:${projectId}:${key}`) || "[]");
  const list = document.querySelector(`#${listId}`);
  records.slice().reverse().forEach((record) => list.insertAdjacentHTML("afterbegin", renderRecord(record)));
  return records.length;
}

function dateLabel(value) {
  if (!value) return "Hôm nay";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const weatherNames = { sunny: "☀ Nắng", cloudy: "☁ Nhiều mây", rain: "☂ Mưa", other: "Thời tiết khác" };
const savedDiaryCount = restoreRecords("site-diary", "diaryFeed", (record) => `<article class="diary-entry" data-record-id="${escapeHTML(record.id)}"><span class="diary-entry-marker"></span><div><div class="diary-entry-head"><strong>${escapeHTML(record.work)}</strong><time>${escapeHTML(record.date)} · vừa cập nhật</time></div><p>${escapeHTML(record.issues || "Không ghi nhận vướng mắc.")}</p><div class="diary-entry-meta"><span>${escapeHTML(weatherNames[record.weather] || record.weather)}</span><span>${escapeHTML(record.workers)} nhân lực</span><span>${escapeHTML(record.shift)}</span></div></div></article>`);
const savedMaterialCount = restoreRecords("material-requests", "materialRequestList", (record) => `<article class="material-request" data-request-id="${escapeHTML(record.id)}"><div class="request-icon">▦</div><div class="request-main"><div><strong>${escapeHTML(record.item)}</strong><span class="request-status status-pending">Chờ duyệt</span></div><small>${escapeHTML(record.quantity)} ${escapeHTML(record.unit)} · Cần trước ${escapeHTML(dateLabel(record.needDate))}</small><small class="request-code">${escapeHTML(record.id)} · Đã gửi Ban chỉ huy</small></div><span class="request-priority">${record.priority === "urgent" ? "Gấp" : "Thường"}</span></article>`);
const savedQualityCount = restoreRecords("quality-inspections", "qualityRecordList", (record) => `<article class="quality-record" data-record-id="${escapeHTML(record.id)}"><span class="record-check">${record.result === "fail" ? "!" : "✓"}</span><div><strong>${escapeHTML(record.item)}</strong><small>${escapeHTML(record.resultLabel)} · ${escapeHTML(dateLabel(record.date))} · ${escapeHTML(record.inspector)}</small></div><span class="record-code">${escapeHTML(record.id)}</span></article>`);
const savedSafetyCount = restoreRecords("safety-records", "safetyRecordList", (record) => `<article class="safety-record" data-record-id="${escapeHTML(record.id)}"><span class="record-check">${record.type === "incident" ? "!" : "✓"}</span><div><strong>${escapeHTML(record.description)}</strong><small>${record.type === "incident" ? "Sự cố / gần xảy ra sự cố" : "Kiểm tra định kỳ"} · ${escapeHTML(dateLabel(record.date))} · ${escapeHTML(record.reporter)}</small></div><span class="record-code">${escapeHTML(record.id)}</span></article>`);
const savedChangeCount = restoreRecords("change-requests", "changeRecordList", (record) => `<article class="change-record" data-record-id="${escapeHTML(record.id)}"><div class="change-marker">↔</div><div><strong>${escapeHTML(record.title)}</strong><small>${escapeHTML(record.typeLabel)} · ${escapeHTML(dateLabel(record.date))} · Mới ghi nhận</small></div><span class="request-status status-pending">Mới</span></article>`);
const savedMeetingCount = restoreRecords("site-meetings", "meetingRecordList", (record) => { const [, month, day] = record.date.split("-"); return `<article class="meeting-record" data-record-id="${escapeHTML(record.id)}"><span class="meeting-date-badge"><strong>${escapeHTML(day)}</strong><small>THG ${escapeHTML(month)}</small></span><div><strong>${escapeHTML(record.title)}</strong><small>Chủ trì: ${escapeHTML(record.chair)} · ${escapeHTML(record.attendees || "Chưa cập nhật người tham dự")}</small></div></article>`; });

document.querySelector("#diaryFeedCount").textContent = `Diễn biến công trường · ${savedDiaryCount + 2} bản ghi`;
document.querySelector("#materialRequestCount").textContent = `${savedMaterialCount + 3} yêu cầu vật tư`;
document.querySelector("#openMaterialRequests").textContent = String(savedMaterialCount + 3).padStart(2, "0");
document.querySelector("#materialTabCount").textContent = String(savedMaterialCount + 3).padStart(2, "0");
const savedSafetyRecords = JSON.parse(localStorage.getItem(`construction:${projectId}:safety-records`) || "[]");
document.querySelector("#safetyIncidentCount").textContent = String(savedSafetyRecords.filter((record) => record.type === "incident").length).padStart(2, "0");

document.querySelector("#siteDiaryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const record = {
    id: `DIARY-${Date.now()}`,
    date: data.get("diary_date"),
    weather: data.get("weather"),
    workers: data.get("worker_count"),
    shift: form.querySelector("#diaryShift").selectedOptions[0].textContent,
    work: data.get("work_description").trim(),
    issues: data.get("issues").trim(),
  };
  saveRecord("site-diary", record);
  document.querySelector("#diaryFeed").insertAdjacentHTML("afterbegin", `<article class="diary-entry" data-record-id="${record.id}"><span class="diary-entry-marker"></span><div><div class="diary-entry-head"><strong>${escapeHTML(record.work)}</strong><time>${dateLabel(record.date)} · vừa cập nhật</time></div><p>${escapeHTML(record.issues || "Không ghi nhận vướng mắc.")}</p><div class="diary-entry-meta"><span>${escapeHTML(weatherNames[record.weather])}</span><span>${escapeHTML(record.workers)} nhân lực</span><span>${escapeHTML(record.shift)}</span></div></div></article>`);
  document.querySelector("#diaryFeedCount").textContent = `Diễn biến công trường · ${document.querySelectorAll("#diaryFeed .diary-entry").length} bản ghi`;
  form.reset();
  form.querySelector("#diaryDate").value = "2026-11-18";
  constructionToast("Đã lưu nhật ký công trình");
});

document.querySelectorAll("[data-save-quantity]").forEach((button) => button.addEventListener("click", () => {
  const itemKey = button.dataset.saveQuantity;
  const row = document.querySelector(`[data-work-item-id="${itemKey}"]`);
  const input = row.querySelector(`[data-quantity-key="${itemKey}"]`);
  const dailyValue = Number(input.value);
  const planned = Number(row.querySelector("[data-planned-quantity]").dataset.plannedQuantity);
  const cumulativeCell = row.querySelector("[data-completed-quantity]");
  const cumulative = Number(cumulativeCell.dataset.completedQuantity);
  if (!Number.isFinite(dailyValue) || dailyValue <= 0) return constructionToast("Nhập khối lượng hôm nay lớn hơn 0");
  if (cumulative + dailyValue > planned) return constructionToast("Khối lượng lũy kế không thể vượt khối lượng hợp đồng");
  const updated = cumulative + dailyValue;
  const percent = Math.round((updated / planned) * 100);
  cumulativeCell.dataset.completedQuantity = String(updated);
  cumulativeCell.textContent = updated.toLocaleString("vi-VN");
  row.querySelector(".quantity-progress span").textContent = `${percent}%`;
  row.querySelector(".quantity-progress b").style.width = `${percent}%`;
  const projectPercent = currentProgress();
  document.querySelector("#projectProgressLabel").innerHTML = `${projectPercent}% <small>hoàn thành</small>`;
  document.querySelector("#projectProgressBar").style.width = `${projectPercent}%`;
  document.querySelector("#overallProgressValue").innerHTML = `${projectPercent}%`;
  input.value = "";
  input.placeholder = "Đã cập nhật";
  button.textContent = "✓ Đã lưu";
  setTimeout(() => { button.textContent = "Cập nhật"; }, 1800);
  constructionToast("Đã cập nhật khối lượng thực hiện");
}));

function currentProgress() {
  const rows = [...document.querySelectorAll("#quantityTable tbody tr")];
  const weighted = rows.reduce((total, row) => {
    const planned = Number(row.querySelector("[data-planned-quantity]").dataset.plannedQuantity);
    const completed = Number(row.querySelector("[data-completed-quantity]").dataset.completedQuantity);
    return total + (completed / planned) / rows.length;
  }, 0);
  return Math.round(weighted * 100);
}

document.querySelector("#generateProgressReport").addEventListener("click", () => {
  const percent = currentProgress();
  const report = `Công trình CT-2026-002 đạt ${percent}% tiến độ tổng thể. Có ${document.querySelectorAll("#diaryFeed .diary-entry").length} nhật ký hiện trường, ${document.querySelectorAll("#materialRequestList .material-request").length} yêu cầu vật tư và ${document.querySelectorAll("#qualityRecordList .quality-record").length} biên bản kiểm tra chất lượng được ghi nhận.`;
  document.querySelector("#projectProgressLabel").innerHTML = `${percent}% <small>hoàn thành</small>`;
  document.querySelector("#projectProgressBar").style.width = `${percent}%`;
  document.querySelector("#progressReportText").textContent = report;
  document.querySelector("#progressReportPreview").hidden = false;
  constructionToast("Đã tổng hợp báo cáo tiến độ nháp");
});

document.querySelector("#copyProgressReport").addEventListener("click", async () => {
  const text = document.querySelector("#progressReportText").textContent;
  try { await navigator.clipboard.writeText(text); constructionToast("Đã sao chép báo cáo"); }
  catch { constructionToast("Trình duyệt chưa cấp quyền sao chép"); }
});

document.querySelector("#materialRequestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const record = { id: `REQ-${String(Date.now()).slice(-5)}`, item: data.get("item_name").trim(), quantity: data.get("quantity"), unit: data.get("unit").trim(), needDate: data.get("need_date"), priority: data.get("priority"), note: data.get("note").trim() };
  saveRecord("material-requests", record);
  document.querySelector("#materialRequestList").insertAdjacentHTML("afterbegin", `<article class="material-request" data-request-id="${record.id}"><div class="request-icon">▦</div><div class="request-main"><div><strong>${escapeHTML(record.item)}</strong><span class="request-status status-pending">Chờ duyệt</span></div><small>${escapeHTML(record.quantity)} ${escapeHTML(record.unit)} · Cần trước ${dateLabel(record.needDate)}</small><small class="request-code">${record.id} · Đã gửi Ban chỉ huy</small></div><span class="request-priority">${record.priority === "urgent" ? "Gấp" : "Thường"}</span></article>`);
  updateMaterialCount();
  form.reset();
  constructionToast("Đã gửi yêu cầu đến Phòng Vật tư");
});

function updateMaterialCount() {
  const count = document.querySelectorAll("#materialRequestList .material-request").length;
  document.querySelector("#materialRequestCount").textContent = `${count} yêu cầu vật tư`;
  document.querySelector("#openMaterialRequests").textContent = String(count).padStart(2, "0");
  document.querySelector("#materialTabCount").textContent = String(count).padStart(2, "0");
}

document.querySelector("#qualityInspectionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const results = { pass: "Đạt", conditional: "Đạt có điều kiện", fail: "Không đạt" };
  const record = { id: `QC-${String(Date.now()).slice(-3)}`, item: data.get("inspection_item").trim(), date: data.get("inspection_date"), inspector: data.get("inspector").trim(), result: data.get("inspection_result"), resultLabel: results[data.get("inspection_result")] };
  saveRecord("quality-inspections", record);
  document.querySelector("#qualityRecordList").insertAdjacentHTML("afterbegin", `<article class="quality-record" data-record-id="${record.id}"><span class="record-check">${record.result === "fail" ? "!" : "✓"}</span><div><strong>${escapeHTML(record.item)}</strong><small>${escapeHTML(record.resultLabel)} · ${dateLabel(record.date)} · ${escapeHTML(record.inspector)}</small></div><span class="record-code">${record.id}</span></article>`);
  form.reset();
  constructionToast("Đã lưu biên bản kiểm tra chất lượng");
});

document.querySelector("#safetyReportForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const record = { id: `ATLĐ-${String(Date.now()).slice(-3)}`, type: data.get("safety_record_type"), date: data.get("safety_date"), description: data.get("safety_description").trim(), reporter: data.get("safety_reporter").trim() };
  saveRecord("safety-records", record);
  document.querySelector("#safetyRecordList").insertAdjacentHTML("afterbegin", `<article class="safety-record" data-record-id="${record.id}"><span class="record-check">${record.type === "incident" ? "!" : "✓"}</span><div><strong>${escapeHTML(record.description)}</strong><small>${record.type === "incident" ? "Sự cố / gần xảy ra sự cố" : "Kiểm tra định kỳ"} · ${dateLabel(record.date)} · ${escapeHTML(record.reporter)}</small></div><span class="record-code">${record.id}</span></article>`);
  if (record.type === "incident") {
    const incidents = Number(document.querySelector("#safetyIncidentCount").textContent) + 1;
    document.querySelector("#safetyIncidentCount").textContent = String(incidents).padStart(2, "0");
  }
  form.reset();
  constructionToast(record.type === "incident" ? "Đã lưu báo cáo sự cố an toàn" : "Đã lưu kiểm tra an toàn định kỳ");
});

document.querySelector("#changeRequestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const types = { design: "Thay đổi thiết kế", quantity: "Thay đổi khối lượng", "site-condition": "Điều kiện hiện trường", other: "Khác" };
  const record = { id: `CHG-${String(Date.now()).slice(-4)}`, title: data.get("change_title").trim(), type: data.get("change_type"), typeLabel: types[data.get("change_type")], date: data.get("change_date"), description: data.get("change_description").trim() };
  saveRecord("change-requests", record);
  document.querySelector("#changeRecordList").insertAdjacentHTML("afterbegin", `<article class="change-record" data-record-id="${record.id}"><div class="change-marker">↔</div><div><strong>${escapeHTML(record.title)}</strong><small>${escapeHTML(record.typeLabel)} · ${dateLabel(record.date)} · Mới ghi nhận</small></div><span class="request-status status-pending">Mới</span></article>`);
  form.reset();
  constructionToast("Đã ghi nhận phát sinh / thay đổi");
});

document.querySelector("#siteMeetingForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const record = { id: `MTG-${String(Date.now()).slice(-4)}`, date: data.get("meeting_date"), chair: data.get("meeting_chair").trim(), title: `Giao ban công trường · ${data.get("meeting_notes").trim().slice(0, 70)}`, attendees: data.get("meeting_attendees").trim() || "Chưa cập nhật người tham dự", notes: data.get("meeting_notes").trim() };
  saveRecord("site-meetings", record);
  const [, month, day] = record.date.split("-");
  document.querySelector("#meetingRecordList").insertAdjacentHTML("afterbegin", `<article class="meeting-record" data-record-id="${record.id}"><span class="meeting-date-badge"><strong>${day}</strong><small>THG ${month}</small></span><div><strong>${escapeHTML(record.title)}</strong><small>Chủ trì: ${escapeHTML(record.chair)} · ${escapeHTML(record.attendees)}</small></div></article>`);
  form.reset();
  constructionToast("Đã lưu biên bản họp giao ban");
});

document.querySelector("#constructionMore").addEventListener("click", () => constructionToast("Các thao tác bổ sung sẽ được cấu hình cùng backend"));
