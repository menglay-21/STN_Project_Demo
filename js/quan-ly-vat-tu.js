const materialsRoot = document.querySelector("#materialsWorkspace");
const materialsProjectId = materialsRoot.dataset.projectId;
const materialStoragePrefix = `materials:${materialsProjectId}:`;

function materialsToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(materialsToast.timer);
  materialsToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function materialsEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function readMaterialStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`${materialStoragePrefix}${key}`) || "null") ?? fallback; }
  catch { return fallback; }
}

function writeMaterialStore(key, value) {
  localStorage.setItem(`${materialStoragePrefix}${key}`, JSON.stringify(value));
}

function switchMaterialsTab(tabId) {
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

document.querySelectorAll("[data-tab-target]").forEach((button) => button.addEventListener("click", () => switchMaterialsTab(button.dataset.tabTarget)));
document.querySelectorAll("[data-open-tab]").forEach((button) => button.addEventListener("click", () => switchMaterialsTab(button.dataset.openTab)));

const requestStatuses = readMaterialStore("request-statuses", {});
document.querySelectorAll("#requestRows [data-request-id]").forEach((row) => {
  const storedStatus = requestStatuses[row.dataset.requestId];
  if (storedStatus) setRequestStatus(row, storedStatus);
});

function requestStatusInfo(status) {
  return ({
    pending: ["Chờ duyệt", "status-pending"], approved: ["Đã duyệt", "status-approved"],
    purchasing: ["Đang mua", "status-purchasing"], issued: ["Đã cấp phát", "status-approved"], rejected: ["Từ chối", "status-rejected"],
  })[status] || ["Chờ duyệt", "status-pending"];
}

function setRequestStatus(row, status) {
  row.dataset.status = status;
  const [label, cssClass] = requestStatusInfo(status);
  const badge = row.querySelector(".materials-status");
  badge.textContent = label;
  badge.className = `materials-status ${cssClass}`;
  const actions = row.querySelector(".row-actions");
  if (status === "pending") actions.innerHTML = `<button class="row-action approve-request" type="button" data-approve-request="${row.dataset.requestId}">Duyệt</button><button class="row-action reject-request" type="button" data-reject-request="${row.dataset.requestId}" aria-label="Từ chối yêu cầu">×</button>`;
  else if (status === "approved") actions.innerHTML = `<button class="row-action issue-request" type="button" data-issue-request="${row.dataset.requestId}">Xuất kho</button>`;
  else actions.innerHTML = `<button class="row-action more-request" type="button" aria-label="Thêm thao tác">···</button>`;
}

function refreshRequestCounts() {
  const rows = [...document.querySelectorAll("#requestRows tr")];
  const pending = rows.filter((row) => row.dataset.status === "pending").length;
  document.querySelector("#pendingRequestsMetric").textContent = String(pending).padStart(2, "0");
  document.querySelector("#requestsBadge").textContent = String(pending);
  document.querySelector("#requestCountLabel").textContent = `Hiển thị ${rows.length} yêu cầu`;
}

function createRequestRow(request) {
  const id = request.id || `REQ-${String(Date.now()).slice(-5)}`;
  const item = request.item || "Vật tư theo yêu cầu công trường";
  const quantity = request.quantity || "0";
  const unit = request.unit || "đơn vị";
  const needDate = request.needDate || request.need_date || "";
  return `<tr data-request-id="${materialsEscape(id)}" data-status="pending"><td><strong class="record-id">${materialsEscape(id)}</strong><small>${new Date().toLocaleDateString("vi-VN")} · Ban chỉ huy</small></td><td><strong>${materialsEscape(item)}</strong><small>${materialsEscape(materialsProjectId)} · Theo yêu cầu công trường</small></td><td>${materialsEscape(quantity)} ${materialsEscape(unit)}</td><td><span class="stock-result stock-available">Chưa kiểm tra tồn kho</span><button class="stock-check-action" type="button" data-check-stock="${materialsEscape(id)}">Kiểm tra tồn kho</button></td><td><strong>${materialsEscape(needDate ? formatMaterialDate(needDate) : "Chưa xác định")}</strong><small class="priority-label ${request.priority === "urgent" ? "urgent" : ""}">${request.priority === "urgent" ? "Ưu tiên gấp" : "Thông thường"}</small></td><td><span class="materials-status status-pending">Chờ duyệt</span></td><td><div class="row-actions"><button class="row-action approve-request" type="button" data-approve-request="${materialsEscape(id)}">Duyệt</button><button class="row-action reject-request" type="button" data-reject-request="${materialsEscape(id)}" aria-label="Từ chối yêu cầu">×</button></div></td></tr>`;
}

function formatMaterialDate(value) {
  if (!value) return "";
  if (value.includes("/")) return value;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

// Import requests entered by the site team in the construction workspace.
const importedRequestKey = `${materialStoragePrefix}imported-construction-requests`;
const importedRequestIds = new Set(JSON.parse(localStorage.getItem(importedRequestKey) || "[]"));
const siteRequests = JSON.parse(localStorage.getItem("construction:CT-2026-002:material-requests") || "[]");
siteRequests.forEach((request) => {
  if (importedRequestIds.has(request.id) || document.querySelector(`[data-request-id="${CSS.escape(request.id)}"]`)) return;
  document.querySelector("#requestRows").insertAdjacentHTML("afterbegin", createRequestRow(request));
  const importedRow = document.querySelector(`[data-request-id="${CSS.escape(request.id)}"]`);
  if (requestStatuses[request.id]) setRequestStatus(importedRow, requestStatuses[request.id]);
  importedRequestIds.add(request.id);
});
localStorage.setItem(importedRequestKey, JSON.stringify([...importedRequestIds]));
refreshRequestCounts();

document.querySelector("#requestRows").addEventListener("click", (event) => {
  const approve = event.target.closest("[data-approve-request]");
  const reject = event.target.closest("[data-reject-request]");
  const issue = event.target.closest("[data-issue-request]");
  const stockCheck = event.target.closest("[data-check-stock]");
  if (approve || reject) {
    const row = event.target.closest("tr");
    const nextStatus = approve ? "approved" : "rejected";
    setRequestStatus(row, nextStatus);
    requestStatuses[row.dataset.requestId] = nextStatus;
    writeMaterialStore("request-statuses", requestStatuses);
    refreshRequestCounts();
    materialsToast(approve ? `Đã duyệt yêu cầu ${row.dataset.requestId}` : `Đã từ chối yêu cầu ${row.dataset.requestId}`);
  }
  if (issue) {
    switchMaterialsTab("inventory");
    document.querySelector("#issueRequestId").value = issue.dataset.issueRequest;
    document.querySelector("#stockIssueForm").scrollIntoView({ behavior: "smooth", block: "center" });
    materialsToast("Đã chuyển yêu cầu sang bước xuất kho");
  }
  if (stockCheck) {
    const row = stockCheck.closest("tr");
    const item = row.querySelector("td:nth-child(2) strong").textContent.toLowerCase();
    const inventoryItem = [...document.querySelectorAll("#inventoryRows tr")].find((candidate) => candidate.querySelector("td:nth-child(2) strong").textContent.toLowerCase() === item);
    const result = row.querySelector(".stock-result");
    if (inventoryItem) {
      const available = Number(inventoryItem.querySelector(".available-quantity").textContent.replace(",", "."));
      const required = Number(row.children[2].textContent.match(/[\d,.]+/)?.[0].replace(/\./g, "").replace(",", ".") || 0);
      result.textContent = available >= required ? `Tồn kho đủ · ${available}` : `Còn ${available} · Thiếu ${Math.max(0, required - available)}`;
      result.className = `stock-result ${available >= required ? "stock-available" : "stock-shortage"}`;
    } else {
      result.textContent = "Chưa có mã vật tư để đối chiếu";
    }
    materialsToast("Đã đối chiếu tồn kho khả dụng");
  }
});

function applyRequestFilters() {
  const query = document.querySelector("#requestSearch").value.trim().toLocaleLowerCase("vi");
  const status = document.querySelector("#requestStatusFilter").value;
  let visible = 0;
  document.querySelectorAll("#requestRows tr").forEach((row) => {
    const matchesText = !query || row.textContent.toLocaleLowerCase("vi").includes(query);
    const matchesStatus = status === "all" || row.dataset.status === status;
    row.hidden = !(matchesText && matchesStatus);
    if (!row.hidden) visible++;
  });
  document.querySelector("#requestsEmpty").hidden = visible > 0;
  document.querySelector("#requestCountLabel").textContent = `Hiển thị ${visible} yêu cầu`;
}
document.querySelector("#requestSearch").addEventListener("input", applyRequestFilters);
document.querySelector("#requestStatusFilter").addEventListener("change", applyRequestFilters);
document.querySelector("#refreshRequests").addEventListener("click", () => { applyRequestFilters(); materialsToast("Danh sách yêu cầu đã được làm mới"); });

document.querySelector("#createPurchaseOrderShortcut").addEventListener("click", () => {
  switchMaterialsTab("procurement");
  document.querySelector("#poItemName").focus();
});

document.querySelector("#purchaseOrderForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const id = `PO-${String(Date.now()).slice(-5)}`;
  const supplier = form.querySelector("#poSupplier").selectedOptions[0].textContent;
  const record = { id, item: data.get("item_name").trim(), supplier, supplierId: data.get("supplier_id"), quantity: data.get("quantity"), unit: data.get("unit").trim(), unitPrice: data.get("unit_price"), deliveryDate: data.get("delivery_date"), projectId: data.get("project_id"), notes: data.get("notes").trim(), status: "pending" };
  const records = readMaterialStore("purchase-orders", []); records.unshift(record); writeMaterialStore("purchase-orders", records);
  document.querySelector("#purchaseOrderList").insertAdjacentHTML("afterbegin", `<article class="purchase-order" data-po-id="${id}"><span class="po-icon">▤</span><div><strong>${id} · ${materialsEscape(record.item)}</strong><small>${materialsEscape(supplier)} · ${materialsEscape(record.quantity)} ${materialsEscape(record.unit)} · Giao ${formatMaterialDate(record.deliveryDate)}</small></div><span class="materials-status status-pending">Chờ duyệt</span></article>`);
  const receiptOption = document.createElement("option"); receiptOption.value = id; receiptOption.textContent = `${id} · ${record.item}`; document.querySelector("#receiptPo").add(receiptOption, 0);
  document.querySelector("#openPurchaseOrdersMetric").textContent = String(Number(document.querySelector("#openPurchaseOrdersMetric").textContent) + 1).padStart(2, "0");
  document.querySelector("#purchaseOrderCount").textContent = `${document.querySelectorAll("#purchaseOrderList .purchase-order").length} đơn đang mở`;
  form.reset();
  materialsToast(`Đã tạo đơn mua hàng ${id}`);
});

const inventoryState = readMaterialStore("inventory-state", {});
function updateInventoryRow(row, onHandValue) {
  const onHand = Number(onHandValue);
  row.querySelector("[data-on-hand]").dataset.onHand = String(onHand);
  row.querySelector("[data-on-hand]").textContent = onHand.toLocaleString("vi-VN");
  const held = Number(row.children[4].textContent.replace(/\./g, "").replace(",", "."));
  const available = Math.max(0, onHand - held);
  row.querySelector(".available-quantity").textContent = available.toLocaleString("vi-VN");
  const minimum = Number(row.children[6].textContent);
  const stockBadge = row.querySelector(".stock-level");
  const low = available < minimum;
  stockBadge.textContent = low ? "Dưới định mức" : "Đủ tồn kho";
  stockBadge.className = `stock-level ${low ? "stock-low" : "stock-ok"}`;
}
document.querySelectorAll("#inventoryRows tr").forEach((row) => {
  const key = row.dataset.inventoryItemId;
  if (inventoryState[key] !== undefined) updateInventoryRow(row, inventoryState[key]);
});

function refreshLowStock() {
  const low = document.querySelectorAll("#inventoryRows .stock-low").length;
  document.querySelector("#lowStockMetric").textContent = String(low).padStart(2, "0");
  document.querySelector("#lowStockBanner").querySelector("strong").textContent = `${low} vật tư đang dưới định mức tồn tối thiểu`;
  document.querySelector("#lowStockBanner").hidden = low === 0;
}
refreshLowStock();

document.querySelector("#goodsReceiptForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const po = data.get("po_id");
  const mapping = { "PO-26042": "hdpe-d800", "PO-26039": "rebar-d16" };
  const itemKey = mapping[po];
  const row = itemKey ? document.querySelector(`[data-inventory-item-id="${itemKey}"]`) : null;
  const receiptId = `PN-${String(Date.now()).slice(-5)}`;
  const record = { id: receiptId, poId: po, quantity: Number(data.get("received_quantity")), result: data.get("quality_result"), voucher: data.get("receipt_voucher") };
  const receipts = readMaterialStore("goods-receipts", []); receipts.unshift(record); writeMaterialStore("goods-receipts", receipts);
  if (row && record.result === "accepted") {
    const nextStock = Number(row.querySelector("[data-on-hand]").dataset.onHand) + record.quantity;
    inventoryState[itemKey] = nextStock; writeMaterialStore("inventory-state", inventoryState); updateInventoryRow(row, nextStock); refreshLowStock();
  }
  const poRow = document.querySelector(`[data-po-id="${po}"]`);
  if (poRow && record.result === "accepted") { const badge = poRow.querySelector(".materials-status"); badge.textContent = "Đã nhập kho"; badge.className = "materials-status status-approved"; }
  form.reset();
  materialsToast(record.result === "accepted" ? `Đã ghi nhận phiếu nhập ${receiptId}` : "Đã ghi nhận hàng chờ xử lý chất lượng");
});

