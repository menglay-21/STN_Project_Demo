const paymentRoot = document.querySelector("#paymentWorkspace");
const paymentProjectId = paymentRoot.dataset.projectId;
const paymentPrefix = `payment:${paymentProjectId}:`;

function paymentToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(paymentToast.timer);
  paymentToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function paymentEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function paymentRead(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(`${paymentPrefix}${key}`) || "null") ?? fallback; }
  catch { return fallback; }
}

function paymentWrite(key, value) {
  localStorage.setItem(`${paymentPrefix}${key}`, JSON.stringify(value));
}

function paymentSave(key, record) {
  const records = paymentRead(key); records.unshift(record); paymentWrite(key, records);
}

function formatVnd(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

function formatPaymentDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function activatePaymentTab(tabId) {
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
document.querySelectorAll("[data-tab-target]").forEach((button) => button.addEventListener("click", () => activatePaymentTab(button.dataset.tabTarget)));

const paymentStatusInfo = {
  draft: ["Bản nháp", "status-review"],
  "internal-review": ["Chờ duyệt nội bộ", "status-review"],
  approved: ["Đã duyệt nội bộ", "status-approved"],
  submitted: ["Đã gửi chủ đầu tư", "status-submitted"],
  "partially-paid": ["Đã thanh toán một phần", "status-partial"],
  paid: ["Đã thanh toán", "status-paid"],
  disputed: ["Có chênh lệch", "status-overdue"],
};

function renderPaymentActions(id, status) {
  if (status === "draft") return `<button class="payment-action submit-for-review" type="button" data-submit-review="${paymentEscape(id)}">Trình duyệt</button>`;
  if (status === "internal-review") return `<button class="payment-action approve-payment" type="button" data-approve-payment="${paymentEscape(id)}">Duyệt hồ sơ</button>`;
  if (status === "approved") return `<button class="payment-action send-payment" type="button" data-send-payment="${paymentEscape(id)}">Gửi chủ đầu tư</button>`;
  if (["submitted", "partially-paid"].includes(status)) return `<button class="payment-action receive-payment" type="button" data-open-receipt="${paymentEscape(id)}">Ghi nhận thu tiền</button>`;
  return `<span class="paid-action">Hoàn tất</span>`;
}

function setPaymentStatus(row, status, sentDate) {
  row.dataset.paymentStatus = status;
  const [label, className] = paymentStatusInfo[status] || paymentStatusInfo.draft;
  const badge = row.querySelector(".payment-status");
  badge.textContent = label; badge.className = `payment-status ${className}`;
  if (sentDate) {
    row.querySelector("td:nth-child(4) strong").textContent = formatPaymentDate(sentDate);
    row.querySelector("td:nth-child(4) small").textContent = "Đã gửi chủ đầu tư";
  }
  row.querySelector("td:last-child").innerHTML = renderPaymentActions(row.dataset.applicationId, status);
  const statuses = paymentRead("application-statuses", {}); statuses[row.dataset.applicationId] = { status, sentDate: sentDate || statuses[row.dataset.applicationId]?.sentDate || "" }; paymentWrite("application-statuses", statuses);
  updatePaymentMetrics();
}

function updatePaymentMetrics() {
  const rows = [...document.querySelectorAll("#paymentApplicationRows tr")];
  const active = rows.filter((row) => !["paid"].includes(row.dataset.paymentStatus)).length;
  const amount = rows.filter((row) => !["paid"].includes(row.dataset.paymentStatus)).reduce((total, row) => total + Number(row.dataset.requestedAmount || 0), 0);
  document.querySelector("#activeApplicationCount").textContent = String(active).padStart(2, "0");
  document.querySelector("#requestedAmountTotal").innerHTML = `${(amount / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} <small>tỷ</small>`;
  document.querySelector("#applicationBadge").textContent = String(rows.length);
  document.querySelector("#applicationCountLabel").textContent = `Hiển thị ${rows.length} hồ sơ`;
}

function setReceivableStatus(row, status, paidAmount) {
  row.dataset.receivableStatus = status;
  const badge = row.querySelector(".receivable-status");
  if (status === "paid") { badge.textContent = "Đã thanh toán"; badge.className = "receivable-status status-paid"; }
  else if (status === "partially-paid") { badge.textContent = "Đã thanh toán một phần"; badge.className = "receivable-status status-due"; }
  else { badge.textContent = Number(row.dataset.daysOverdue) > 0 ? `Quá hạn ${row.dataset.daysOverdue} ngày` : "Chưa đến hạn"; badge.className = `receivable-status ${Number(row.dataset.daysOverdue) > 0 ? "status-overdue" : "status-due"}`; }
  if (paidAmount !== undefined) row.dataset.paidAmount = String(paidAmount);
}

function updateReceivableTotal() {
  const total = [...document.querySelectorAll("#receivableList [data-receivable-id]")].reduce((sum, row) => {
    const appId = row.dataset.applicationId || row.dataset.receivableId.replace(/^AR-/, "PA-");
    const app = paymentRead("applications", []).find((item) => item.id === appId);
    const requested = Number(app?.requestedAmount || row.dataset.requestedAmount || 0);
    const paid = Number(row.dataset.paidAmount || 0);
    return sum + Math.max(0, requested - paid);
  }, 0);
  if (total) document.querySelector("#receivableAmountTotal").innerHTML = `${(total / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} <small>tỷ</small>`;
}

const statusMap = paymentRead("application-statuses", {});
document.querySelectorAll("#paymentApplicationRows [data-application-id]").forEach((row) => {
  if (statusMap[row.dataset.applicationId]) setPaymentStatus(row, statusMap[row.dataset.applicationId].status, statusMap[row.dataset.applicationId].sentDate);
  else row.dataset.requestedAmount = String(row.children[2].textContent.replace(/[^\d]/g, ""));
});

function renderApplicationRow(record) {
  const [statusLabel, statusClass] = paymentStatusInfo[record.status] || paymentStatusInfo.draft;
  return `<tr data-application-id="${paymentEscape(record.id)}" data-payment-status="${paymentEscape(record.status)}" data-requested-amount="${Number(record.requestedAmount)}" data-paid-amount="${Number(record.paidAmount || 0)}"><td><strong>${paymentEscape(record.id)} · ${paymentEscape(record.stageName)}</strong><small>${paymentEscape(record.acceptanceMinutes)} · ${paymentEscape(record.acceptanceReference || "Khối lượng nghiệm thu")}</small></td><td>${Number(record.measuredQuantity || 0).toLocaleString("vi-VN")} ${paymentEscape(record.unit || "")}</td><td class="money-cell">${formatVnd(record.requestedAmount)}</td><td><strong>${formatPaymentDate(record.sentDate)}</strong><small>${record.sentDate ? "Đã gửi chủ đầu tư" : "Chưa gửi chủ đầu tư"}</small></td><td><span class="payment-status ${statusClass}">${statusLabel}</span></td><td>${renderPaymentActions(record.id, record.status)}</td></tr>`;
}

const savedApplications = paymentRead("applications");
savedApplications.slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-application-id="${CSS.escape(record.id)}"]`)) return;
  const savedStatus = paymentRead("application-statuses", {})[record.id];
  if (savedStatus) { record.status = savedStatus.status; record.sentDate = savedStatus.sentDate; }
  document.querySelector("#paymentApplicationRows").insertAdjacentHTML("afterbegin", renderApplicationRow(record));
});

// Import accepted minutes from the acceptance workspace stored in this browser.
const acceptedMinutes = JSON.parse(localStorage.getItem(`acceptance:${paymentProjectId}:archive`) || "[]");
acceptedMinutes.forEach((record) => {
  const select = document.querySelector("#acceptedMinutes");
  if (select.querySelector(`option[value="${CSS.escape(record.id)}"]`)) return;
  select.add(new Option(`${record.id} · ${record.title} · ${record.quantity} ${record.unit}`, record.id), 0);
});

function refreshReceivableRows() {
  paymentRead("receivables", []).slice().reverse().forEach((record) => {
    if (document.querySelector(`[data-receivable-id="${CSS.escape(record.id)}"]`)) return;
    const statusClass = Number(record.daysOverdue) > 0 ? "status-overdue" : "status-due";
    const statusLabel = Number(record.daysOverdue) > 0 ? `Quá hạn ${record.daysOverdue} ngày` : "Chưa đến hạn";
    document.querySelector("#receivableList").insertAdjacentHTML("afterbegin", `<article class="receivable-row" data-receivable-id="${paymentEscape(record.id)}" data-application-id="${paymentEscape(record.applicationId)}" data-days-overdue="${Number(record.daysOverdue || 0)}" data-requested-amount="${Number(record.requestedAmount)}" data-paid-amount="${Number(record.paidAmount || 0)}"><span class="receivable-icon">₫</span><div class="receivable-main"><div><strong>${paymentEscape(record.applicationId)} · ${paymentEscape(record.stageName)}</strong><span class="receivable-status ${statusClass}">${statusLabel}</span></div><small>Đã gửi ${formatPaymentDate(record.sentDate)} · Hạn thanh toán ${formatPaymentDate(record.dueDate)}</small><small>Đề nghị ${formatVnd(record.requestedAmount)} · Đã thu ${formatVnd(record.paidAmount || 0)}</small></div><button class="payment-action receive-payment" type="button" data-open-receipt="${paymentEscape(record.applicationId)}">Ghi nhận thu tiền</button></article>`);
  });
}
refreshReceivableRows();

const receivableStatuses = paymentRead("receivable-statuses", {});
document.querySelectorAll("#receivableList [data-receivable-id]").forEach((row) => {
  const saved = receivableStatuses[row.dataset.receivableId];
  if (saved) { setReceivableStatus(row, saved.status, saved.paidAmount); }
});
updatePaymentMetrics(); updateReceivableTotal();

function refreshReceivableFilter() {
  const filter = document.querySelector("#receivableFilter").value;
  let visible = 0;
  document.querySelectorAll("#receivableList [data-receivable-id]").forEach((row) => {
    const overdue = Number(row.dataset.daysOverdue) > 0 && row.dataset.receivableStatus !== "paid";
    row.hidden = filter === "overdue" ? !overdue : filter === "due" ? overdue : false;
    if (!row.hidden) visible++;
  });
  document.querySelector("#receivablesEmpty").hidden = visible > 0;
}
document.querySelector("#receivableFilter").addEventListener("change", refreshReceivableFilter);

document.querySelector("#paymentApplicationRows").addEventListener("click", (event) => {
  const submit = event.target.closest("[data-submit-review]");
  const approve = event.target.closest("[data-approve-payment]");
  const send = event.target.closest("[data-send-payment]");
  const receive = event.target.closest("[data-open-receipt]");
  if (submit || approve || send) {
    const row = event.target.closest("tr");
    const id = row.dataset.applicationId;
    if (submit) { setPaymentStatus(row, "internal-review"); paymentToast(`Đã gửi hồ sơ ${id} duyệt nội bộ`); }
    if (approve) { setPaymentStatus(row, "approved"); paymentToast(`Đã duyệt nội bộ hồ sơ ${id}`); }
    if (send) {
      const sentDate = "2026-11-18";
      setPaymentStatus(row, "submitted", sentDate);
      createReceivableFromApplication(row, sentDate);
      paymentToast(`Đã ghi nhận gửi hồ sơ ${id} cho chủ đầu tư`);
    }
  }
  if (receive) openPaymentReceipt(receive.dataset.openReceipt);
});

function createReceivableFromApplication(row, sentDate) {
  const id = row.dataset.applicationId;
  const records = paymentRead("applications", []);
  const saved = records.find((record) => record.id === id);
  const requestedAmount = Number(saved?.requestedAmount || row.dataset.requestedAmount || 0);
  const stageName = saved?.stageName || row.querySelector("td:first-child strong").textContent.split(" · ").slice(1).join(" · ");
  const due = new Date(`${sentDate}T00:00:00`); due.setDate(due.getDate() + 15);
  const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
  const receivable = { id: `AR-${id.slice(-5)}`, applicationId: id, stageName, sentDate, dueDate, daysOverdue: 0, requestedAmount, paidAmount: 0, status: "due" };
  const items = paymentRead("receivables");
  if (!items.some((item) => item.applicationId === id)) { items.unshift(receivable); paymentWrite("receivables", items); }
  if (!document.querySelector(`[data-application-id="${CSS.escape(id)}"]`, document.querySelector("#receivableList"))) {
    document.querySelector("#receivableList").insertAdjacentHTML("afterbegin", `<article class="receivable-row" data-receivable-id="${receivable.id}" data-application-id="${id}" data-days-overdue="0" data-requested-amount="${requestedAmount}" data-paid-amount="0"><span class="receivable-icon">₫</span><div class="receivable-main"><div><strong>${paymentEscape(id)} · ${paymentEscape(stageName)}</strong><span class="receivable-status status-due">Chưa đến hạn</span></div><small>Đã gửi ${formatPaymentDate(sentDate)} · Hạn thanh toán ${formatPaymentDate(dueDate)}</small><small>Đề nghị ${formatVnd(requestedAmount)} · Đã thu 0 ₫</small></div><button class="payment-action receive-payment" type="button" data-open-receipt="${paymentEscape(id)}">Ghi nhận thu tiền</button></article>`);
  }
  updateReceivableTotal();
}

function openPaymentReceipt(applicationId) {
  const select = document.querySelector("#receiptApplicationId");
  if (!select.querySelector(`option[value="${CSS.escape(applicationId)}"]`)) {
    const row = document.querySelector(`[data-application-id="${CSS.escape(applicationId)}"]`, document.querySelector("#paymentApplicationRows"));
    const stage = row?.querySelector("td:first-child strong").textContent.split(" · ").slice(1).join(" · ") || applicationId;
    select.add(new Option(`${applicationId} · ${stage}`, applicationId));
  }
  select.value = applicationId;
  document.querySelector("#receiptDate").value = "2026-11-18";
  const appRow = document.querySelector(`[data-application-id="${CSS.escape(applicationId)}"]`, document.querySelector("#paymentApplicationRows"));
  if (appRow) document.querySelector("#receiptAmount").value = Math.max(0, Number(appRow.dataset.requestedAmount || 0) - Number(appRow.dataset.paidAmount || 0));
  activatePaymentTab("receivables");
  document.querySelector("#receiptCard").scrollIntoView({ behavior: "smooth", block: "center" });
}

function calculateRequestedAmount() {
  const gross = Number(document.querySelector("#acceptedWorkValue").value || 0);
  const recovery = Number(document.querySelector("#advanceRecovery").value || 0);
  const retention = Number(document.querySelector("#retentionAmount").value || 0);
  const adjustments = Number(document.querySelector("#otherAdjustments").value || 0);
  const amount = gross - recovery - retention + adjustments;
  document.querySelector("#calculatedPaymentAmount").textContent = formatVnd(Math.max(0, amount));
  return amount;
}
document.querySelector("#calculatePayment").addEventListener("click", calculateRequestedAmount);
["#acceptedWorkValue", "#advanceRecovery", "#retentionAmount", "#otherAdjustments"].forEach((selector) => document.querySelector(selector).addEventListener("input", calculateRequestedAmount));
document.querySelector("#newPaymentApplication").addEventListener("click", () => {
  activatePaymentTab("create-application");
  document.querySelector("#paymentApplicationForm").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector("#acceptedMinutes").addEventListener("change", (event) => {
  const record = acceptedMinutes.find((item) => item.id === event.target.value);
  if (record) {
    document.querySelector("#paymentNotes").value = `Khối lượng theo biên bản ${record.id} · ${record.title}`;
  }
});

document.querySelector("#paymentApplicationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const amount = calculateRequestedAmount();
  if (amount <= 0) return paymentToast("Giá trị đề nghị phải lớn hơn 0 sau các khoản khấu trừ");
  const acceptance = acceptedMinutes.find((item) => item.id === data.get("acceptance_minutes_id"));
  const record = { id: `PA-${String(Date.now()).slice(-5)}`, stageName: data.get("stage_name").trim(), acceptanceMinutes: data.get("acceptance_minutes_id"), acceptanceReference: acceptance?.title || "Biên bản nghiệm thu", measuredQuantity: acceptance?.quantity || "—", unit: acceptance?.unit || "", periodStart: data.get("period_start"), periodEnd: data.get("period_end"), grossValue: Number(data.get("accepted_work_value")), advanceRecovery: Number(data.get("advance_recovery") || 0), retention: Number(data.get("retention_amount") || 0), adjustments: Number(data.get("other_adjustments") || 0), requestedAmount: amount, notes: data.get("notes").trim(), status: "draft", sentDate: "" };
  paymentSave("applications", record);
  const rowHtml = renderApplicationRow(record);
  document.querySelector("#paymentApplicationRows").insertAdjacentHTML("afterbegin", rowHtml);
  const newRow = document.querySelector(`[data-application-id="${CSS.escape(record.id)}"]`, document.querySelector("#paymentApplicationRows"));
  newRow.dataset.requestedAmount = String(amount);
  setPaymentStatus(newRow, "draft");
  ["#receiptApplicationId", "#disputeApplicationId"].forEach((selector) => {
    const select = document.querySelector(selector);
    select.add(new Option(`${record.id} · ${record.stageName}`, record.id));
  });
  updatePaymentMetrics();
  form.reset(); document.querySelector("#calculatedPaymentAmount").textContent = "0 ₫";
  activatePaymentTab("applications");
  paymentToast(`Đã lưu bản nháp ${record.id}`);
});

function applyApplicationFilters() {
  const query = document.querySelector("#applicationSearch").value.trim().toLocaleLowerCase("vi");
  const status = document.querySelector("#applicationStatusFilter").value;
  let visible = 0;
  document.querySelectorAll("#paymentApplicationRows tr").forEach((row) => {
    row.hidden = (status !== "all" && row.dataset.paymentStatus !== status) || (query && !row.textContent.toLocaleLowerCase("vi").includes(query));
    if (!row.hidden) visible++;
  });
  document.querySelector("#applicationsEmpty").hidden = visible > 0;
  document.querySelector("#applicationCountLabel").textContent = `Hiển thị ${visible} hồ sơ`;
}
document.querySelector("#applicationSearch").addEventListener("input", applyApplicationFilters);
document.querySelector("#applicationStatusFilter").addEventListener("change", applyApplicationFilters);

document.querySelector("#paymentReceiptForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const appId = data.get("application_id");
  const appRow = document.querySelector(`[data-application-id="${CSS.escape(appId)}"]`, document.querySelector("#paymentApplicationRows"));
  const amount = Number(data.get("received_amount"));
  const currentPaid = Number(appRow?.dataset.paidAmount || 0);
  const requested = Number(appRow?.dataset.requestedAmount || amount);
  if (currentPaid + amount > requested) return paymentToast("Khoản thu vượt số dư đề nghị còn lại");
  const record = { id: `RC-${String(Date.now()).slice(-5)}`, applicationId: appId, date: data.get("received_date"), amount, voucher: data.get("voucher_number").trim(), notes: data.get("notes").trim() };
  paymentSave("receipts", record);
  const nextPaid = currentPaid + amount;
  const nextStatus = nextPaid >= requested ? "paid" : "partially-paid";
  if (appRow) {
    appRow.dataset.paidAmount = String(nextPaid);
    setPaymentStatus(appRow, nextStatus);
    const applications = paymentRead("applications");
    const savedApplication = applications.find((item) => item.id === appId);
    if (savedApplication) { savedApplication.paidAmount = nextPaid; paymentWrite("applications", applications); }
  }
  const receivableRow = [...document.querySelectorAll("#receivableList [data-receivable-id]")].find((row) => row.dataset.applicationId === appId);
  if (receivableRow) {
    receivableRow.dataset.paidAmount = String(nextPaid);
    setReceivableStatus(receivableRow, nextStatus, nextPaid);
    receivableRow.querySelectorAll(".receivable-main small")[1].textContent = `Đề nghị ${formatVnd(requested)} · Đã thu ${formatVnd(nextPaid)}`;
    const statuses = paymentRead("receivable-statuses", {}); statuses[receivableRow.dataset.receivableId] = { status: nextStatus, paidAmount: nextPaid }; paymentWrite("receivable-statuses", statuses);
    if (nextStatus === "paid") receivableRow.querySelector(".payment-action").disabled = true;
  }
  document.querySelector("#receiptHistory").insertAdjacentHTML("afterbegin", `<article class="receipt-entry" data-receipt-id="${record.id}"><span class="receipt-check">✓</span><div><strong>${paymentEscape(appId)} · ${formatVnd(amount)}</strong><small>${formatPaymentDate(record.date)} · ${paymentEscape(record.voucher)}</small></div></article>`);
  const totalReceived = Number(document.querySelector("#receivedAmountTotal").textContent.replace(/[^\d]/g, "")) * 1000000 + amount;
  document.querySelector("#receivedAmountTotal").innerHTML = `${(totalReceived / 1e6).toLocaleString("vi-VN")} <small>triệu</small>`;
  updatePaymentMetrics(); updateReceivableTotal();
  form.reset();
  paymentToast(`Đã ghi nhận khoản thu ${formatVnd(amount)}`);
});

paymentRead("receipts").slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-receipt-id="${CSS.escape(record.id)}"]`)) return;
  document.querySelector("#receiptHistory").insertAdjacentHTML("afterbegin", `<article class="receipt-entry" data-receipt-id="${paymentEscape(record.id)}"><span class="receipt-check">✓</span><div><strong>${paymentEscape(record.applicationId)} · ${formatVnd(record.amount)}</strong><small>${formatPaymentDate(record.date)} · ${paymentEscape(record.voucher)}</small></div></article>`);
});

