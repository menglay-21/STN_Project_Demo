const contractRoot = document.querySelector("#contractWorkspace");
const contractTasks = [...document.querySelectorAll("[data-task-key]")];
const contractFields = [...document.querySelectorAll("[data-field]")];
const contractProgressTrack = document.querySelector(".contract-progress-track");
const contractProgressBar = document.querySelector("#contractProgressBar");
const contractProgressText = document.querySelector("#contractProgressText");
const contractProgressPercent = document.querySelector("#contractProgressPercent");
const contractStatus = document.querySelector("#contractStatus");
const contractKey = `award-contract:${contractRoot.dataset.tenderId}`;

function showContractToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showContractToast.timer);
  showContractToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function setContractStatus(status, label) {
  contractStatus.dataset.status = status;
  contractStatus.textContent = label;
}

function updateContractProgress() {
  const done = contractTasks.filter((task) => task.checked).length;
  const total = contractTasks.length;
  const percent = Math.round((done / total) * 100);
  contractProgressText.textContent = `${done} / ${total} bước hoàn tất`;
  contractProgressPercent.textContent = `${percent}%`;
  contractProgressBar.style.width = `${percent}%`;
  contractProgressTrack.setAttribute("aria-valuenow", String(percent));
  document.querySelector("#contractProgress").dataset.progress = String(percent);

  const sectionStages = [...document.querySelectorAll("[data-stage]")];
  sectionStages.forEach((section) => {
    const tasks = [...section.querySelectorAll("[data-task-key]")];
    const label = section.querySelector("[data-section-state]");
    if (!tasks.length) {
      label.textContent = section.dataset.stage === "project" && document.querySelector("#projectCode").value ? "Đã khởi tạo" : "Chưa bắt đầu";
      return;
    }
    const complete = tasks.every((task) => task.checked);
    const started = tasks.some((task) => task.checked);
    label.textContent = complete ? "Hoàn tất" : started ? "Đang thực hiện" : "Chưa bắt đầu";
  });

  const stages = [...document.querySelectorAll(".contract-step")];
  let nextStage = null;
  stages.forEach((stage) => {
    const section = document.querySelector(`[data-stage="${stage.dataset.stepKey}"]`);
    const tasks = section ? [...section.querySelectorAll("[data-task-key]")] : [];
    const complete = tasks.length ? tasks.every((task) => task.checked) : Boolean(document.querySelector("#projectCode").value);
    stage.classList.toggle("complete", complete);
    stage.classList.remove("current");
    if (!complete && !nextStage) nextStage = stage;
  });
  nextStage?.classList.add("current");

  const canSign = document.querySelector("#legalOpinionApproved").checked && document.querySelector("#contractDraftAttached").checked && document.querySelector("#guaranteeIssued").checked;
  document.querySelector("#recordContractSigning").disabled = !canSign;
  document.querySelector("#createProject").disabled = !(document.querySelector("#contractSigned").checked && document.querySelector("#advanceReceived").checked);
  updateNextAction();
}

function updateNextAction() {
  const messages = [
    ["#awardNoticeVerified", "Xác minh thông báo kết quả trúng thầu với chủ đầu tư."],
    ["#negotiationMinutes", "Hoàn tất thương thảo điều khoản và tải biên bản để chuyển rà soát pháp lý."],
    ["#legalOpinionApproved", "Gửi dự thảo hợp đồng để rà soát pháp lý và ghi nhận ý kiến."],
    ["#contractDraftAttached", "Đính kèm bản hợp đồng cuối cùng sau rà soát."],
    ["#guaranteeIssued", "Nhận chứng thư bảo lãnh thực hiện hợp đồng từ ngân hàng."],
    ["#contractSigned", "Hoàn tất ký kết hợp đồng với chủ đầu tư."],
    ["#advanceReceived", "Thực hiện thủ tục tạm ứng và lưu chứng từ kế toán."],
  ];
  const upcoming = messages.find(([selector]) => !document.querySelector(selector).checked);
  document.querySelector("#nextActionText").textContent = document.querySelector("#projectCode").value
    ? "Hợp đồng đã hoàn tất và công trình đã được khởi tạo trong hệ thống."
    : upcoming?.[1] || "Đã đủ điều kiện khởi tạo công trình.";
}

function saveContractState(showMessage = true) {
  const state = {
    tasks: Object.fromEntries(contractTasks.map((task) => [task.dataset.taskKey, task.checked])),
    fields: Object.fromEntries(contractFields.map((field) => [field.dataset.field, field.value])),
    projectCode: document.querySelector("#projectCode").value,
  };
  localStorage.setItem(contractKey, JSON.stringify(state));
  if (showMessage) showContractToast("Đã lưu tiến độ trên trình duyệt này");
}

