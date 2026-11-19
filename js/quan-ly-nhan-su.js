const hrRoot = document.querySelector("#hrWorkspace");
const hrProjectId = hrRoot.dataset.projectId;
const hrPrefix = `hr:${hrProjectId}:`;

function hrToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(hrToast.timer);
  hrToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function hrEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function hrRead(key) {
  try { return JSON.parse(localStorage.getItem(`${hrPrefix}${key}`) || "[]"); }
  catch { return []; }
}

function hrWrite(key, records) {
  localStorage.setItem(`${hrPrefix}${key}`, JSON.stringify(records));
}

function hrSave(key, record) {
  const records = hrRead(key);
  records.unshift(record);
  hrWrite(key, records);
}

function hrDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function certificateState(expiry) {
  const days = Math.ceil((new Date(`${expiry}T00:00:00`) - new Date("2026-11-18T00:00:00")) / 86400000);
  if (days < 0) return { label: "Đã hết hạn", className: "status-danger", days };
  if (days <= 30) return { label: `Còn ${days} ngày`, className: "status-expiring", days };
  return { label: "Còn hiệu lực", className: "status-active", days };
}

function activateHrTab(tabId) {
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
document.querySelectorAll("[data-tab-target]").forEach((button) => button.addEventListener("click", () => activateHrTab(button.dataset.tabTarget)));
document.querySelectorAll("[data-open-tab]").forEach((button) => button.addEventListener("click", () => activateHrTab(button.dataset.openTab)));

function employeeOptionLabel(employee) {
  return `${employee.name}${employee.role ? ` · ${employee.role}` : ""}`;
}

function addEmployeeOptions(employee) {
  ["#assignmentEmployee", "#contractEmployee", "#attendanceEmployee", "#payrollEmployee", "#advanceEmployee", "#certificateEmployee", "#trainingEmployee", "#incidentEmployee"].forEach((selector) => {
    const select = document.querySelector(selector);
    if (!select || select.querySelector(`option[value="${CSS.escape(employee.id)}"]`)) return;
    const option = new Option(employeeOptionLabel(employee), employee.id);
    if (selector === "#assignmentEmployee") select.insertBefore(option, select.querySelector('[value="EMP-NEW"]'));
    else select.add(option);
  });
}

function renderEmployeeRow(employee) {
  const typeName = ({ permanent: "Chính thức", seasonal: "Thời vụ", subcontractor: "Đội thi công" })[employee.type] || employee.type || "Chính thức";
  return `<tr data-employee-id="${hrEscape(employee.id)}"><td><strong>${hrEscape(employee.name)}</strong><small>${hrEscape(employee.id)} · ${hrEscape(typeName)}</small></td><td>${hrEscape(employee.role || "Chưa phân công")}</td><td>${hrEscape(employee.contractLabel || "Chưa cập nhật")}</td><td>${hrEscape(employee.expiry ? hrDate(employee.expiry) : "Chưa cập nhật")}</td><td><span class="hr-status ${employee.expiry ? "status-expiring" : "status-active"}">${employee.expiry ? "Cần theo dõi" : "Chưa có hợp đồng"}</span></td></tr>`;
}

function updateStaffingMetrics(addCount = 0) {
  const baseAssigned = 42;
  const planned = 48;
  const assignments = hrRead("project-assignments").length;
  const assigned = baseAssigned + Math.max(addCount, assignments);
  const missing = Math.max(0, planned - assigned);
  const coverage = Math.min(100, Math.round((assigned / planned) * 1000) / 10);
  document.querySelector("#assignedStaffCount").innerHTML = `${assigned} <small>/ ${planned}</small>`;
  document.querySelector("#assignedStaffTotal").innerHTML = `${assigned} <small>người</small>`;
  document.querySelector("#unfilledStaffTotal").innerHTML = `${String(missing).padStart(2, "0")} <small>người</small>`;
  document.querySelector("#staffingCoverage").textContent = `${coverage.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
  document.querySelector("#staffingCoverageBar").style.width = `${coverage}%`;
  document.querySelector("#workforceListCount").textContent = `${assigned} người đang được điều động`;
}

function renderAssignment(record) {
  return `<article class="employee-row" data-assignment-id="${hrEscape(record.id)}" data-employee-id="${hrEscape(record.employeeId)}" data-role-group="${record.group || "labor"}"><span class="employee-avatar avatar-green">${hrEscape(record.initials || "NS")}</span><div><strong>${hrEscape(record.name)}</strong><small>${hrEscape(record.role)} · Từ ${hrDate(record.startDate)}</small></div><span class="employee-work-status">Đang làm việc</span></article>`;
}

const savedEmployees = hrRead("employees");
savedEmployees.slice().reverse().forEach((employee) => {
  if (document.querySelector(`#employeeRows [data-employee-id="${CSS.escape(employee.id)}"]`)) return;
  document.querySelector("#employeeRows").insertAdjacentHTML("afterbegin", renderEmployeeRow(employee));
  addEmployeeOptions(employee);
});

