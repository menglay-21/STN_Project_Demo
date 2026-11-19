const bidRoot = document.querySelector("#bidWorkspace");
const bidChecks = [...document.querySelectorAll(".bid-doc-check")];
const bidTotal = bidChecks.length;
const progressLabel = document.querySelector("#bidProgressText");
const progressPercent = document.querySelector("#bidProgressPercent");
const progressBar = document.querySelector("#bidProgressBar");
const progressTrack = document.querySelector(".bid-progress-track");
const submitButton = document.querySelector("#submitBidFile");

function notifyBid(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notifyBid.timer);
  notifyBid.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function updateBidProgress() {
  const done = bidChecks.filter((check) => check.checked).length;
  const percent = Math.round((done / bidTotal) * 100);
  progressLabel.textContent = `${done} / ${bidTotal} tài liệu đã sẵn sàng`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  progressTrack.setAttribute("aria-valuenow", String(percent));
  document.querySelector("#bidProgress").dataset.progress = String(percent);

  document.querySelectorAll("[data-section-id]").forEach((section) => {
    const checks = [...section.querySelectorAll(".bid-doc-check")];
    const completed = checks.filter((check) => check.checked).length;
    const counter = section.querySelector("[data-section-count]");
    counter.textContent = `${completed} / ${checks.length} hoàn tất`;
  });

  const steps = [...document.querySelectorAll("[data-workflow-step].bid-step-indicator")];
  steps.forEach((step) => {
    const workflowId = step.dataset.workflowStep;
    const section = document.querySelector(`[data-section-id="${workflowSection(workflowId)}"]`);
    const checks = [...section.querySelectorAll(".bid-doc-check")];
    const complete = checks.length > 0 && checks.every((check) => check.checked);
    step.classList.toggle("complete", complete);
    step.classList.toggle("current", !complete && !steps.some((earlier) => earlier !== step && earlier.classList.contains("current")));
  });

  const allReady = done === bidTotal;
  submitButton.disabled = !allReady;
  submitButton.title = allReady ? "Ghi nhận nộp hồ sơ" : "Hoàn tất đủ tài liệu trước khi nộp";
  document.querySelector("#submissionHint").textContent = allReady
    ? "Các tài liệu đã được đánh dấu sẵn sàng. Xác nhận để ghi nhận trạng thái nộp hồ sơ."
    : `Còn ${bidTotal - done} mục chưa hoàn tất; cần kiểm tra đủ thành phần trước khi nộp.`;
}

function workflowSection(workflowId) {
  return ({ legal: "legal-documents", technical: "technical-plan", pricing: "quantity-pricing", capacity: "personnel-capacity", submission: "review-submission" })[workflowId];
}

document.querySelectorAll("[data-upload-for]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.uploadFor;
    document.querySelector(`[data-file-input="${key}"]`).click();
  });
});

document.querySelectorAll("[data-file-input]").forEach((input) => {
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const key = input.dataset.fileInput;
    const row = document.querySelector(`[data-document-id="${key}"]`);
    const check = row.querySelector(".bid-doc-check");
    const status = row.querySelector("[data-document-status]");
    status.textContent = file.name;
    status.classList.add("attached");
    if (check) check.checked = true;
    updateBidProgress();
    notifyBid(`Đã chọn tệp: ${file.name}`);
  });
});

bidChecks.forEach((check) => check.addEventListener("change", () => {
  const status = check.closest(".bid-doc-row").querySelector("[data-document-status]");
  if (check.checked && status && status.textContent === "Chưa đính kèm") {
    status.textContent = "Đã rà soát";
    status.classList.add("review");
  } else if (!check.checked && status?.classList.contains("review")) {
    status.textContent = "Chưa đính kèm";
    status.classList.remove("review");
  }
  updateBidProgress();
}));

document.querySelector("#saveBidDraft").addEventListener("click", () => {
  const state = Object.fromEntries(bidChecks.map((check) => [check.dataset.documentKey, check.checked]));
  localStorage.setItem(`bid-draft:${bidRoot.dataset.tenderId}`, JSON.stringify(state));
  notifyBid("Đã lưu tiến độ trên trình duyệt này");
});

document.querySelector("#requestReview").addEventListener("click", () => {
  const pending = bidChecks.length - bidChecks.filter((check) => check.checked).length;
  if (pending) {
    notifyBid(`Còn ${pending} mục cần hoàn thiện trước khi kiểm tra chéo`);
    const firstPending = bidChecks.find((check) => !check.checked);
    firstPending?.closest(".bid-section-card").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  notifyBid("Hồ sơ đã sẵn sàng để Phòng Đấu thầu kiểm tra chéo");
});

submitButton.addEventListener("click", () => {
  if (submitButton.disabled) return;
  document.querySelector("#bidStatus").textContent = "Đã nộp hồ sơ";
  document.querySelector("#bidStatus").dataset.status = "submitted";
  document.querySelector('[data-upload-for="submission-receipt"]').disabled = false;
  document.querySelector("#submissionHint").textContent = "Đã ghi nhận nộp hồ sơ. Đính kèm biên nhận để hoàn tất theo dõi trạng thái.";
  submitButton.textContent = "Đã ghi nhận nộp ✓";
  submitButton.disabled = true;
  notifyBid("Đã ghi nhận trạng thái nộp hồ sơ trong prototype");
});

document.querySelector("#bidMoreActions").addEventListener("click", () => notifyBid("Các thao tác khác sẽ được cấu hình cùng backend"));

const savedDraft = localStorage.getItem(`bid-draft:${bidRoot.dataset.tenderId}`);
if (savedDraft) {
  const state = JSON.parse(savedDraft);
  bidChecks.forEach((check) => {
    check.checked = Boolean(state[check.dataset.documentKey]);
    if (check.checked) {
      const status = check.closest(".bid-doc-row").querySelector("[data-document-status]");
      status.textContent = "Đã rà soát";
      status.classList.add("review");
    }
  });
}
updateBidProgress();
