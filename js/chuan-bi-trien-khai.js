const mobilizationRoot = document.querySelector("#mobilizationWorkspace");
const mobilizationTasks = [...document.querySelectorAll("[data-task-key]")];
const mobilizationFields = [...document.querySelectorAll("[data-field]")];
const mobilizationKey = `project-mobilization:${mobilizationRoot.dataset.projectId}`;

function mobilizationToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(mobilizationToast.timer);
  mobilizationToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function updateMobilization() {
  const done = mobilizationTasks.filter((task) => task.checked).length;
  const percent = Math.round((done / mobilizationTasks.length) * 100);
  document.querySelector("#mobilizationProgressText").textContent = `${done} / ${mobilizationTasks.length} đầu việc hoàn tất`;
  document.querySelector("#mobilizationProgressPercent").textContent = `${percent}%`;
  document.querySelector("#mobilizationProgressBar").style.width = `${percent}%`;
  document.querySelector(".mobilization-progress-track").setAttribute("aria-valuenow", String(percent));
  document.querySelector("#mobilizationProgress").dataset.progress = String(percent);

  const steps = [...document.querySelectorAll(".mobilization-step")];
  let currentStep = null;
  steps.forEach((step) => {
    const section = document.querySelector(`[data-mobilization-step="${step.dataset.stepKey}"]`);
    const tasks = [...section.querySelectorAll("[data-task-key]")];
    const complete = tasks.length > 0 && tasks.every((task) => task.checked);
    const state = section.querySelector("[data-section-state]");
    const started = tasks.some((task) => task.checked);
    state.textContent = complete ? "Hoàn tất" : started ? "Đang thực hiện" : "Chưa bắt đầu";
    step.classList.toggle("complete", complete);
    step.classList.remove("current");
    if (!complete && !currentStep) currentStep = step;
  });
  currentStep?.classList.add("current");

  const ready = done === mobilizationTasks.length;
  document.querySelector("#mobilizationReadyPanel").dataset.ready = String(ready);
  document.querySelector("#confirmReadyToStart").disabled = !ready;
  document.querySelector("#confirmReadyToStart").title = ready ? "Xác nhận sẵn sàng khởi công" : "Hoàn thành đủ 8 đầu việc trước khi xác nhận";
  if (ready) {
    const confirmed = document.querySelector("#mobilizationStatus").dataset.status === "ready-to-start";
    document.querySelector("#mobilizationReadyTitle").textContent = confirmed ? "Công trình đã sẵn sàng khởi công" : "Đã hoàn tất hồ sơ chuẩn bị";
    document.querySelector("#mobilizationReadyHint").textContent = confirmed
      ? "Hồ sơ triển khai đã đủ. Có thể phát lệnh khởi công và chuyển sang theo dõi thi công."
      : "Xác nhận điều kiện để chuyển công trình sang trạng thái sẵn sàng khởi công.";
  } else {
    document.querySelector("#mobilizationReadyTitle").textContent = "Công trình chưa đủ điều kiện khởi công";
    document.querySelector("#mobilizationReadyHint").textContent = `Còn ${mobilizationTasks.length - done} đầu việc cần hoàn tất và xác nhận.`;
    if (document.querySelector("#mobilizationStatus").dataset.status === "ready-to-start") {
      document.querySelector("#mobilizationStatus").dataset.status = "preparing";
      document.querySelector("#mobilizationStatus").textContent = "Đang chuẩn bị";
      document.querySelector("#summaryContractStatus").textContent = "Đã ký · Có hiệu lực";
    }
  }

  const firstIncomplete = mobilizationTasks.find((task) => !task.checked);
  const nextText = firstIncomplete
    ? firstIncomplete.closest(".mobilization-section-card").querySelector("h2").textContent
    : "Tất cả đầu việc đã xong. Xác nhận sẵn sàng để chuyển sang thi công.";
  document.querySelector("#mobilizationNextText").textContent = firstIncomplete ? `Hoàn tất tiếp: ${nextText}.` : nextText;

  const startDate = document.querySelector("#plannedStart").value;
  document.querySelector("#summaryStartDate").textContent = startDate ? formatDate(startDate) : "Chưa cập nhật";
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function saveMobilizationDraft(showMessage = true) {
  const state = {
    tasks: Object.fromEntries(mobilizationTasks.map((task) => [task.dataset.taskKey, task.checked])),
    fields: Object.fromEntries(mobilizationFields.map((field) => [field.dataset.field, field.value])),
    status: document.querySelector("#mobilizationStatus").dataset.status,
  };
  localStorage.setItem(mobilizationKey, JSON.stringify(state));
  if (showMessage) mobilizationToast("Đã lưu tiến độ trên trình duyệt này");
}

document.querySelectorAll("[data-upload-for]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(`[data-file-input="${button.dataset.uploadFor}"]`).click();
  });
});

