document.addEventListener("moduleSwitched", (e) => {
  const module = e.detail;
  if (Modules[module]) {
    Modules[module].render();
  }
});

const Modules = {
  overview: {
    render() {
      document.getElementById("count-customers").textContent =
        DataStore.get("customers").length;
      document.getElementById("count-suppliers").textContent =
        DataStore.get("suppliers").length;

      const sales = DataStore.get("sales");
      const totalSales = sales.reduce(
        (sum, s) => sum + Number(s.total || 0),
        0,
      );
      document.getElementById("count-sales").textContent =
        `$${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

      const purchases = DataStore.get("purchases");
      const totalPurchases = purchases.reduce(
        (sum, p) => sum + Number(p.total || 0),
        0,
      );
      document.getElementById("count-purchases").textContent =
        `$${totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    },
  },

  buildContactModule(type) {
    const isCust = type === "customers";
    const title = isCust ? "Customer" : "Supplier";
    const invType = isCust ? "sales" : "purchases";
    const pTypeTitle = isCust ? "Customer" : "Supplier";

    return {
      render: () => {
        const container = document.getElementById(`module-${type}`);
        container.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <input type="text" id="search-${type}" class="search-bar form-control" placeholder="Search ${type}...">
                            <button class="btn btn-primary" onclick="Modules.${type}.showForm()">➕ Add ${title}</button>
                        </div>
                        <div class="table-responsive">
                            <table id="table-${type}">
                                <thead>
                                    <tr><th>Contact</th><th>Total Invd</th><th>Total Paid</th><th>Balance</th><th>Actions</th></tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                `;
        Modules[type].loadTable();
        document
          .getElementById(`search-${type}`)
          .addEventListener("input", (e) =>
            Modules[type].loadTable(e.target.value),
          );
      },
      loadTable: (query = "") => {
        const tbody = document.querySelector(`#table-${type} tbody`);
        let data = DataStore.get(type);
        const invoices = DataStore.get(invType);
        const bankPays = DataStore.get("bank_payments");
        const cashPays = DataStore.get("cash_payments");

        if (query) {
          data = data.filter(
            (c) =>
              Math.max(
                c.name.toLowerCase().indexOf(query.toLowerCase()),
                (c.phone || "").indexOf(query),
              ) !== -1,
          );
        }
        tbody.innerHTML = "";
        data.forEach((c) => {
          const myInvs = invoices.filter((i) => Number(i.rel_id) === c.id);
          const totalInvoiced = myInvs.reduce(
            (sum, i) => sum + Number(i.total || 0),
            0,
          );

          const myBank = bankPays.filter(
            (p) =>
              p.payment_type === pTypeTitle && Number(p.entity_id) === c.id,
          );
          const myCash = cashPays.filter(
            (p) =>
              p.payment_type === pTypeTitle && Number(p.entity_id) === c.id,
          );

          const totalPaid = [...myBank, ...myCash].reduce(
            (sum, p) => sum + Number(p.amount || 0),
            0,
          );

          const balance = totalInvoiced - totalPaid;

          tbody.innerHTML += `
                        <tr>
                            <td><strong>${c.name}</strong><br><small class="text-subtle">${c.phone || "-"}</small></td>
                            <td>$${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td>$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td><strong style="color: ${balance > 0 ? "var(--danger)" : balance < 0 ? "var(--success)" : "inherit"}">$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                            <td>
                                <button class="action-btn edit" onclick="Modules.${type}.showForm(${c.id})">✎</button>
                                <button class="action-btn delete" onclick="Modules.${type}.delete(${c.id})">🗑</button>
                            </td>
                        </tr>
                    `;
        });
      },
      showForm: (id = null) => {
        const item = id
          ? DataStore.get(type).find((c) => c.id === id)
          : { name: "", phone: "", email: "", address: "" };
        const html = `
                    <div class="form-group">
                        <label class="form-label">Name</label>
                        <input type="text" id="form-name" class="form-control" value="${item.name || ""}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Phone</label>
                        <input type="text" id="form-phone" class="form-control" value="${item.phone || ""}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="form-email" class="form-control" value="${item.email || ""}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Address</label>
                        <input type="text" id="form-address" class="form-control" value="${item.address || ""}">
                    </div>
                `;
        Dashboard.showModal(id ? `Edit ${title}` : `Add ${title}`, html, () => {
          const name = document.getElementById("form-name").value;
          if (!name) {
            Dashboard.showToast("Name is required", "error");
            return false;
          }
          const payload = {
            name,
            phone: document.getElementById("form-phone").value,
            email: document.getElementById("form-email").value,
            address: document.getElementById("form-address").value,
          };
          if (id) {
            DataStore.update(type, id, payload);
            Dashboard.showToast(`${title} updated`);
          } else {
            DataStore.add(type, payload);
            Dashboard.showToast(`${title} added`);
          }
          Modules[type].loadTable();
          return true;
        });
      },
      delete: (id) => {
        if (confirm(`Are you sure you want to delete this ${title}?`)) {
          DataStore.remove(type, id);
          Dashboard.showToast(`${title} deleted`);
          Modules[type].loadTable();
        }
      },
    };
  },

  buildInvoiceModule(type) {
    const isSales = type === "sales";
    const title = isSales ? "Sales Invoice" : "Purchase Invoice";
    const relType = isSales ? "customers" : "suppliers";
    const relTitle = isSales ? "Customer" : "Supplier";

    return {
      render: () => {
        const container = document.getElementById(`module-${type}`);
        container.innerHTML = `
                    <div class="card">
                        <div class="card-header">
                            <input type="text" id="search-${type}" class="search-bar form-control" placeholder="Search invoices...">
                            <button class="btn btn-primary" onclick="Modules.${type}.showForm()">➕ Add Invoice</button>
                        </div>
                        <div class="table-responsive">
                            <table id="table-${type}">
                                <thead>
                                    <tr><th>ID / Ref</th><th>${relTitle}</th><th>Date</th><th>Total</th><th>Actions</th></tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                `;
        Modules[type].loadTable();
        document
          .getElementById(`search-${type}`)
          .addEventListener("input", (e) =>
            Modules[type].loadTable(e.target.value),
          );
      },
      loadTable: (query = "") => {
        const tbody = document.querySelector(`#table-${type} tbody`);
        let data = DataStore.get(type);
        const relData = DataStore.get(relType);
        if (query) {
          data = data.filter(
            (i) =>
              (i.inv_number || `INV-${i.id}`).includes(query) ||
              (i.date && i.date.includes(query)),
          );
        }
        tbody.innerHTML = "";
        data.forEach((i) => {
          const rel = relData.find((r) => r.id === Number(i.rel_id));
          const invNumber = i.inv_number || `${String(i.id).slice(-5)}`;
          tbody.innerHTML += `
                        <tr>
                            <td><a href="#" onclick="Modules.${type}.showForm(${i.id})"><span class="badge badge-primary">${isSales ? "INV-" : ""}${invNumber}</span></a></td>
                            <td>${rel ? rel.name : "Unknown"}</td>
                            <td>${i.date}</td>
                            <td>$${Number(i.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td>
                                <button class="action-btn edit" onclick="Modules.${type}.showForm(${i.id})">✎</button>
                                <button class="action-btn delete" onclick="Modules.${type}.delete(${i.id})">🗑</button>
                            </td>
                        </tr>
                    `;
        });
      },
      showForm: (id = null) => {
        const item = id
          ? DataStore.get(type).find((i) => i.id === id)
          : {
              rel_id: "",
              date: new Date().toISOString().split("T")[0],
              items: [],
              total: 0,
              inv_number: "",
              payment_amount: 0,
              payment_source: "",
              currency_id: 1,
            };
        const rels = DataStore.get(relType);
        const relOpts = rels
          .map(
            (r) =>
              `<option value="${r.id}" ${r.id == item.rel_id ? "selected" : ""}>${r.name}</option>`,
          )
          .join("");

        const curls = DataStore.get("currencies");
        const curlOpts = curls
          .map(
            (c) =>
              `<option value="${c.id}" ${c.id == item.currency_id ? "selected" : ""}>${c.name} (${c.symbol})</option>`,
          )
          .join("");

        const products = DataStore.get("products");

        let prefillInvNumber = "";
        if (!id && isSales) {
          prefillInvNumber = String(Date.now()).slice(-5);
        }

        const html = `
                    <div style="display:flex; gap:1rem;">
                        <div class="form-group" style="flex:1.5;">
                            <label class="form-label">Invoice Number</label>
                            <input type="text" id="inv-num" class="form-control" value="${item.inv_number || prefillInvNumber}" ${isSales ? "readonly" : "required"}>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label class="form-label">Date</label>
                            <input type="date" id="inv-date" class="form-control" value="${item.date}" required>
                        </div>
                        <div class="form-group" style="flex:2;">
                            <label class="form-label">${relTitle}</label>
                            <select id="inv-rel" class="form-control" required>
                                <option value="">Select ${relTitle}...</option>
                                ${relOpts}
                            </select>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label class="form-label">Currency</label>
                            <select id="inv-currency" class="form-control" required>
                                ${curlOpts}
                            </select>
                        </div>
                    </div>
                    
                    <h4 style="margin-top:1rem;">Line Items</h4>
                    <div id="inv-line-items" style="border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--border-radius); background: var(--bg-color); margin-bottom: 1rem;">
                        <!-- dynamic items -->
                    </div>
                    <button class="btn btn-outline" id="inv-add-line" style="margin-bottom: 1rem; width: 100%;">➕ Add Product Line</button>
                    
                    <div class="form-group" style="display:flex; justify-content: flex-end; font-size: 1.25rem;">
                        <strong>Invoice Total: <span id="inv-total-display">0.00</span></strong>
                        <input type="hidden" id="inv-total" value="0">
                    </div>

                    <hr>
                    <h4 style="margin-top:1rem;">Payment Information</h4>
                    <div style="display:flex; gap:1rem;">
                        <div class="form-group" style="flex:1;">
                            <label class="form-label">Payment Amount Now</label>
                            <input type="number" id="inv-pay-amount" class="form-control" value="${item.payment_amount || 0}" step="0.01">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label class="form-label">Payment Source/Bank</label>
                            <select id="inv-pay-source" class="form-control">
                                <option value="">Select Account...</option>
                            </select>
                        </div>
                    </div>
                `;

        let currentLines = item.items || [];
        if (!Array.isArray(currentLines)) currentLines = [];

        Dashboard.showModal(id ? `Edit ${title}` : `New ${title}`, html, () => {
          const rel_id = document.getElementById("inv-rel").value;
          const date = document.getElementById("inv-date").value;
          const inv_num = document.getElementById("inv-num").value;
          const currency_id = Number(
            document.getElementById("inv-currency").value,
          );
          const total = Number(document.getElementById("inv-total").value);
          const pay_amount = Number(
            document.getElementById("inv-pay-amount").value,
          );
          const pay_source = document.getElementById("inv-pay-source").value;

          if (!rel_id || !date || !inv_num) {
            Dashboard.showToast("Please fill required fields", "error");
            return false;
          }

          if (id) Modules[type].revertInvoiceEffects(item);

          const items = [];
          document.querySelectorAll(".invoice-line-row").forEach((row) => {
            const pName = row.querySelector(".line-prod-name").value.trim();
            if (pName) {
              items.push({
                product_name: pName,
                qty: Number(row.querySelector(".line-qty").value),
                price: Number(row.querySelector(".line-price").value),
                um: row.querySelector(".line-um").value,
                total: Number(row.querySelector(".line-total").value),
              });
            }
          });

          const payload = {
            rel_id,
            date,
            inv_number: inv_num,
            total,
            items,
            currency_id,
            payment_amount: pay_amount,
            payment_source: pay_source,
          };

          let savedItem;
          if (id) {
            savedItem = payload;
            savedItem.id = id;
            DataStore.update(type, id, payload);
            Dashboard.showToast("Invoice updated");
          } else {
            savedItem = DataStore.add(type, payload);
            Dashboard.showToast("Invoice added");
          }

          Modules[type].applyInvoiceEffects(savedItem);

          Modules[type].loadTable();
          if (Modules.overview) Modules.overview.render();
          return true;
        });

        const invCurrSel = document.getElementById("inv-currency");
        const invPaySrc = document.getElementById("inv-pay-source");
        const bAccs = DataStore.get("bank_accounts");
        const cAccs = DataStore.get("cash_accounts");

        const filterSources = () => {
          const cid = Number(invCurrSel.value);
          const bOpts = bAccs
            .filter((b) => (b.currency_id || 1) == cid)
            .map(
              (b) =>
                `<option value="Bank-${b.name}" ${item.payment_source === "Bank-" + b.name ? "selected" : ""}>Bank: ${b.name}</option>`,
            )
            .join("");
          const cOpts = cAccs
            .filter((c) => (c.currency_id || 1) == cid)
            .map(
              (c) =>
                `<option value="Cash-${c.name}" ${item.payment_source === "Cash-" + c.name ? "selected" : ""}>Cash: ${c.name}</option>`,
            )
            .join("");
          invPaySrc.innerHTML =
            '<option value="">Select Account...</option>' + bOpts + cOpts;
        };
        invCurrSel.addEventListener("change", filterSources);
        filterSources();

        const units = DataStore.get("units");
        const baseProds = DataStore.get("base_products") || [];
        const dList = isSales ? products : baseProds;
        const dlHtml = `<datalist id="dl-prods-${type}">${dList.map((p) => `<option value="${p.name}">`).join("")}</datalist>`;

        const renderLines = () => {
          const container = document.getElementById("inv-line-items");
          container.innerHTML = dlHtml;

          currentLines.forEach((line, index) => {
            let selectedProd = products.find(
              (p) => p.id == line.product_id || p.name == line.product_name,
            ) || { um: "", currency_id: "" };
            let activeName = line.product_name || selectedProd.name || "";
            let activeUm = line.um || selectedProd.um || "";

            const row = document.createElement("div");
            row.className = "invoice-line-row";
            row.style.display = "flex";
            row.style.gap = "0.5rem";
            row.style.marginBottom = "0.5rem";
            row.style.alignItems = "center";

            row.innerHTML = `
                            <div style="flex:2">
                                <input type="text" class="form-control line-prod-name" value="${activeName}" list="dl-prods-${type}" placeholder="Product Name..." required>
                            </div>
                            <div style="flex:1"><input type="number" class="form-control line-qty" value="${line.qty || 1}" min="1" step="any" placeholder="Qty"></div>
                            <div style="flex:1"><input type="number" class="form-control line-price" value="${line.price || 0}" step="0.01" placeholder="Price"></div>
                            <div style="flex:1">
                                <select class="form-control line-um" required>
                                    <option value="">UM...</option>
                                    ${units.map((u) => `<option value="${u.name}" ${u.name === activeUm ? "selected" : ""}>${u.name}</option>`).join("")}
                                </select>
                            </div>
                            <div style="flex:1"><input type="number" class="form-control line-total" value="${line.qty * line.price || 0}" readonly placeholder="Total"></div>
                            <button type="button" class="btn btn-outline line-del" style="padding:0.25rem 0.5rem; color:var(--danger); border-color:var(--danger)">✕</button>
                        `;
            container.appendChild(row);

            const prodInput = row.querySelector(".line-prod-name");
            const priceInput = row.querySelector(".line-price");
            const qtyInput = row.querySelector(".line-qty");
            const umInput = row.querySelector(".line-um");
            const totalInput = row.querySelector(".line-total");

            prodInput.addEventListener("change", () => {
              const p = products.find(
                (x) =>
                  x.name.toLowerCase() === prodInput.value.trim().toLowerCase(),
              );
              if (p) {
                priceInput.value = p.price;
                umInput.value = p.um;
                calcRow();
              }
            });

            const calcRow = () => {
              const sum =
                (Number(qtyInput.value) || 0) * (Number(priceInput.value) || 0);
              totalInput.value = sum.toFixed(2);
              recalcSum();
            };

            qtyInput.addEventListener("input", calcRow);
            priceInput.addEventListener("input", calcRow);
            row.querySelector(".line-del").addEventListener("click", () => {
              row.remove();
              recalcSum();
            });
          });
          recalcSum();
        };

        const recalcSum = () => {
          let s = 0;
          document
            .querySelectorAll(".line-total")
            .forEach((inp) => (s += Number(inp.value)));
          document.getElementById("inv-total-display").textContent =
            s.toLocaleString(undefined, { minimumFractionDigits: 2 });
          document.getElementById("inv-total").value = s;
        };

        const addBtn = document.getElementById("inv-add-line");
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);

        newAddBtn.addEventListener("click", () => {
          currentLines.push({
            product_name: "",
            qty: 1,
            price: 0,
            total: 0,
            um: "",
          });
          renderLines();
        });

        if (currentLines.length === 0) {
          currentLines.push({
            product_name: "",
            qty: 1,
            price: 0,
            total: 0,
            um: "",
          });
        }

        setTimeout(renderLines, 10);
      },
      revertInvoiceEffects: (item) => {
        const prods = DataStore.get("products");
        (item.items || []).forEach((line) => {
          const pIndex = prods.findIndex(
            (p) => p.id == line.product_id || p.name === line.product_name,
          );
          if (pIndex !== -1) {
            if (isSales) prods[pIndex].qty += Number(line.qty);
            else prods[pIndex].qty -= Number(line.qty);
          }
        });
        DataStore.set("products", prods);

        if (item.payment_amount > 0 && item.payment_source) {
          const typePay = item.payment_source.startsWith("Bank-")
            ? "bank_payments"
            : "cash_payments";
          const pays = DataStore.get(typePay);
          const noteStr = `Payment for ${isSales ? "Sales" : "Purchase"} Invoice #${item.inv_number}`;
          const matchIndex = pays.findIndex(
            (p) => p.note === noteStr && p.amount === item.payment_amount,
          );
          if (matchIndex > -1) {
            pays.splice(matchIndex, 1);
            DataStore.set(typePay, pays);
          }
        }
      },
      applyInvoiceEffects: (item) => {
        const prods = DataStore.get("products");
        (item.items || []).forEach((line) => {
          const pIndex = prods.findIndex(
            (p) => p.id == line.product_id || p.name === line.product_name,
          );
          if (pIndex !== -1) {
            if (isSales) {
              prods[pIndex].qty -= Number(line.qty);
            } else {
              prods[pIndex].qty += Number(line.qty);
              prods[pIndex].price = line.price;
            }
          } else if (!isSales) {
            const baseName = line.product_name.trim();
            const pCode = "PRD-" + Math.floor(Math.random() * 10000);
            const newProd = {
              id: Date.now() + Math.random(),
              code: pCode,
              name: baseName,
              supplier_id: Number(item.rel_id),
              qty: Number(line.qty),
              price: Number(line.price),
              um: line.um,
              currency_id: 1,
            };
            prods.push(newProd);
          }
        });
        DataStore.set("products", prods);

        if (item.payment_amount > 0 && item.payment_source) {
          const typePay = item.payment_source.startsWith("Bank-")
            ? "bank_payments"
            : "cash_payments";
          const sName = item.payment_source.split("-")[1];

          const pLoad = {
            source_name: sName,
            amount: Number(item.payment_amount),
            currency_id: item.currency_id,
            is_in: isSales,
            payment_type: relTitle,
            entity_id: Number(item.rel_id),
            note: `Payment for ${isSales ? "Sales" : "Purchase"} Invoice #${item.inv_number}`,
            date: new Date().toISOString(),
          };
          DataStore.add(typePay, pLoad);
        }

        if (
          Modules.products &&
          document
            .getElementById("module-products")
            .classList.contains("active")
        ) {
          Modules.products.loadTable();
        }
      },
      delete: (id) => {
        if (
          confirm(
            "Delete this invoice? This will also revert inventory and associated auto-payments.",
          )
        ) {
          const item = DataStore.get(type).find((i) => i.id === id);
          if (item) {
            Modules[type].revertInvoiceEffects(item);
            DataStore.remove(type, id);
            Dashboard.showToast("Invoice deleted");
            Modules[type].loadTable();
            if (Modules.overview) Modules.overview.render();
          }
        }
      },
    };
  },

  buildPaymentModule(type) {
    const isBank = type === "bank";
    const title = isBank ? "Bank Payment" : "Cash Payment";
    const storeKey = isBank ? "bank_payments" : "cash_payments";
    const sourceTitle = isBank ? "Bank Account" : "Cash Safe";

    return {
      render: () => {
        const container = document.getElementById(`module-${type}`);
        const curls = DataStore.get("currencies");
        const currOpts = curls
          .map(
            (c) => `<option value="${c.id}">${c.name} (${c.symbol})</option>`,
          )
          .join("");
        container.innerHTML = `
                    <div class="card">
                        <div class="card-header" style="display:flex; gap:1rem; align-items:center;">
                            <input type="text" id="search-${type}" class="search-bar form-control" style="flex:1" placeholder="Search payments...">
                            <select id="filter-currency-${type}" class="form-control" style="width:200px;">
                                <option value="all">All Currencies</option>
                                ${currOpts}
                            </select>
                            <button class="btn btn-primary" onclick="Modules.${type}.showForm()">➕ Add Payment</button>
                        </div>
                        <div id="${type}-totals-container" style="padding: 1rem 1.5rem; background: var(--bg-color); border-bottom: 1px solid var(--border-color); display:flex; flex-direction:column; gap: 0.5rem;">
                             <!-- Dynamically populated per currency -->
                        </div>
                        <div class="table-responsive">
                            <table id="table-${type}">
                                <thead>
                                    <tr><th>Source</th><th>Amount</th><th>Currency</th><th>Type</th><th>Note</th><th>Actions</th></tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                `;
        this[type].loadTable();
        const searchInput = document.getElementById(`search-${type}`);
        searchInput.addEventListener("input", (e) =>
          this[type].loadTable(e.target.value),
        );
        document
          .getElementById(`filter-currency-${type}`)
          .addEventListener("change", () => {
            this[type].loadTable(searchInput.value);
          });
      },
      loadTable: (query = "") => {
        const tbody = document.querySelector(`#table-${type} tbody`);
        let data = DataStore.get(storeKey);
        const curls = DataStore.get("currencies");
        const currFilter =
          document.getElementById(`filter-currency-${type}`)?.value || "all";

        if (query) {
          data = data.filter((p) =>
            [p.source_name, p.payment_type, p.note]
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase()),
          );
        }

        if (currFilter !== "all") {
          data = data.filter((p) => p.currency_id == currFilter);
        }

        tbody.innerHTML = "";

        const totalsMap = {};

        data.forEach((p) => {
          const cid = p.currency_id || 1;
          if (!totalsMap[cid])
            totalsMap[cid] = {
              in: 0,
              out: 0,
              curr: curls.find((c) => c.id == cid) || {
                symbol: "$",
                name: "USD",
              },
            };

          if (p.is_in) totalsMap[cid].in += Number(p.amount);
          else totalsMap[cid].out += Number(p.amount);

          const curr = totalsMap[cid].curr;
          let entityText = "";
          if (
            p.entity_id &&
            (p.payment_type === "Customer" || p.payment_type === "Supplier")
          ) {
            const entities = DataStore.get(p.payment_type.toLowerCase() + "s");
            const ent = entities.find((e) => e.id == Number(p.entity_id));
            if (ent) entityText = ` <strong>(${ent.name})</strong>`;
          }
          tbody.innerHTML += `
                        <tr>
                            <td>${p.source_name}</td>
                            <td><span class="badge ${p.is_in ? "badge-success" : "badge-danger"}">${curr.symbol} ${p.amount}</span></td>
                            <td>${curr.name || "-"}</td>
                            <td>${p.payment_type}${entityText}</td>
                            <td>${p.note || "-"}</td>
                            <td>
                                <button class="action-btn edit" onclick="Modules.${type}.showForm(${p.id})">✎</button>
                                <button class="action-btn delete" onclick="Modules.${type}.delete(${p.id})">🗑</button>
                            </td>
                        </tr>
                    `;
        });

        const totalsContainer = document.getElementById(
          `${type}-totals-container`,
        );
        if (!totalsContainer) return;
        totalsContainer.innerHTML = "";

        if (Object.keys(totalsMap).length === 0) {
          totalsContainer.innerHTML =
            '<div style="color:var(--text-subtle);">No transactions found / recorded.</div>';
        }

        Object.values(totalsMap).forEach((v) => {
          const bal = v.in - v.out;
          totalsContainer.innerHTML += `
                        <div style="display:flex; gap: 2rem; align-items:center;">
                            <div style="width:100px; font-weight:bold;">${v.curr.name} (${v.curr.symbol}):</div>
                            <div style="color:var(--success); font-weight:bold; width:150px;">Total In: ${v.curr.symbol}${v.in.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div style="color:var(--danger); font-weight:bold; width:150px;">Total Out: ${v.curr.symbol}${v.out.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div style="font-weight:bold; font-size:1.1rem; color:${bal >= 0 ? "var(--success)" : "var(--danger)"}">Balance: ${v.curr.symbol}${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                    `;
        });
      },
      showForm: (id = null) => {
        const item = id
          ? DataStore.get(storeKey).find((p) => p.id === id)
          : {
              source_name: "",
              amount: "",
              currency_id: 1,
              is_in: "out",
              payment_type: "",
              entity_id: "",
              note: "",
            };
        const curls = DataStore.get("currencies");
        let pTypes = DataStore.get("expense_types").map((t) => t.name);
        pTypes = ["Customer", "Supplier", ...pTypes];
        const sources = isBank
          ? DataStore.get("bank_accounts")
          : DataStore.get("cash_accounts");

        const sourceOpts = sources
          .map(
            (s) =>
              `<option value="${s.name}" ${s.name === item.source_name ? "selected" : ""}>${s.name}</option>`,
          )
          .join("");
        const curlOpts = curls
          .map(
            (c) =>
              `<option value="${c.id}" ${c.id == item.currency_id ? "selected" : ""}>${c.name}</option>`,
          )
          .join("");
        const pTypeUnique = [...new Set(pTypes)];
        const typeOpts = pTypeUnique
          .map(
            (t) =>
              `<option value="${t}" ${t === item.payment_type ? "selected" : ""}>${t}</option>`,
          )
          .join("");

        const allSales = DataStore.get("sales");
        const allPurchases = DataStore.get("purchases");
        const customers = DataStore.get("customers");
        const suppliers = DataStore.get("suppliers");

        const invOptsList = [];
        allSales.forEach((i) => {
          if (!i.inv_number) return;
          const c = customers.find((x) => x.id == i.rel_id) || {
            name: "Unknown",
          };
          invOptsList.push(
            `<option value="INV-${i.inv_number} - ${c.name} (Sales)">`,
          );
        });
        allPurchases.forEach((i) => {
          if (!i.inv_number) return;
          const s = suppliers.find((x) => x.id == i.rel_id) || {
            name: "Unknown",
          };
          invOptsList.push(
            `<option value="INV-${i.inv_number} - ${s.name} (Purchase)">`,
          );
        });
        const invOpts = invOptsList.join("");

        const html = `
                    <div class="form-group">
                        <label class="form-label">${sourceTitle}</label>
                        <select id="pay-source" class="form-control">${sourceOpts}</select>
                    </div>
                    <div style="display:flex; gap:1rem;">
                        <div class="form-group" style="flex:1;">
                            <label class="form-label">Amount</label>
                            <input type="number" id="pay-amount" class="form-control" value="${item.amount}" step="0.01" required>
                        </div>
                        <div class="form-group" style="width:100px;">
                            <label class="form-label">Currency</label>
                            <select id="pay-curr" class="form-control">${curlOpts}</select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Direction</label>
                        <select id="pay-dir" class="form-control">
                            <option value="in" ${item.is_in === true || item.is_in === "in" ? "selected" : ""}>In (Receive +)</option>
                            <option value="out" ${item.is_in === false || item.is_in === "out" ? "selected" : ""}>Out (Spend -)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Payment Category</label>
                        <select id="pay-type" class="form-control">${typeOpts}</select>
                    </div>
                    <div class="form-group" id="pay-entity-group" style="display:none;">
                        <label class="form-label" id="pay-entity-label">Related To</label>
                        <select id="pay-entity" class="form-control"></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Note</label>
                        <input type="text" id="pay-note" class="form-control" value="${item.note || ""}" list="note-invoices-list">
                        <datalist id="note-invoices-list">${invOpts}</datalist>
                    </div>
                `;
        Dashboard.showModal(`New ${title}`, html, () => {
          const amount = document.getElementById("pay-amount").value;
          if (!amount) {
            Dashboard.showToast("Amount required", "error");
            return false;
          }

          const pType = document.getElementById("pay-type").value;
          let entity_id = null;
          if (pType === "Customer" || pType === "Supplier") {
            entity_id = document.getElementById("pay-entity").value;
            if (!entity_id) {
              Dashboard.showToast("Please select related contact", "error");
              return false;
            }
          }

          const payload = {
            source_name: document.getElementById("pay-source").value,
            amount: Number(amount),
            currency_id: document.getElementById("pay-curr").value,
            is_in: document.getElementById("pay-dir").value === "in",
            payment_type: pType,
            entity_id: entity_id ? Number(entity_id) : null,
            note: document.getElementById("pay-note").value,
            date: new Date().toISOString(),
          };

          if (id) {
            DataStore.update(storeKey, id, payload);
            Dashboard.showToast("Payment updated");
          } else {
            DataStore.add(storeKey, payload);
            Dashboard.showToast("Payment added");
          }
          this[type].loadTable();
          return true;
        });

        const typeSelect = document.getElementById("pay-type");
        typeSelect.addEventListener("change", () => {
          const val = typeSelect.value;
          const entGroup = document.getElementById("pay-entity-group");
          if (val === "Customer" || val === "Supplier") {
            entGroup.style.display = "block";
            document.getElementById("pay-entity-label").textContent = val;
            const dataKey = val === "Customer" ? "customers" : "suppliers";
            const options = DataStore.get(dataKey)
              .map((e) => `<option value="${e.id}">${e.name}</option>`)
              .join("");
            document.getElementById("pay-entity").innerHTML =
              `<option value="">Select...</option>` + options;
          } else {
            entGroup.style.display = "none";
          }
        });
        typeSelect.dispatchEvent(new Event("change"));
      },
      delete: (id) => {
        if (confirm("Delete this payment?")) {
          DataStore.remove(storeKey, id);
          Dashboard.showToast("Payment deleted");
          this[type].loadTable();
        }
      },
    };
  },

  admin: {
    render() {
      const container = document.getElementById("module-admin");
      const profile = DataStore.get("company_profile");
      container.innerHTML = `
                <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
                    <div class="card">
                        <h3>Company Profile</h3>
                        <div style="margin-top: 1rem;">
                            <div class="form-group">
                                <label class="form-label">Company Name</label>
                                <input type="text" id="prof-name" class="form-control" value="${profile.name || ""}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" id="prof-email" class="form-control" value="${profile.email || ""}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Phone</label>
                                <input type="text" id="prof-phone" class="form-control" value="${profile.phone || ""}">
                            </div>
                            <button class="btn btn-primary" onclick="Modules.admin.saveProfile()">Save Profile</button>
                        </div>
                    </div>
                    
                    <div class="card" style="display:flex; flex-direction:column;">
                        <div class="card-header" style="margin-bottom:0;">
                            <h3>Users</h3>
                            <button class="btn btn-outline" style="padding:0.25rem 0.6rem;" onclick="Modules.admin.addDynamic('users')">➕</button>
                        </div>
                        <ul style="margin-top:1rem; border-top:1px solid var(--border-color); padding-top:1rem; list-style:none; flex:1; max-height: 250px; overflow-y:auto;" id="admin-users-list"></ul>
                    </div>
                    
                    <div class="card" style="display:flex; flex-direction:column;">
                        <div class="card-header" style="margin-bottom:0;">
                            <h3>Bank Accounts</h3>
                            <button class="btn btn-outline" style="padding:0.25rem 0.6rem;" onclick="Modules.admin.addDynamic('bank_accounts')">➕</button>
                        </div>
                        <ul style="margin-top:1rem; border-top:1px solid var(--border-color); padding-top:1rem; list-style:none; flex:1; max-height: 250px; overflow-y:auto;" id="admin-bank_accounts-list"></ul>
                    </div>

                    <div class="card" style="display:flex; flex-direction:column;">
                        <div class="card-header" style="margin-bottom:0;">
                            <h3>Cash Accounts</h3>
                            <button class="btn btn-outline" style="padding:0.25rem 0.6rem;" onclick="Modules.admin.addDynamic('cash_accounts')">➕</button>
                        </div>
                        <ul style="margin-top:1rem; border-top:1px solid var(--border-color); padding-top:1rem; list-style:none; flex:1; max-height: 250px; overflow-y:auto;" id="admin-cash_accounts-list"></ul>
                    </div>

                    <div class="card" style="display:flex; flex-direction:column;">
                        <div class="card-header" style="margin-bottom:0;">
                            <h3>Currencies</h3>
                            <button class="btn btn-outline" style="padding:0.25rem 0.6rem;" onclick="Modules.admin.addDynamic('currencies')">➕</button>
                        </div>
                        <ul style="margin-top:1rem; border-top:1px solid var(--border-color); padding-top:1rem; list-style:none; flex:1; max-height: 250px; overflow-y:auto;" id="admin-currencies-list"></ul>
                    </div>

                    <div class="card" style="display:flex; flex-direction:column;">
                        <div class="card-header" style="margin-bottom:0;">
                            <h3>Expense Types</h3>
                            <button class="btn btn-outline" style="padding:0.25rem 0.6rem;" onclick="Modules.admin.addDynamic('expense_types')">➕</button>
                        </div>
                        <ul style="margin-top:1rem; border-top:1px solid var(--border-color); padding-top:1rem; list-style:none; flex:1; max-height: 250px; overflow-y:auto;" id="admin-expense_types-list"></ul>
                    </div>

                    <div class="card" style="display:flex; flex-direction:column;">
                        <div class="card-header" style="margin-bottom:0;">
                            <h3>Units of Measurement</h3>
                            <button class="btn btn-outline" style="padding:0.25rem 0.6rem;" onclick="Modules.admin.addDynamic('units')">➕</button>
                        </div>
                        <ul style="margin-top:1rem; border-top:1px solid var(--border-color); padding-top:1rem; list-style:none; flex:1; max-height: 250px; overflow-y:auto;" id="admin-units-list"></ul>
                    </div>

                    <div class="card" style="display:flex; flex-direction:column;">
                        <div class="card-header" style="margin-bottom:0;">
                            <h3>Base Product Names</h3>
                            <button class="btn btn-outline" style="padding:0.25rem 0.6rem;" onclick="Modules.admin.addDynamic('base_products')">➕</button>
                        </div>
                        <ul style="margin-top:1rem; border-top:1px solid var(--border-color); padding-top:1rem; list-style:none; flex:1; max-height: 250px; overflow-y:auto;" id="admin-base_products-list"></ul>
                    </div>
                </div>
            `;
      this.loadDynamicList("users");
      this.loadDynamicList("bank_accounts");
      this.loadDynamicList("cash_accounts");
      this.loadDynamicList("currencies");
      this.loadDynamicList("expense_types");
      this.loadDynamicList("units");
      this.loadDynamicList("base_products");
    },
    saveProfile() {
      const payload = {
        name: document.getElementById("prof-name").value,
        email: document.getElementById("prof-email").value,
        phone: document.getElementById("prof-phone").value,
      };
      DataStore.set("company_profile", payload);
      Dashboard.showToast("Company profile saved");

      const titleDisplay = document.querySelector(".sidebar-header .menu-text");
      if (titleDisplay) titleDisplay.textContent = payload.name;
    },
    loadDynamicList(key) {
      const list = document.getElementById(`admin-${key}-list`);
      list.innerHTML = "";
      const data = DataStore.get(key);
      data.forEach((item) => {
        let display = item.name;
        if (key === "users")
          display = `<strong style="display:block;">${item.name}</strong> <span class="badge ${item.role === "admin" ? "badge-primary" : "badge-warning"}">${item.role}</span>`;
        else if (key === "currencies")
          display = `<strong>${item.name}</strong> (${item.symbol})`;
        else if (key === "base_products")
          display = `<strong>${item.name}</strong> <small style="display:block; color:var(--text-subtle)">${item.note || ""}</small>`;

        list.innerHTML += `
                    <li style="display:flex; justify-content:space-between; margin-bottom:1rem; align-items:center; background: var(--bg-color); padding: 0.75rem; border-radius: var(--border-radius);">
                        <div>${display}</div>
                        <div>
                            <button class="action-btn edit" onclick="Modules.admin.addDynamic('${key}', ${item.id})">✎</button>
                            <button class="action-btn delete" onclick="Modules.admin.deleteDynamic('${key}', ${item.id})">🗑</button>
                        </div>
                    </li>
                `;
      });
    },
    addDynamic(key, id = null) {
      let html = "";
      let title = key.replace("_", " ");
      title = title.charAt(0).toUpperCase() + title.slice(1);

      const item = id
        ? DataStore.get(key).find((i) => i.id === id)
        : { name: "", role: "user", symbol: "", note: "", currency_id: 1 };
      const curls = DataStore.get("currencies");
      const curlOpts = curls
        .map(
          (c) =>
            `<option value="${c.id}" ${c.id == item.currency_id ? "selected" : ""}>${c.name}</option>`,
        )
        .join("");

      if (key === "users") {
        html = `
                    <div class="form-group"><label class="form-label">Name</label><input type="text" id="dyn-name" value="${item.name}" class="form-control" required></div>
                    <div class="form-group"><label class="form-label">Role</label><select id="dyn-role" class="form-control"><option value="user" ${item.role === "user" ? "selected" : ""}>User</option><option value="admin" ${item.role === "admin" ? "selected" : ""}>Administrator</option></select></div>
                `;
      } else if (key === "currencies") {
        html = `
                    <div class="form-group"><label class="form-label">Currency Code (e.g., USD)</label><input type="text" id="dyn-name" value="${item.name}" class="form-control" required></div>
                    <div class="form-group"><label class="form-label">Symbol (e.g., $)</label><input type="text" id="dyn-symbol" value="${item.symbol}" class="form-control" required></div>
                `;
      } else if (key === "base_products") {
        html = `
                    <div class="form-group"><label class="form-label">Name</label><input type="text" id="dyn-name" value="${item.name}" class="form-control" required></div>
                    <div class="form-group"><label class="form-label">Note / Explanation</label><input type="text" id="dyn-note" value="${item.note}" class="form-control"></div>
                `;
      } else if (key === "bank_accounts" || key === "cash_accounts") {
        html = `
                    <div class="form-group"><label class="form-label">Name</label><input type="text" id="dyn-name" value="${item.name}" class="form-control" required></div>
                    <div class="form-group"><label class="form-label">Assigned Currency</label><select id="dyn-curr" class="form-control">${curlOpts}</select></div>
                `;
      } else {
        html = `<div class="form-group"><label class="form-label">Name</label><input type="text" id="dyn-name" value="${item.name}" class="form-control" required></div>`;
      }

      Dashboard.showModal(id ? `Edit ${title}` : `Add ${title}`, html, () => {
        const nameNode = document.getElementById("dyn-name");
        const name = nameNode ? nameNode.value : "";
        if (!name) {
          Dashboard.showToast("Name Required", "error");
          return false;
        }

        let payload = { name };
        if (key === "users")
          payload.role = document.getElementById("dyn-role").value;
        if (key === "currencies")
          payload.symbol = document.getElementById("dyn-symbol").value;
        if (key === "base_products")
          payload.note = document.getElementById("dyn-note").value;
        if (key === "bank_accounts" || key === "cash_accounts")
          payload.currency_id = Number(
            document.getElementById("dyn-curr").value,
          );

        if (id) {
          DataStore.update(key, id, payload);
        } else {
          DataStore.add(key, payload);
        }

        Dashboard.showToast("Saved successfully");
        this.loadDynamicList(key);
        return true;
      });
    },
    deleteDynamic(key, id) {
      if (confirm("Delete this item?")) {
        DataStore.remove(key, id);
        Dashboard.showToast("Deleted", "error");
        this.loadDynamicList(key);
      }
    },
  },

  products: {
    render() {
      const container = document.getElementById("module-products");
      container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <input type="text" id="search-products" class="search-bar form-control" placeholder="Search products...">
                        <button class="btn btn-primary" onclick="Modules.products.showForm()">➕ Add Product</button>
                    </div>
                    <div class="table-responsive">
                        <table id="table-products">
                            <thead>
                                <tr><th>Code</th><th>Name</th><th>Supplier</th><th>Qty</th><th>Price</th><th>UM</th><th>Total</th><th>Currency</th><th>Actions</th></tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            `;
      this.loadTable();
      document
        .getElementById("search-products")
        .addEventListener("input", (e) => this.loadTable(e.target.value));
    },
    loadTable(query = "") {
      const tbody = document.querySelector("#table-products tbody");
      let data = DataStore.get("products");
      const suppliers = DataStore.get("suppliers");
      const currencies = DataStore.get("currencies");

      if (query) {
        data = data.filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.code.toLowerCase().includes(query.toLowerCase()),
        );
      }
      tbody.innerHTML = "";
      data.forEach((p) => {
        const sup = suppliers.find((s) => s.id == p.supplier_id) || {
          name: "-",
        };
        const curr = currencies.find((c) => c.id == p.currency_id) || {
          symbol: "",
          name: "-",
        };
        tbody.innerHTML += `
                    <tr>
                        <td><span class="badge badge-primary">${p.code}</span></td>
                        <td>${p.name}</td>
                        <td>${sup.name}</td>
                        <td>${p.qty}</td>
                        <td>${curr.symbol}${Number(p.price).toLocaleString()}</td>
                        <td>${p.um}</td>
                        <td><strong>${curr.symbol}${(Number(p.qty) * Number(p.price)).toLocaleString()}</strong></td>
                        <td>${curr.name}</td>
                        <td>
                            <button class="action-btn edit" onclick="Modules.products.showForm(${p.id})">✎</button>
                            <button class="action-btn delete" onclick="Modules.products.delete(${p.id})">🗑</button>
                        </td>
                    </tr>
                `;
      });
    },
    showForm(id = null) {
      const item = id
        ? DataStore.get("products").find((p) => p.id === id)
        : {
            code: "",
            name: "",
            supplier_id: "",
            qty: 1,
            price: 0,
            um: "pcs",
            currency_id: "",
          };
      const suppliers = DataStore.get("suppliers");
      const currencies = DataStore.get("currencies");

      const supOpts = suppliers
        .map(
          (s) =>
            `<option value="${s.id}" ${s.id == item.supplier_id ? "selected" : ""}>${s.name}</option>`,
        )
        .join("");
      const currOpts = currencies
        .map(
          (c) =>
            `<option value="${c.id}" ${c.id == item.currency_id ? "selected" : ""}>${c.name} (${c.symbol})</option>`,
        )
        .join("");

      const units = DataStore.get("units");
      const unitOpts = units
        .map(
          (u) =>
            `<option value="${u.name}" ${u.name == item.um ? "selected" : ""}>${u.name}</option>`,
        )
        .join("");

      const html = `
                <div style="display:flex; gap:1rem;">
                    <div class="form-group" style="flex:1;">
                        <label class="form-label">Product Code</label>
                        <input type="text" id="prod-code" class="form-control" value="${item.code}" required>
                    </div>
                     <div class="form-group" style="flex:2;">
                        <label class="form-label">Name</label>
                        <input type="text" id="prod-name" class="form-control" value="${item.name}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Supplier</label>
                    <select id="prod-supplier" class="form-control" required>
                        <option value="">Select Supplier...</option>
                        ${supOpts}
                    </select>
                </div>
                <div style="display:flex; gap:1rem;">
                    <div class="form-group" style="flex:1;">
                        <label class="form-label">Quantity</label>
                        <input type="number" id="prod-qty" class="form-control" value="${item.qty}" step="any" required>
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label class="form-label">Unit of Measure (UM)</label>
                        <select id="prod-um" class="form-control" required>
                            <option value="">Select UM...</option>
                            ${unitOpts}
                        </select>
                    </div>
                </div>
                <div style="display:flex; gap:1rem;">
                    <div class="form-group" style="flex:1;">
                        <label class="form-label">Unit Price</label>
                        <input type="number" id="prod-price" class="form-control" value="${item.price}" step="0.01" required>
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label class="form-label">Currency</label>
                        <select id="prod-curr" class="form-control" required>
                            <option value="">Select Currency...</option>
                            ${currOpts}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Total</label>
                    <div id="prod-total-display" style="padding: 0.5rem; background: var(--bg-color); border-radius: var(--border-radius); font-weight: bold; font-size: 1.1rem;">0.00</div>
                </div>
            `;

      Dashboard.showModal(id ? "Edit Product" : "Add Product", html, () => {
        const code = document.getElementById("prod-code").value;
        const name = document.getElementById("prod-name").value;
        const supplier_id = document.getElementById("prod-supplier").value;
        const qty = document.getElementById("prod-qty").value;
        const price = document.getElementById("prod-price").value;
        const curr = document.getElementById("prod-curr").value;

        if (!code || !name || !supplier_id || !qty || !price || !curr) {
          Dashboard.showToast("Please fill all required fields", "error");
          return false;
        }

        const payload = {
          code,
          name,
          supplier_id: Number(supplier_id),
          qty: Number(qty),
          um: document.getElementById("prod-um").value,
          price: Number(price),
          currency_id: Number(curr),
        };

        if (id) {
          DataStore.update("products", id, payload);
          Dashboard.showToast("Product updated");
        } else {
          DataStore.add("products", payload);
          Dashboard.showToast("Product added");
        }
        this.loadTable();
        return true;
      });

      const calcTotal = () => {
        const q = Number(document.getElementById("prod-qty").value) || 0;
        const p = Number(document.getElementById("prod-price").value) || 0;
        document.getElementById("prod-total-display").textContent = (
          q * p
        ).toLocaleString(undefined, { minimumFractionDigits: 2 });
      };
      document.getElementById("prod-qty").addEventListener("input", calcTotal);
      document
        .getElementById("prod-price")
        .addEventListener("input", calcTotal);
      calcTotal();
    },
    delete(id) {
      if (confirm("Are you sure you want to delete this product?")) {
        DataStore.remove("products", id);
        Dashboard.showToast("Product deleted");
        this.loadTable();
      }
    },
  },
};

Modules.customers = Modules.buildContactModule("customers");
Modules.suppliers = Modules.buildContactModule("suppliers");
Modules.sales = Modules.buildInvoiceModule("sales");
Modules.purchases = Modules.buildInvoiceModule("purchases");
Modules.bank = Modules.buildPaymentModule("bank");
Modules.cash = Modules.buildPaymentModule("cash");

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (
      Modules.overview &&
      document.getElementById("module-overview").classList.contains("active")
    ) {
      Modules.overview.render();
    }

    const profile = DataStore.get("company_profile");
    if (profile.name) {
      const titleDisplay = document.querySelector(".sidebar-header .menu-text");
      if (titleDisplay) titleDisplay.textContent = profile.name;
    }
  }, 100);
});