const savedAssignments = hrRead("project-assignments");
savedAssignments.slice().reverse().forEach((assignment) => {
  if (!document.querySelector(`[data-assignment-id="${CSS.escape(assignment.id)}"]`)) document.querySelector("#workforceList").insertAdjacentHTML("afterbegin", renderAssignment(assignment));
});
updateStaffingMetrics();

document.querySelector("#addEmployeeShortcut").addEventListener("click", () => {
  activateHrTab("employment");
  const form = document.querySelector("#employeeForm"); form.hidden = false;
  document.querySelector("#employeeName").focus();
});
document.querySelector("#toggleEmployeeForm").addEventListener("click", () => {
  const form = document.querySelector("#employeeForm"); form.hidden = !form.hidden;
  if (!form.hidden) document.querySelector("#employeeName").focus();
});

document.querySelector("#employeeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const name = data.get("full_name").trim();
  const id = data.get("employee_code").trim() || `EMP-${String(Date.now()).slice(-3)}`;
  const type = data.get("employment_type");
  const record = { id, name, type, phone: data.get("phone").trim(), role: "Chưa phân công" };
  hrSave("employees", record);
  document.querySelector("#employeeRows").insertAdjacentHTML("afterbegin", renderEmployeeRow(record));
  addEmployeeOptions(record);
  form.reset(); form.hidden = true;
  hrToast(`Đã tạo hồ sơ nhân sự ${id}`);
});

document.querySelector("#staffAssignmentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const option = form.querySelector("#assignmentEmployee").selectedOptions[0];
  const record = { id: `ASG-${String(Date.now()).slice(-5)}`, employeeId: data.get("employee_id"), name: option.textContent.split(" · ")[0], role: data.get("role").trim(), startDate: data.get("start_date"), endDate: data.get("end_date"), initials: option.textContent.split(" ").map((part) => part[0]).slice(0, 2).join("") };
  hrSave("project-assignments", record);
  document.querySelector("#workforceList").insertAdjacentHTML("afterbegin", renderAssignment(record));
  updateStaffingMetrics();
  form.reset();
  hrToast(`Đã phân công ${record.name} vào công trình`);
});

document.querySelector("#workforceFilter").addEventListener("change", (event) => {
  document.querySelectorAll("#workforceList .employee-row").forEach((row) => {
    row.hidden = event.target.value !== "all" && row.dataset.roleGroup !== event.target.value;
  });
});

document.querySelector("#employmentContractForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const employeeId = data.get("employee_id");
  const employeeOption = form.querySelector("#contractEmployee").selectedOptions[0];
  const typeLabels = { permanent: "HĐLĐ không xác định hạn", fixed: "HĐLĐ xác định hạn", seasonal: "HĐ thời vụ" };
  const record = { id: `CON-${String(Date.now()).slice(-5)}`, employeeId, employee: employeeOption.textContent.split(" · ")[0], contractType: data.get("contract_type"), contractNumber: data.get("contract_number").trim(), expiry: data.get("expiry_date"), contractLabel: typeLabels[data.get("contract_type")] };
  hrSave("employment-contracts", record);
  let row = document.querySelector(`#employeeRows [data-employee-id="${CSS.escape(employeeId)}"]`);
  if (row) {
    row.children[2].textContent = record.contractLabel;
    row.children[3].textContent = record.expiry ? hrDate(record.expiry) : "Không thời hạn";
    row.querySelector(".hr-status").textContent = record.expiry ? "Đang hiệu lực" : "Đang hiệu lực";
    row.querySelector(".hr-status").className = "hr-status status-active";
  }
  form.reset();
  hrToast(`Đã lưu hợp đồng ${record.contractNumber}`);
});

