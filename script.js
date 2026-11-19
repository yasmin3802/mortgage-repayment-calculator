/* ==========================================================
   Mortgage repayment calculator: validation + calculation
   ========================================================== */

const form = document.getElementById("mortgage-form");
const clearBtn = document.getElementById("clear-all");

const emptyState = document.getElementById("results-empty");
const doneState = document.getElementById("results-done");
const monthlyEl = document.getElementById("monthly-result");
const totalEl = document.getElementById("total-result");

// The three text fields share the same rules, so they live in one list
const fields = [
  { id: "amount", label: "mortgage amount", max: 1_000_000_000 },
  { id: "term", label: "mortgage term", max: 100 },
  { id: "rate", label: "interest rate", max: 100 },
];

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/* ---------- Helpers ---------- */

// "300,000" -> 300000 (returns NaN if it isn't a number)
function toNumber(text) {
  const cleaned = text.replace(/,/g, "").trim();
  return cleaned === "" ? NaN : Number(cleaned);
}

function showError(id, message) {
  const input = document.getElementById(id);
  const error = document.getElementById(`${id}-error`);
  const group = input.closest(".input-group");

  error.textContent = message;
  error.hidden = false;
  if (group) group.classList.add("is-invalid");
  input.setAttribute("aria-invalid", "true");
}

function clearError(id) {
  const input = document.getElementById(id);
  const error = document.getElementById(`${id}-error`);
  const group = input.closest(".input-group");

  error.textContent = "";
  error.hidden = true;
  if (group) group.classList.remove("is-invalid");
  input.removeAttribute("aria-invalid");
}

function showTypeError() {
  const error = document.getElementById("type-error");
  error.textContent = "This field is required";
  error.hidden = false;
}

function clearTypeError() {
  const error = document.getElementById("type-error");
  error.textContent = "";
  error.hidden = true;
}

/* ---------- Validation ---------- */

// Returns the first invalid element (so we can focus it), or null if all is well
function validate() {
  let firstInvalid = null;

  fields.forEach(({ id, label, max }) => {
    const input = document.getElementById(id);
    const raw = input.value.trim();
    const value = toNumber(raw);
    let message = "";

    if (raw === "") {
      message = "This field is required";
    } else if (Number.isNaN(value) || value <= 0) {
      message = `Enter a ${label} greater than 0`;
    } else if (value > max) {
      message = `Enter a ${label} of ${max.toLocaleString("en-GB")} or less`;
    }

    if (message) {
      showError(id, message);
      if (!firstInvalid) firstInvalid = input;
    } else {
      clearError(id);
    }
  });

  const type = form.elements.type.value;
  if (!type) {
    showTypeError();
    if (!firstInvalid) firstInvalid = form.querySelector('input[name="type"]');
  } else {
    clearTypeError();
  }

  return firstInvalid;
}

/* ---------- Calculation ---------- */

function calculate(principal, years, annualRate, type) {
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  let monthly;

  if (type === "repayment") {
    // Standard amortisation formula: M = P * r(1+r)^n / ((1+r)^n - 1)
    monthly =
      monthlyRate === 0
        ? principal / months
        : (principal * monthlyRate * (1 + monthlyRate) ** months) /
          ((1 + monthlyRate) ** months - 1);
  } else {
    // Interest only: you just pay the interest each month
    monthly = principal * monthlyRate;
  }

  return { monthly, total: monthly * months };
}

/* ---------- Results ---------- */

function showResults({ monthly, total }) {
  monthlyEl.textContent = gbp.format(monthly);
  totalEl.textContent = gbp.format(total);
  emptyState.hidden = true;
  doneState.hidden = false;

  // On small screens the results sit below the form, so bring them into view
  if (window.matchMedia("(max-width: 49.9375rem)").matches) {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    doneState.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }
}

function resetResults() {
  emptyState.hidden = false;
  doneState.hidden = true;
  monthlyEl.textContent = "";
  totalEl.textContent = "";
}

/* ---------- Events ---------- */

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const firstInvalid = validate();
  if (firstInvalid) {
    resetResults();
    firstInvalid.focus();
    return;
  }

  const result = calculate(
    toNumber(form.elements.amount.value),
    toNumber(form.elements.term.value),
    toNumber(form.elements.rate.value),
    form.elements.type.value
  );
  showResults(result);
});

// Only allow digits, commas and a decimal point; clear the error while typing
fields.forEach(({ id }) => {
  const input = document.getElementById(id);

  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9.,]/g, "");
    clearError(id);
  });
});

// Add thousands separators to the amount when leaving the field: 300000 -> 300,000
document.getElementById("amount").addEventListener("blur", (event) => {
  const value = toNumber(event.target.value);
  if (!Number.isNaN(value) && value > 0) {
    event.target.value = value.toLocaleString("en-GB", {
      maximumFractionDigits: 2,
    });
  }
});

form.querySelectorAll('input[name="type"]').forEach((radio) => {
  radio.addEventListener("change", clearTypeError);
});

clearBtn.addEventListener("click", () => {
  form.reset();
  fields.forEach(({ id }) => clearError(id));
  clearTypeError();
  resetResults();
  document.getElementById("amount").focus();
});