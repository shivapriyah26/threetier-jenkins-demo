// script.js - Presentation tier logic
// In Docker/production, nginx proxies "/api" to the backend service (see nginx.conf).
const API_BASE = "/api/contacts";

const form = document.getElementById("contact-form");
const list = document.getElementById("contact-list");

async function loadContacts() {
  const res = await fetch(API_BASE);
  const contacts = await res.json();
  list.innerHTML = "";
  contacts.forEach((c) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${c.name} — ${c.email}</span><span class="delete" data-id="${c.id}">✕</span>`;
    list.appendChild(li);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;

  await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, phone }),
  });

  form.reset();
  loadContacts();
});

list.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete")) {
    const id = e.target.getAttribute("data-id");
    await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    loadContacts();
  }
});

loadContacts();
