document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAdmin()) return;
  renderAdminShell("categories");

  document.getElementById("new-category-btn").addEventListener("click", () => openModal());
  document.getElementById("cancel-category-btn").addEventListener("click", closeModal);
  document.getElementById("category-form").addEventListener("submit", saveCategory);

  await loadCategories();
});

async function loadCategories() {
  const root = document.getElementById("categories-root");
  try {
    const categories = await Api.get("/categories");
    if (categories.length === 0) {
      root.innerHTML = `<div class="empty-state">No categories yet. Create your first one.</div>`;
      return;
    }
    root.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Slug</th><th>Actions</th></tr></thead>
        <tbody>
          ${categories
            .map(
              (c) => `
            <tr>
              <td>${escapeHtml(c.name)}</td>
              <td>${escapeHtml(c.slug)}</td>
              <td class="row-actions">
                <button class="btn btn-outline btn-sm" data-edit='${JSON.stringify(c).replace(/'/g, "&apos;")}'>Edit</button>
                <button class="btn btn-outline btn-sm" data-delete="${c._id}">Delete</button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    root.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(JSON.parse(btn.dataset.edit)));
    });
    root.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => deleteCategory(btn.dataset.delete));
    });
  } catch (e) {
    root.innerHTML = `<div class="empty-state">Could not load categories: ${escapeHtml(e.message)}</div>`;
  }
}

function openModal(category = null) {
  document.getElementById("modal-title").textContent = category ? "Edit category" : "New category";
  document.getElementById("category-id").value = category ? category._id : "";
  document.getElementById("category-name").value = category ? category.name : "";
  document.getElementById("category-image").value = category ? category.image || "" : "";
  document.getElementById("category-modal").classList.remove("hidden");
}
function closeModal() {
  document.getElementById("category-modal").classList.add("hidden");
}

async function saveCategory(e) {
  e.preventDefault();
  const id = document.getElementById("category-id").value;
  const payload = {
    name: document.getElementById("category-name").value.trim(),
    image: document.getElementById("category-image").value.trim(),
  };

  try {
    if (id) {
      await Api.put(`/categories/${id}`, payload);
    } else {
      await Api.post("/categories", payload);
    }
    closeModal();
    showTopAlert("Category saved.", "success");
    await loadCategories();
  } catch (err) {
    showTopAlert(err.message, "error");
  }
}

async function deleteCategory(id) {
  if (!confirm("Delete this category? This can't be undone.")) return;
  try {
    await Api.del(`/categories/${id}`);
    showTopAlert("Category deleted.", "success");
    await loadCategories();
  } catch (err) {
    showTopAlert(err.message, "error");
  }
}

function showTopAlert(message, type) {
  const box = document.getElementById("alert-box");
  box.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
  setTimeout(() => (box.innerHTML = ""), 3500);
}
