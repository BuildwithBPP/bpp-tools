const form = document.querySelector("[data-library-filters]");
const rows = [...document.querySelectorAll("[data-library-row]")];
const empty = document.querySelector("[data-library-empty]");

function applyFilters() {
  if (!form) return;
  const data = new FormData(form);
  const query = String(data.get("q") ?? "").trim().toLowerCase();
  const section = String(data.get("section") ?? "").toLowerCase();
  const department = String(data.get("department") ?? "").toLowerCase();
  const owner = String(data.get("owner") ?? "").toLowerCase();
  const status = String(data.get("status") ?? "").toLowerCase();
  const migration = String(data.get("migration") ?? "").toLowerCase();
  const confidentiality = String(data.get("confidentiality") ?? "").toLowerCase();
  let visible = 0;

  for (const row of rows) {
    const haystack = [
      row.dataset.title,
      row.dataset.description,
      row.dataset.section,
      row.dataset.department,
      row.dataset.owner,
      row.dataset.status,
      row.dataset.migration,
      row.dataset.confidentiality,
      row.dataset.source
    ].join(" ");
    const matches =
      (!query || haystack.includes(query)) &&
      (!section || row.dataset.section === section) &&
      (!department || row.dataset.department === department) &&
      (!owner || row.dataset.owner === owner) &&
      (!status || row.dataset.status === status) &&
      (!migration || row.dataset.migration === migration) &&
      (!confidentiality || row.dataset.confidentiality === confidentiality);
    row.hidden = !matches;
    if (matches) visible += 1;
  }

  if (empty) empty.hidden = visible !== 0;
}

if (form) {
  const params = new URLSearchParams(window.location.search);
  for (const name of ["q", "section", "department", "owner", "status", "migration", "confidentiality"]) {
    const control = form.elements.namedItem(name);
    const value = params.get(name);
    if (value && control instanceof HTMLInputElement) control.value = value;
    if (value && control instanceof HTMLSelectElement) control.value = value;
  }
  form.addEventListener("input", applyFilters);
  form.addEventListener("change", applyFilters);
  applyFilters();
  if (params.get("focus") === "search") form.querySelector('input[name="q"]')?.focus();
}