document.querySelector("#attendanceForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const option = form.querySelector("#attendanceEmployee").selectedOptions[0];
  const statuses = { present: ["Có mặt", "present"], late: ["Đi muộn", "present"], leave: ["Nghỉ phép", "absent"], absent: ["Vắng mặt", "absent"] };
  const [label, color] = statuses[data.get("attendance_status")];
  const record = { id: `ATT-${String(Date.now()).slice(-5)}`, employeeId: data.get("employee_id"), employee: option.textContent.split(" · ")[0], date: data.get("work_date"), shift: form.querySelector("#attendanceShift").selectedOptions[0].textContent, status: data.get("attendance_status"), statusLabel: label, hours: data.get("work_hours"), note: data.get("note").trim() };
  hrSave("attendance", record);
  document.querySelector("#attendanceRecords").insertAdjacentHTML("afterbegin", `<div class="attendance-record" data-attendance-id="${record.id}" data-employee-id="${hrEscape(record.employeeId)}"><span class="attendance-dot ${color}"></span><strong>${hrEscape(record.employee)}</strong><span>${hrEscape(record.shift)} · ${hrEscape(record.hours)} giờ</span><small>${label}</small></div>`);
  const current = document.querySelector("#attendanceRate");
  const count = Number(current.textContent.match(/\d+/)?.[0] || 39) + (color === "present" ? 1 : 0);
  current.innerHTML = `${count} <small>/ 42</small>`;
  form.reset(); document.querySelector("#attendanceWorkDate").value = "2026-11-18";
  hrToast(`Đã ghi nhận chấm công · ${record.employee}`);
});

function calculatePayroll() {
  const days = Number(document.querySelector("#payrollDays").value);
  const rate = Number(document.querySelector("#dailyWage").value);
  const advance = Number(document.querySelector("#existingAdvance").value || 0);
  if (!days || !rate) return hrToast("Nhập số công và lương ngày để tính thử");
  const estimate = Math.max(0, days * rate - advance);
  document.querySelector("#netPayEstimate").textContent = `${estimate.toLocaleString("vi-VN")} ₫`;
  document.querySelector("#payrollResult").hidden = false;
  return estimate;
}
document.querySelector("#calculatePayroll").addEventListener("click", calculatePayroll);
document.querySelector("#payrollPreviewForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const estimate = calculatePayroll();
  if (estimate === undefined) return;
  const data = new FormData(form);
  hrSave("payroll-drafts", { id: `PAY-${String(Date.now()).slice(-5)}`, employeeId: data.get("employee_id"), period: data.get("payroll_period"), workDays: data.get("work_days"), dailyWage: data.get("daily_wage"), advance: data.get("existing_advance"), netPay: estimate });
  hrToast("Đã lưu bảng lương nháp");
});

document.querySelector("#salaryAdvanceForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const option = form.querySelector("#advanceEmployee").selectedOptions[0];
  const record = { id: `ADV-${String(Date.now()).slice(-5)}`, employeeId: data.get("employee_id"), employee: option.textContent, amount: Number(data.get("amount")), reason: data.get("reason").trim(), status: "pending", date: "2026-11-18" };
  hrSave("salary-advances", record);
  document.querySelector("#salaryAdvanceList").insertAdjacentHTML("afterbegin", `<article class="advance-record" data-advance-id="${record.id}"><div><strong>${record.id} · ${hrEscape(record.employee)}</strong><small>${record.amount.toLocaleString("vi-VN")} ₫ · Chờ duyệt · ${hrDate(record.date)}</small></div><span class="hr-status status-pending">Chờ duyệt</span></article>`);
  form.reset();
  hrToast("Đã gửi yêu cầu tạm ứng đến quản lý");
});

