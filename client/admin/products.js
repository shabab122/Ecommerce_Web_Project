let categoriesCache = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAdmin()) return;
  renderAdminShell("products");

  document.getElementById("new-product-btn").addEventListener("click", () => openModal());
  document.getElementById("cancel-product-btn").addEventListener("click", closeModal);
  document.getElementById("product-form").addEventListener("submit", saveProduct);

  await loadCategoryOptions();
  await loadProducts();
});

async function loadCategoryOptions() {
  categoriesCache = await Api.get("/categories");
  document.getElementById("product-category").innerHTML = categoriesCache
    .map((c) => `<option value="${c._id}">${escapeHtml(c.name)}</option>`)
    .join("");
}

async function loadProducts() {
  const root = document.getElementById("products-root");
  try {
    const data = await Api.get("/products?limit=100&sort=newest");
    if (data.products.length === 0) {
      root.innerHTML = `<div class="empty-state">No products yet. Create your first one.</div>`;
      return;
    }
    root.innerHTML = `
      <table class="data-table">
        <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
        <tbody>
          ${data.products
            .map(
              (p) => `
            <tr>
              <td><div class="table-thumb">${
                p.images && p.images.length ? `<img src="${resolveImage(p.images[0])}" alt="" />` : ""
              }</div></td>
              <td>${escapeHtml(p.name)}</td>
              <td>${p.category ? escapeHtml(p.category.name) : ""}</td>
              <td>${money(p.discountPrice > 0 ? p.discountPrice : p.price)}</td>
              <td>${p.stock}</td>
              <td class="row-actions">
                <button class="btn btn-outline btn-sm" data-edit="${p._id}">Edit</button>
                <button class="btn btn-outline btn-sm" data-delete="${p._id}">Delete</button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    root.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const product = await Api.get(`/products/${btn.dataset.edit}`);
        openModal(product);
      });
    });
    root.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.delete));
    });
  } catch (e) {
    root.innerHTML = `<div class="empty-state">Could not load products: ${escapeHtml(e.message)}</div>`;
  }
}

function openModal(product = null) {
  document.getElementById("modal-title").textContent = product ? "Edit product" : "New product";
  document.getElementById("product-id").value = product ? product._id : "";
  document.getElementById("product-name").value = product ? product.name : "";
  document.getElementById("product-category").value = product && product.category ? product.category._id || product.category : categoriesCache[0]?._id || "";
  document.getElementById("product-brand").value = product ? product.brand || "" : "";
  document.getElementById("product-price").value = product ? product.price : "";
  document.getElementById("product-discount").value = product ? product.discountPrice || "" : "";
  document.getElementById("product-stock").value = product ? product.stock : "";
  document.getElementById("product-description").value = product ? product.description || "" : "";
  document.getElementById("product-featured").checked = product ? !!product.isFeatured : false;
  document.getElementById("product-image-file").value = "";
  document.getElementById("product-image-url").value = product && product.images && product.images.length ? product.images[0] : "";
  document.getElementById("product-modal").classList.remove("hidden");
}
function closeModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

async function saveProduct(e) {
  e.preventDefault();
  const saveBtn = document.getElementById("save-product-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {
    let imageUrl = document.getElementById("product-image-url").value;
    const fileInput = document.getElementById("product-image-file");

    if (fileInput.files && fileInput.files[0]) {
      const formData = new FormData();
      formData.append("image", fileInput.files[0]);
      const uploaded = await Api.post("/uploads", formData, { isForm: true });
      imageUrl = uploaded.url;
    }

    const id = document.getElementById("product-id").value;
    const payload = {
      name: document.getElementById("product-name").value.trim(),
      category: document.getElementById("product-category").value,
      brand: document.getElementById("product-brand").value.trim() || "Generic",
      price: Number(document.getElementById("product-price").value),
      discountPrice: Number(document.getElementById("product-discount").value) || 0,
      stock: Number(document.getElementById("product-stock").value),
      description: document.getElementById("product-description").value.trim(),
      isFeatured: document.getElementById("product-featured").checked,
      images: imageUrl ? [imageUrl] : [],
    };

    if (id) {
      await Api.put(`/products/${id}`, payload);
    } else {
      await Api.post("/products", payload);
    }

    closeModal();
    showTopAlert("Product saved.", "success");
    await loadProducts();
  } catch (err) {
    showTopAlert(err.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product? This can't be undone.")) return;
  try {
    await Api.del(`/products/${id}`);
    showTopAlert("Product deleted.", "success");
    await loadProducts();
  } catch (err) {
    showTopAlert(err.message, "error");
  }
}

function showTopAlert(message, type) {
  const box = document.getElementById("alert-box");
  box.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
  setTimeout(() => (box.innerHTML = ""), 3500);
}
