const button = document.querySelector("[data-screen-share-toggle]");
button?.addEventListener("click", () => {
  const active = document.documentElement.toggleAttribute("data-screen-share");
  button.setAttribute("aria-pressed", String(active));
  button.textContent = active ? "Exit screen-share" : "Screen-share mode";
});