function selectedInventory() {
  const key = document.querySelector("#issueItem").value;
  return document.querySelector(`[data-inventory-item-id="${key}"]`);
}
document.querySelector("#stockIssueForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const row = selectedInventory();
  const quantity = Number(data.get("issue_quantity"));
  const available = Number(row.querySelector(".available-quantity").textContent.replace(/\./g, "").replace(",", "."));
  if (quantity > available) return materialsToast(`Chỉ còn ${available} khả dụng trong kho`);
  const itemKey = row.dataset.inventoryItemId;
  const itemName = row.querySelector("td:nth-child(2) strong").textContent;
  const issueId = `PX-${String(Date.now()).slice(-5)}`;
  const record = { id: issueId, itemId: itemKey, item: itemName, quantity, projectId: data.get("project_id"), requestId: data.get("request_id") };
  const issues = readMaterialStore("stock-issues", []); issues.unshift(record); writeMaterialStore("stock-issues", issues);
  const onHand = Number(row.querySelector("[data-on-hand]").dataset.onHand) - quantity;
  inventoryState[itemKey] = onHand; writeMaterialStore("inventory-state", inventoryState); updateInventoryRow(row, onHand); refreshLowStock();
  form.reset();
  materialsToast(`Đã tạo phiếu xuất kho ${issueId}`);
});

