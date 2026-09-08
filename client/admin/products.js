let categoriesCache = [];
let brandsCache = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAdmin()) return;
  renderAdminShell("products");
  document.getElementById("new-product-btn").addEventListener("click", () => openModal());
  document.getElementById("cancel-product-btn").addEventListener("click", closeModal);
  document.getElementById("product-form").addEventListener("submit", saveProduct);
  await loadCatalogOptions();
  await loadProducts();
});

async function loadCatalogOptions() {
  [categoriesCache, brandsCache] = await Promise.all([Api.get("/categories"), Api.get("/brands/manage")]);
  document.getElementById("product-category").innerHTML = categoriesCache.map((category) => `<option value="${category._id}">${escapeHtml(category.name)}</option>`).join("");
  document.getElementById("product-brand").innerHTML = `<option value="">Choose a brand</option>${brandsCache.map((brand) => `<option value="${brand._id}">${escapeHtml(brand.name)}${brand.isActive ? "" : " (hidden)"}</option>`).join("")}`;
}

async function loadProducts() {
  const root = document.getElementById("products-root");
  root.innerHTML = `<span class="spinner">Loading products…</span>`;
  try {
    const data = await Api.get("/products?limit=100&sort=newest");
    if (!data.products.length) {
      root.innerHTML = `<div class="empty-state"><h2>No products yet</h2><p>Create your first catalog item.</p></div>`;
      return;
    }
    root.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Category</th><th>Brand</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>${data.products.map(productRow).join("")}</tbody></table></div>`;
    root.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", async () => {
      try { openModal(await Api.get("/products/" + button.dataset.edit)); }
      catch (error) { showTopAlert(error.message, "error"); }
    }));
    root.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteProduct(button.dataset.delete)));
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><h2>Products unavailable</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function productRow(product) {
  const image = product.images?.[0];
  return `<tr>
    <td><div class="table-product"><div class="table-thumb">${image ? `<img src="${escapeHtml(resolveImage(image))}" alt="" />` : `<span>${escapeHtml(product.name.charAt(0))}</span>`}</div><div><strong>${escapeHtml(product.name)}</strong>${product.isFeatured ? `<small>Featured</small>` : ""}</div></div></td>
    <td>${escapeHtml(product.category?.name || "—")}</td>
    <td>${escapeHtml(product.brandRef?.name || product.brand || "Generic")}</td>
    <td><strong>${money(product.discountPrice > 0 ? product.discountPrice : product.price)}</strong>${product.discountPrice > 0 ? `<small><s>${money(product.price)}</s></small>` : ""}</td>
    <td><span class="${product.stock <= 5 ? "danger-text" : ""}">${product.stock}</span></td>
    <td class="row-actions"><button class="btn btn-outline btn-sm" data-edit="${product._id}">Edit</button><button class="btn btn-danger btn-sm" data-delete="${product._id}">Delete</button></td>
  </tr>`;
}

function openModal(product = null) {
  if (!categoriesCache.length || !brandsCache.length) {
    showTopAlert("Create at least one category and one brand before adding products.", "error");
    return;
  }
  document.getElementById("modal-title").textContent = product ? "Edit product" : "New product";
  document.getElementById("product-id").value = product?._id || "";
  document.getElementById("product-name").value = product?.name || "";
  document.getElementById("product-category").value = product?.category?._id || product?.category || categoriesCache[0]._id;
  document.getElementById("product-brand").value = product?.brandRef?._id || product?.brandRef || "";
  document.getElementById("product-price").value = product?.price ?? "";
  document.getElementById("product-discount").value = product?.discountPrice || "";
  document.getElementById("product-stock").value = product?.stock ?? "";
  document.getElementById("product-description").value = product?.description || "";
  document.getElementById("product-featured").checked = Boolean(product?.isFeatured);
  document.getElementById("product-image-file").value = "";
  document.getElementById("product-image-url").value = product?.images?.[0] || "";
  document.getElementById("product-modal").classList.remove("hidden");
  document.getElementById("product-name").focus();
}

function closeModal() { document.getElementById("product-modal").classList.add("hidden"); }

async function saveProduct(event) {
  event.preventDefault();
  const saveButton = document.getElementById("save-product-btn");
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";
  try {
    let imageUrl = document.getElementById("product-image-url").value;
    const imageFile = document.getElementById("product-image-file").files?.[0];
    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      imageUrl = (await Api.post("/uploads", formData, { isForm: true })).url;
    }
    const id = document.getElementById("product-id").value;
    const payload = {
      name: document.getElementById("product-name").value.trim(),
      category: document.getElementById("product-category").value,
      brandRef: document.getElementById("product-brand").value,
      price: Number(document.getElementById("product-price").value),
      discountPrice: Number(document.getElementById("product-discount").value) || 0,
      stock: Number(document.getElementById("product-stock").value),
      description: document.getElementById("product-description").value.trim(),
      isFeatured: document.getElementById("product-featured").checked,
      images: imageUrl ? [imageUrl] : [],
    };
    if (id) await Api.put("/products/" + id, payload);
    else await Api.post("/products", payload);
    closeModal();
    showTopAlert("Product saved.", "success");
    await loadProducts();
  } catch (error) {
    showTopAlert(error.message, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save";
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product? This cannot be undone.")) return;
  try { await Api.del("/products/" + id); showTopAlert("Product deleted.", "success"); await loadProducts(); }
  catch (error) { showTopAlert(error.message, "error"); }
}

function showTopAlert(message, type) {
  const box = document.getElementById("alert-box");
  box.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
  setTimeout(() => { box.innerHTML = ""; }, 3500);
}