document.querySelectorAll("[data-upload-for]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(`[data-file-input="${button.dataset.uploadFor}"]`).click());
});

document.querySelectorAll("[data-file-input]").forEach((input) => {
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const taskKey = input.dataset.completesTask || input.dataset.fileInput;
    const relatedTask = document.querySelector(`[data-task-key="${taskKey}"]`);
    if (relatedTask) relatedTask.checked = true;
    const button = document.querySelector(`[data-upload-for="${input.dataset.fileInput}"]`);
    if (button) button.textContent = "✓ Đã chọn tệp";
    updateContractProgress();
    showContractToast(`Đã chọn tệp: ${file.name}`);
  });
});

contractTasks.forEach((task) => task.addEventListener("change", updateContractProgress));
contractFields.forEach((field) => field.addEventListener("input", () => {
  if (field.dataset.field === "awarded_value" && field.value) document.querySelector("#summaryAwardedValue").textContent = `${field.value} đồng`;
  updateContractProgress();
}));

document.querySelector("#requestLegalReview").addEventListener("click", () => {
  if (!document.querySelector("#negotiationMinutes").checked) {
    showContractToast("Hoàn tất thương thảo và đính kèm biên bản trước khi yêu cầu rà soát");
    document.querySelector("#contractNegotiation").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  document.querySelector("#legalReviewNote").textContent = "Đã gửi yêu cầu rà soát pháp lý. Ghi nhận ý kiến sau khi Ban Giám đốc / Pháp chế phản hồi.";
  document.querySelector("#legalReviewNote").classList.add("requested");
  setContractStatus("legal-review", "Đang rà soát pháp lý");
  showContractToast("Đã gửi yêu cầu rà soát pháp lý");
});

document.querySelector("#recordContractSigning").addEventListener("click", () => {
  if (document.querySelector("#recordContractSigning").disabled) return;
  document.querySelector("#contractSigned").checked = true;
  updateContractProgress();
  setContractStatus("signed", "Đã ký hợp đồng");
  showContractToast("Đã ghi nhận ký hợp đồng");
});

document.querySelector("#createProject").addEventListener("click", () => {
  if (document.querySelector("#createProject").disabled) return;
  const projectCode = document.querySelector("#projectCode");
  if (!projectCode.value) projectCode.value = "CT-2026-002";
  document.querySelector("#projectCreated").checked = true;
  document.querySelector("#projectCreatedCode").textContent = projectCode.value;
  projectCode.dataset.generated = "true";
  updateContractProgress();
  setContractStatus("project-created", "Đã khởi tạo công trình");
  saveContractState(false);
  showContractToast(`Đã khởi tạo công trình ${projectCode.value}`);
});

document.querySelector("#saveContractDraft").addEventListener("click", () => saveContractState());
document.querySelector("#advanceContract").addEventListener("click", () => {
  const incomplete = contractTasks.find((task) => !task.checked);
  if (incomplete) {
    incomplete.closest(".contract-section-card").scrollIntoView({ behavior: "smooth", block: "center" });
    showContractToast("Đang chuyển đến bước cần hoàn tất tiếp theo");
    return;
  }
  showContractToast("Đã hoàn tất quy trình ký kết và khởi tạo");
});
document.querySelector("#contractMoreActions").addEventListener("click", () => showContractToast("Các thao tác bổ sung sẽ được cấu hình cùng backend"));

const savedContract = localStorage.getItem(contractKey);
if (savedContract) {
  const state = JSON.parse(savedContract);
  contractTasks.forEach((task) => { task.checked = Boolean(state.tasks?.[task.dataset.taskKey]); });
  contractFields.forEach((field) => { if (state.fields?.[field.dataset.field] !== undefined) field.value = state.fields[field.dataset.field]; });
  if (state.projectCode) document.querySelector("#projectCode").value = state.projectCode;
  if (state.projectCode) {
    document.querySelector("#projectCreated").checked = true;
    document.querySelector("#projectCreatedCode").textContent = state.projectCode;
  }
  if (state.tasks?.["negotiation-minutes"]) {
    document.querySelector("#negotiationMinutes").checked = true;
    document.querySelector("#negotiationMinutes").closest(".contract-section-card").querySelector("[data-upload-for]").textContent = "✓ Đã chọn tệp";
  }
}
updateContractProgress();