document.querySelector("#deliveryConfirmationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const record = { id: `GR-${String(Date.now()).slice(-5)}`, issueId: data.get("issue_id"), receiver: data.get("receiver").trim(), date: data.get("delivery_date"), condition: data.get("condition") };
  const deliveries = readMaterialStore("site-deliveries", []); deliveries.unshift(record); writeMaterialStore("site-deliveries", deliveries);
  form.reset();
  materialsToast(`Đã lưu biên bản giao nhận ${record.id}`);
});

document.querySelector("#showLowStock").addEventListener("click", () => {
  switchMaterialsTab("inventory");
  document.querySelector("#inventoryTable").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector("#exportInventory").addEventListener("click", () => {
  const lines = [["Mã vật tư", "Tên vật tư", "Đơn vị", "Tồn thực tế", "Khả dụng", "Định mức", "Tình trạng"]];
  document.querySelectorAll("#inventoryRows tr").forEach((row) => lines.push([row.children[0].textContent, row.querySelector("td:nth-child(2) strong").textContent, row.children[2].textContent, row.children[3].textContent, row.querySelector(".available-quantity").textContent, row.children[6].textContent, row.querySelector(".stock-level").textContent]));
  const csv = "\uFEFF" + lines.map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = "ton-kho-vat-tu.csv"; link.click(); URL.revokeObjectURL(link.href);
  materialsToast("Đã xuất báo cáo tồn kho");
});

document.querySelector("#addSupplierToggle").addEventListener("click", () => {
  const form = document.querySelector("#supplierForm");
  form.hidden = !form.hidden;
  if (!form.hidden) document.querySelector("#supplierName").focus();
});
document.querySelector("#supplierForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const record = { id: `NCC-${String(Date.now()).slice(-3)}`, name: data.get("supplier_name").trim(), taxCode: data.get("tax_code").trim(), contact: data.get("contact").trim(), phone: data.get("phone").trim() };
  const suppliers = readMaterialStore("suppliers", []); suppliers.unshift(record); writeMaterialStore("suppliers", suppliers);
  document.querySelector("#supplierRows").insertAdjacentHTML("afterbegin", renderSupplierRow(record));
  addSupplierOptions(record);
  form.reset(); form.hidden = true;
  materialsToast(`Đã thêm nhà cung cấp ${record.name}`);
});

function renderSupplierRow(record) {
  return `<tr data-supplier-id="${materialsEscape(record.id)}"><td><strong>${materialsEscape(record.name)}</strong><small>${materialsEscape(record.id)} · ${materialsEscape(record.taxCode || "Chưa cập nhật")}</small></td><td>Chưa phân loại</td><td><span class="supplier-rating">— Chưa đánh giá</span></td><td>0</td><td><span class="materials-status status-pending">Mới thêm</span></td><td><button class="row-action" type="button" data-evaluate-supplier="${materialsEscape(record.id)}">Đánh giá</button></td></tr>`;
}

function addSupplierOptions(record) {
  ["#poSupplier", "#reconcileSupplier"].forEach((selector) => {
    const option = document.createElement("option"); option.value = record.id; option.textContent = record.name; document.querySelector(selector).add(option);
  });
}

readMaterialStore("suppliers", []).slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-supplier-id="${CSS.escape(record.id)}"]`)) return;
  document.querySelector("#supplierRows").insertAdjacentHTML("afterbegin", renderSupplierRow(record));
  addSupplierOptions(record);
});

document.querySelector("#supplierRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-evaluate-supplier]");
  if (!button) return;
  const supplierId = button.dataset.evaluateSupplier;
  const row = button.closest("tr");
  document.querySelector("#evaluationSupplierId").value = supplierId;
  document.querySelector("#supplierEvaluationTitle").textContent = `Đánh giá · ${row.querySelector("td:first-child strong").textContent}`;
  const evaluations = readMaterialStore("supplier-evaluations", {});
  const saved = evaluations[supplierId];
  document.querySelector("#supplierEvaluationForm").reset();
  document.querySelector("#evaluationSupplierId").value = supplierId;
  if (saved) {
    document.querySelector("#supplierQualityScore").value = saved.quality;
    document.querySelector("#supplierPriceScore").value = saved.price;
    document.querySelector("#supplierDeliveryScore").value = saved.delivery;
    document.querySelector("#supplierComplianceScore").value = saved.compliance;
  }
  document.querySelector("#supplierEvaluationForm").hidden = false;
  document.querySelector("#supplierEvaluationForm").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector("#supplierEvaluationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const supplierId = data.get("supplier_id");
  const scores = { quality: Number(data.get("quality_score")), price: Number(data.get("price_score")), delivery: Number(data.get("delivery_score")), compliance: Number(data.get("compliance_score")) };
  const average = Object.values(scores).reduce((total, score) => total + score, 0) / 4;
  const evaluations = readMaterialStore("supplier-evaluations", {}); evaluations[supplierId] = scores; writeMaterialStore("supplier-evaluations", evaluations);
  const row = document.querySelector(`[data-supplier-id="${CSS.escape(supplierId)}"]`);
  row.querySelector(".supplier-rating").textContent = `★ ${average.toFixed(1).replace(".", ",")}`;
  const badge = row.querySelector(".materials-status"); badge.textContent = "Đã đánh giá"; badge.className = "materials-status status-approved";
  event.currentTarget.hidden = true;
  materialsToast(`Đã lưu đánh giá nhà cung cấp · ${average.toFixed(1)} / 5`);
});

document.querySelector("#payablesReconciliationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const supplier = form.querySelector("#reconcileSupplier").selectedOptions[0].textContent;
  const record = { id: `REC-${String(Date.now()).slice(-5)}`, supplierId: data.get("supplier_id"), supplier, invoiceNumber: data.get("invoice_number").trim(), poId: data.get("po_id").trim(), amount: Number(data.get("invoice_amount")), dueDate: data.get("due_date"), receiptId: data.get("receipt_id").trim(), status: "reconciled" };
  const reconciliations = readMaterialStore("supplier-reconciliations", []); reconciliations.unshift(record); writeMaterialStore("supplier-reconciliations", reconciliations);
  document.querySelector("#payablesList").insertAdjacentHTML("afterbegin", `<article class="payable-row" data-payable-id="${record.id}"><div><strong>${materialsEscape(record.invoiceNumber)} · ${materialsEscape(supplier)}</strong><small>${materialsEscape(record.poId)} · ${record.amount.toLocaleString("vi-VN")} ₫ · Đến hạn ${formatMaterialDate(record.dueDate)}</small></div><span class="materials-status status-approved">Đã khớp</span></article>`);
  form.reset();
  materialsToast("Đã đối chiếu hóa đơn với đơn mua hàng");
});

readMaterialStore("purchase-orders", []).slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-po-id="${CSS.escape(record.id)}"]`)) return;
  document.querySelector("#purchaseOrderList").insertAdjacentHTML("afterbegin", `<article class="purchase-order" data-po-id="${materialsEscape(record.id)}"><span class="po-icon">▤</span><div><strong>${materialsEscape(record.id)} · ${materialsEscape(record.item)}</strong><small>${materialsEscape(record.supplier)} · ${materialsEscape(record.quantity)} ${materialsEscape(record.unit)} · Giao ${formatMaterialDate(record.deliveryDate)}</small></div><span class="materials-status status-pending">Chờ duyệt</span></article>`);
  const option = document.createElement("option"); option.value = record.id; option.textContent = `${record.id} · ${record.item}`; document.querySelector("#receiptPo").add(option, 0);
});
document.querySelector("#purchaseOrderCount").textContent = `${document.querySelectorAll("#purchaseOrderList .purchase-order").length} đơn đang mở`;
document.querySelector("#openPurchaseOrdersMetric").textContent = String(document.querySelectorAll("#purchaseOrderList .purchase-order").length).padStart(2, "0");

readMaterialStore("supplier-reconciliations", []).slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-payable-id="${CSS.escape(record.id)}"]`)) return;
  document.querySelector("#payablesList").insertAdjacentHTML("afterbegin", `<article class="payable-row" data-payable-id="${materialsEscape(record.id)}"><div><strong>${materialsEscape(record.invoiceNumber)} · ${materialsEscape(record.supplier)}</strong><small>${materialsEscape(record.poId)} · ${Number(record.amount).toLocaleString("vi-VN")} ₫ · Đến hạn ${formatMaterialDate(record.dueDate)}</small></div><span class="materials-status status-approved">Đã khớp</span></article>`);
});

document.querySelector("#refreshRequests").addEventListener("keydown", (event) => { if (event.key === "Enter") applyRequestFilters(); });