function renderDispute(record) {
  const closed = record.status === "closed";
  return `<article class="dispute-row" data-dispute-id="${paymentEscape(record.id)}" data-dispute-status="${closed ? "closed" : "open"}"><span class="dispute-icon">⚑</span><div><strong>${paymentEscape(record.description)}</strong><small>${paymentEscape(record.id)} · ${paymentEscape(record.applicationId)} · Phản hồi ${formatPaymentDate(record.date)}</small><small class="dispute-action-note">${paymentEscape(record.resolution || "Chưa cập nhật phương án xử lý")}</small></div><button class="payment-action close-dispute" type="button" data-close-dispute="${paymentEscape(record.id)}" ${closed ? "disabled" : ""}>${closed ? "Đã xử lý" : "Đánh dấu đã xử lý"}</button></article>`;
}
paymentRead("disputes").slice().reverse().forEach((record) => {
  if (!document.querySelector(`[data-dispute-id="${CSS.escape(record.id)}"]`)) document.querySelector("#disputeList").insertAdjacentHTML("afterbegin", renderDispute(record));
});
function refreshDisputeCount() {
  const count = document.querySelectorAll('#disputeList [data-dispute-status="open"]').length;
  document.querySelector("#disputeCountLabel").textContent = `${count} chênh lệch cần xử lý`;
  document.querySelector("#disputesEmpty").hidden = count > 0;
}
refreshDisputeCount();
document.querySelector("#paymentDisputeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const record = { id: `DSP-${String(Date.now()).slice(-5)}`, applicationId: data.get("application_id"), type: data.get("dispute_type"), amount: Number(data.get("dispute_amount") || 0), date: data.get("response_date"), description: data.get("description").trim(), resolution: data.get("resolution").trim(), status: "open" };
  paymentSave("disputes", record);
  document.querySelector("#disputeList").insertAdjacentHTML("afterbegin", renderDispute(record));
  const row = document.querySelector(`[data-application-id="${CSS.escape(record.applicationId)}"]`, document.querySelector("#paymentApplicationRows"));
  if (row) setPaymentStatus(row, "disputed");
  form.reset();
  refreshDisputeCount();
  paymentToast("Đã ghi nhận chênh lệch / khiếu nại");
});
document.querySelector("#disputeList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-close-dispute]");
  if (!button) return;
  const row = button.closest("[data-dispute-id]");
  row.dataset.disputeStatus = "closed";
  button.textContent = "Đã xử lý"; button.disabled = true;
  const records = paymentRead("disputes"); const record = records.find((item) => item.id === row.dataset.disputeId);
  if (record) { record.status = "closed"; paymentWrite("disputes", records); }
  refreshDisputeCount(); paymentToast("Đã đóng vấn đề thanh toán");
});

document.querySelector("#receivableList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-receipt]");
  if (button) openPaymentReceipt(button.dataset.openReceipt);
});