document.querySelector("#toggleCertificateForm").addEventListener("click", () => {
  const form = document.querySelector("#certificateForm"); form.hidden = !form.hidden;
  if (!form.hidden) document.querySelector("#certificateType").focus();
});
document.querySelector("#certificateForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const option = form.querySelector("#certificateEmployee").selectedOptions[0];
  const record = { id: `CERT-${String(Date.now()).slice(-4)}`, employeeId: data.get("employee_id"), employee: option.textContent.split(" · ")[0], type: data.get("certificate_type").trim(), number: data.get("certificate_number").trim(), expiry: data.get("expiry_date") };
  hrSave("certificates", record);
  const state = certificateState(record.expiry);
  document.querySelector("#certificateRows").insertAdjacentHTML("afterbegin", `<tr data-certificate-id="${record.id}"><td><strong>${hrEscape(record.employee)}</strong><small>${hrEscape(record.employeeId)}</small></td><td>${hrEscape(record.type)}</td><td>${hrEscape(record.number || "Chưa cập nhật")}</td><td>${hrDate(record.expiry)}</td><td><span class="hr-status ${state.className}">${state.label}</span></td></tr>`);
  updateCertificateCount();
  form.reset(); form.hidden = true;
  hrToast("Đã lưu chứng chỉ nhân sự");
});

document.querySelector("#safetyTrainingForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const employee = form.querySelector("#trainingEmployee").selectedOptions[0].textContent.split(" · ")[0];
  const result = data.get("training_result");
  const record = { id: `TRN-${String(Date.now()).slice(-4)}`, employee, employeeId: data.get("employee_id"), date: data.get("training_date"), instructor: data.get("instructor").trim(), result };
  hrSave("safety-training", record);
  document.querySelector("#trainingRecords").insertAdjacentHTML("afterbegin", `<article class="training-record" data-training-id="${record.id}"><span class="training-mark">${result === "passed" ? "✓" : "!"}</span><div><strong>${hrEscape(employee)} · Huấn luyện ATLĐ đầu vào</strong><small>${result === "passed" ? "Đạt" : "Cần huấn luyện lại"} · ${hrDate(record.date)} · Hướng dẫn: ${hrEscape(record.instructor)}</small></div></article>`);
  form.reset(); document.querySelector("#trainingDate").value = "2026-11-18";
  hrToast("Đã lưu biên bản huấn luyện an toàn");
});

document.querySelector("#laborIncidentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const typeLabels = { accident: "Tai nạn lao động", absence: "Nghỉ việc / vắng mặt", discipline: "Kỷ luật" };
  const severity = data.get("severity");
  const record = { id: `INC-${String(Date.now()).slice(-4)}`, type: data.get("incident_type"), typeLabel: typeLabels[data.get("incident_type")], date: data.get("incident_date"), employeeId: data.get("employee_id"), severity, description: data.get("description").trim() };
  hrSave("labor-incidents", record);
  document.querySelector("#incidentList").insertAdjacentHTML("afterbegin", `<article class="incident-row" data-incident-id="${record.id}" data-incident-type="${record.type}"><span class="incident-severity-dot ${severity}"></span><div><strong>${hrEscape(record.description)}</strong><small>${hrEscape(record.employeeId)} · ${hrDate(record.date)} · ${hrEscape(record.typeLabel)}</small></div><span class="hr-status ${severity === "high" ? "status-danger" : "status-pending"}">Đang theo dõi</span></article>`);
  if (record.type === "accident") document.querySelector("#laborIncidentCount").textContent = String(Number(document.querySelector("#laborIncidentCount").textContent) + 1).padStart(2, "0");
  form.reset(); document.querySelector("#incidentDate").value = "2026-11-18";
  hrToast("Đã gửi ghi nhận đến Phòng Nhân sự và Ban chỉ huy");
});

function updateCertificateCount() {
  const expiringSaved = hrRead("certificates").filter((record) => {
    const state = certificateState(record.expiry);
    return state.days >= 0 && state.days <= 30;
  }).length;
  document.querySelector("#expiringCertificates").textContent = String(4 + expiringSaved).padStart(2, "0");
}