document.querySelectorAll("[data-file-input]").forEach((input) => {
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const taskKey = input.dataset.completesTask;
    const task = taskKey ? document.querySelector(`[data-task-key="${taskKey}"]`) : null;
    if (task) task.checked = true;
    const button = document.querySelector(`[data-upload-for="${input.dataset.fileInput}"]`);
    if (button) button.textContent = "✓ Đã chọn tệp";
    updateMobilization();
    mobilizationToast(`Đã chọn tệp: ${file.name}`);
  });
});

mobilizationTasks.forEach((task) => task.addEventListener("change", updateMobilization));
mobilizationFields.forEach((field) => field.addEventListener("input", updateMobilization));
mobilizationFields.forEach((field) => field.addEventListener("change", updateMobilization));

document.querySelector("#permitType").addEventListener("change", (event) => {
  const notRequired = event.target.value === "not-required";
  const permitNumber = document.querySelector("#permitNumber");
  const permitDate = document.querySelector("#permitDate");
  permitNumber.disabled = notRequired;
  permitDate.disabled = notRequired;
  if (notRequired) {
    permitNumber.value = "Không yêu cầu";
    permitDate.value = "";
    document.querySelector("#permitReady").checked = true;
  } else {
    permitNumber.value = "";
    document.querySelector("#permitReady").checked = false;
  }
  updateMobilization();
});

document.querySelector("#confirmReadyToStart").addEventListener("click", () => {
  if (mobilizationTasks.some((task) => !task.checked)) return;
  const status = document.querySelector("#mobilizationStatus");
  status.dataset.status = "ready-to-start";
  status.textContent = "Sẵn sàng khởi công";
  document.querySelector("#mobilizationReadyPanel").dataset.ready = "true";
  document.querySelector("#mobilizationReadyTitle").textContent = "Công trình đã sẵn sàng khởi công";
  document.querySelector("#mobilizationReadyHint").textContent = "Hồ sơ triển khai đã đủ. Có thể phát lệnh khởi công và chuyển sang theo dõi thi công.";
  document.querySelector("#summaryContractStatus").textContent = "Hiệu lực · Đủ điều kiện triển khai";
  saveMobilizationDraft(false);
  mobilizationToast("Đã xác nhận công trình sẵn sàng khởi công");
});

document.querySelector("#saveMobilizationDraft").addEventListener("click", () => saveMobilizationDraft());
document.querySelector("#continueMobilization").addEventListener("click", () => {
  const incomplete = mobilizationTasks.find((task) => !task.checked);
  if (incomplete) {
    incomplete.closest(".mobilization-section-card").scrollIntoView({ behavior: "smooth", block: "center" });
    mobilizationToast("Đang chuyển đến đầu việc cần hoàn tất tiếp theo");
  } else {
    document.querySelector("#mobilizationReadyPanel").scrollIntoView({ behavior: "smooth", block: "center" });
    mobilizationToast("Đã đủ đầu việc để xác nhận sẵn sàng khởi công");
  }
});
document.querySelector("#mobilizationMore").addEventListener("click", () => mobilizationToast("Các thao tác bổ sung sẽ được cấu hình cùng backend"));

const savedMobilization = localStorage.getItem(mobilizationKey);
if (savedMobilization) {
  const state = JSON.parse(savedMobilization);
  mobilizationTasks.forEach((task) => { task.checked = Boolean(state.tasks?.[task.dataset.taskKey]); });
  mobilizationFields.forEach((field) => { if (state.fields?.[field.dataset.field] !== undefined) field.value = state.fields[field.dataset.field]; });
  if (state.status === "ready-to-start") {
    document.querySelector("#mobilizationStatus").dataset.status = "ready-to-start";
    document.querySelector("#mobilizationStatus").textContent = "Sẵn sàng khởi công";
    document.querySelector("#mobilizationReadyTitle").textContent = "Công trình đã sẵn sàng khởi công";
    document.querySelector("#mobilizationReadyHint").textContent = "Hồ sơ triển khai đã đủ. Có thể phát lệnh khởi công và chuyển sang theo dõi thi công.";
  }
}
updateMobilization();
