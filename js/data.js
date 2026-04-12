/* js/data.js */
const DataStore = {
  keys: [
    "customers",
    "suppliers",
    "products",
    "sales",
    "purchases",
    "bank_payments",
    "cash_payments",
    "users",
    "bank_accounts",
    "cash_accounts",
    "expense_types",
    "currencies",
    "units",
    "base_products",
    "company_profile",
  ],

  init() {
    this.keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(this.defaultData(key)));
      }
    });
  },

  defaultData(key) {
    switch (key) {
      case "company_profile":
        return {
          name: "My Company LLC",
          email: "admin@company.com",
          phone: "+1 234 567 890",
        };
      case "users":
        return [{ id: Date.now(), name: "Admin User", role: "admin" }];
      case "currencies":
        return [
          { id: 1, name: "USD", symbol: "$" },
          { id: 2, name: "EUR", symbol: "€" },
        ];
      case "units":
        return [
          { id: 1, name: "pcs" },
          { id: 2, name: "kg" },
          { id: 3, name: "boxes" },
        ];
      case "base_products":
        return [
          { id: 1, name: "Generic Gadget" },
          { id: 2, name: "Standard Widget" },
        ];
      case "bank_accounts":
        return [
          {
            id: 1,
            name: "Main Account - Chase",
            currency_id: 1,
            balance: 50000,
          },
        ];
      case "cash_accounts":
        return [
          { id: 1, name: "Main Safe", currency_id: 1 },
          { id: 2, name: "Petty Cash", currency_id: 1 },
        ];
      case "expense_types":
        return [
          { id: 1, name: "Rent" },
          { id: 2, name: "Salary" },
          { id: 3, name: "Utilities" },
        ];
      default:
        return [];
    }
  },

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {
      return Array.isArray(this.defaultData(key)) ? [] : this.defaultData(key);
    }
  },

  set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  add(key, item) {
    const data = this.get(key);
    item.id = Date.now() + Math.floor(Math.random() * 1000);
    data.push(item);
    this.set(key, data);
    return item;
  },

  update(key, id, updatedFields) {
    const data = this.get(key);
    if (Array.isArray(data)) {
      const index = data.findIndex((i) => i.id === Number(id));
      if (index !== -1) {
        data[index] = { ...data[index], ...updatedFields };
        this.set(key, data);
      }
    } else {
      this.set(key, { ...data, ...updatedFields });
    }
  },

  remove(key, id) {
    const data = this.get(key);
    if (Array.isArray(data)) {
      this.set(
        key,
        data.filter((i) => i.id !== Number(id)),
      );
    }
  },
};

DataStore.init();