hrRead("attendance").slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-attendance-id="${CSS.escape(record.id)}"]`)) return;
  const color = ["present", "late"].includes(record.status) ? "present" : "absent";
  document.querySelector("#attendanceRecords").insertAdjacentHTML("afterbegin", `<div class="attendance-record" data-attendance-id="${hrEscape(record.id)}"><span class="attendance-dot ${color}"></span><strong>${hrEscape(record.employee)}</strong><span>${hrEscape(record.shift)} · ${hrEscape(record.hours)} giờ</span><small>${hrEscape(record.statusLabel)}</small></div>`);
});
hrRead("salary-advances").slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-advance-id="${CSS.escape(record.id)}"]`)) return;
  document.querySelector("#salaryAdvanceList").insertAdjacentHTML("afterbegin", `<article class="advance-record" data-advance-id="${hrEscape(record.id)}"><div><strong>${hrEscape(record.id)} · ${hrEscape(record.employee)}</strong><small>${Number(record.amount).toLocaleString("vi-VN")} ₫ · Chờ duyệt · ${hrDate(record.date)}</small></div><span class="hr-status status-pending">Chờ duyệt</span></article>`);
});
hrRead("certificates").slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-certificate-id="${CSS.escape(record.id)}"]`)) return;
  const state = certificateState(record.expiry);
  document.querySelector("#certificateRows").insertAdjacentHTML("afterbegin", `<tr data-certificate-id="${hrEscape(record.id)}"><td><strong>${hrEscape(record.employee)}</strong><small>${hrEscape(record.employeeId)}</small></td><td>${hrEscape(record.type)}</td><td>${hrEscape(record.number || "Chưa cập nhật")}</td><td>${hrDate(record.expiry)}</td><td><span class="hr-status ${state.className}">${state.label}</span></td></tr>`);
});
hrRead("safety-training").slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-training-id="${CSS.escape(record.id)}"]`)) return;
  document.querySelector("#trainingRecords").insertAdjacentHTML("afterbegin", `<article class="training-record" data-training-id="${hrEscape(record.id)}"><span class="training-mark">${record.result === "passed" ? "✓" : "!"}</span><div><strong>${hrEscape(record.employee)} · Huấn luyện ATLĐ đầu vào</strong><small>${record.result === "passed" ? "Đạt" : "Cần huấn luyện lại"} · ${hrDate(record.date)} · Hướng dẫn: ${hrEscape(record.instructor)}</small></div></article>`);
});
hrRead("labor-incidents").slice().reverse().forEach((record) => {
  if (document.querySelector(`[data-incident-id="${CSS.escape(record.id)}"]`)) return;
  document.querySelector("#incidentList").insertAdjacentHTML("afterbegin", `<article class="incident-row" data-incident-id="${hrEscape(record.id)}" data-incident-type="${hrEscape(record.type)}"><span class="incident-severity-dot ${hrEscape(record.severity)}"></span><div><strong>${hrEscape(record.description)}</strong><small>${hrEscape(record.employeeId)} · ${hrDate(record.date)} · ${hrEscape(record.typeLabel)}</small></div><span class="hr-status ${record.severity === "high" ? "status-danger" : "status-pending"}">Đang theo dõi</span></article>`);
});

hrRead("employment-contracts").forEach((record) => {
  const row = document.querySelector(`#employeeRows [data-employee-id="${CSS.escape(record.employeeId)}"]`);
  if (!row) return;
  row.children[2].textContent = record.contractLabel;
  row.children[3].textContent = record.expiry ? hrDate(record.expiry) : "Không thời hạn";
});
const savedAttendanceCount = hrRead("attendance").filter((record) => ["present", "late"].includes(record.status)).length;
document.querySelector("#attendanceRate").innerHTML = `${39 + savedAttendanceCount} <small>/ 42</small>`;
const savedAccidents = hrRead("labor-incidents").filter((record) => record.type === "accident").length;
document.querySelector("#laborIncidentCount").textContent = String(1 + savedAccidents).padStart(2, "0");
updateCertificateCount();

document.querySelector("#calculatePayroll").addEventListener("keydown", (event) => { if (event.key === "Enter") calculatePayroll(); });
