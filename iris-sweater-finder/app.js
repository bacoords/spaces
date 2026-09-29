(() => {
  "use strict";

  const STORE = "https://woo-demo-store-10-9.mystagingwebsite.com";
  const questions = [
    {
      title: "Where will your sweater go?",
      help: "Think of the day you’ll reach for it most.",
      options: [
        { value: "everyday", icon: "☀", label: "Everyday, everywhere", detail: "Coffee runs to easy afternoons" },
        { value: "outside", icon: "✳", label: "Out into the elements", detail: "A little extra warmth, please" },
        { value: "dressed", icon: "✦", label: "Somewhere a little special", detail: "Softness with a polished feel" }
      ]
    },
    {
      title: "How cozy is your cozy?",
      help: "There’s no wrong answer. We love a layer.",
      options: [
        { value: "light", icon: "◡", label: "Light & easy", detail: "Just enough to throw on" },
        { value: "balanced", icon: "✶", label: "The happy middle", detail: "A year-round favorite" },
        { value: "cozy", icon: "❋", label: "Wrap me up", detail: "Bring on the chunky knits" }
      ]
    },
    {
      title: "Pick your favorite shape.",
      help: "The silhouette you know you’ll wear on repeat.",
      options: [
        { value: "crewneck", icon: "○", label: "Classic crewneck", detail: "Simple for a reason" },
        { value: "turtleneck", icon: "⌒", label: "Cozy turtleneck", detail: "A little more coverage" },
        { value: "cardigan", icon: "↟", label: "Layerable cardigan", detail: "Wear it your way" }
      ]
    }
  ];

  const styleNotes = {
    820: { occasion: "outside", warmth: "cozy", shape: "cardigan", tag: "THE LAYER LOVER", copy: "A substantial wool layer with an easy open front. Made for crisp days, late walks, and everything in between." },
    819: { occasion: "dressed", warmth: "balanced", shape: "turtleneck", tag: "THE SOFT STATEMENT", copy: "A refined merino turtleneck that makes getting dressed feel effortless, with just the right amount of warmth." },
    818: { occasion: "everyday", warmth: "cozy", shape: "crewneck", tag: "THE COZY CLASSIC", copy: "The familiar crewneck, turned up a notch in heavyweight wool. A feel-good layer for your everyday plans." },
    817: { occasion: "everyday", warmth: "light", shape: "crewneck", tag: "THE EASY FAVORITE", copy: "Soft ribbing, an easy shape, and a little texture. This is the one that goes with whatever the day brings." },
    44: { occasion: "outside", warmth: "cozy", shape: "turtleneck", tag: "THE WINTER PERSON", copy: "A warm wool turtleneck for when the forecast calls for one more layer and a little more color." },
    43: { occasion: "dressed", warmth: "balanced", shape: "crewneck", tag: "THE EVERYDAY POLISH", copy: "Merino softness meets a timeless crewneck. An easy way to bring a little polish to your rotation." },
    41: { occasion: "dressed", warmth: "light", shape: "crewneck", tag: "THE SOFT SPOT", copy: "A cashmere crewneck you’ll want close. Relaxed enough for every day, special enough for any plan." }
  };

  const swatches = {
    "forest-green": "#345c42", "navy-blue": "#26345c", navy: "#26345c", orange: "#e66b37",
    "light-pink": "#e9a6b2", lavender: "#a69ada", gray: "#96999a", "light-gray": "#c3c5c4",
    yellow: "#edc643", "mustard-yellow": "#d8a92d"
  };

  const state = { products: [], step: 0, answers: [], selected: null, size: "", color: "", preview: null, mode: "quiz", cart: [] };
  const $ = selector => document.querySelector(selector);
  const panel = $("#quiz-panel");
  const resultSection = $("#result");
  const grid = $("#product-grid");
  const dialog = $("#cart-dialog");
  const toastEl = $("#toast");
  let toastTimer;
  let previewRequest = 0;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function trustedUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && ["i0.wp.com", "woo-demo-store-10-9.mystagingwebsite.com"].includes(url.hostname) ? url.href : "";
    } catch { return ""; }
  }

  function money(prices) {
    const unit = Number(prices?.currency_minor_unit ?? 2);
    const amount = Number(prices?.price ?? 0) / 10 ** unit;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: prices?.currency_code || "USD" }).format(amount);
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
  }

  async function loadCatalog() {
    panel.innerHTML = '<div class="loading-state"><span class="loader" aria-hidden="true"></span><p>Gathering the good knits…</p></div>';
    try {
      const response = await fetch("./api/catalog", { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data.products) || !data.products.length) throw new Error("Catalog was empty");
      state.products = data.products.filter(product => styleNotes[product.id] && product.is_in_stock);
      if (!state.products.length) throw new Error("No styles available");
      renderQuiz();
      renderGrid();
    } catch (error) {
      console.error("Could not load knit edit", error);
      panel.innerHTML = '<div class="error-state"><p class="section-kicker">THE CONNECTION GOT TANGLED</p><h3>We can’t load the knits right now.</h3><p>Please try again in a moment, or browse the collection on the Iris &amp; Co. shop.</p><button class="button button-primary" id="retry-catalog" type="button">Try again ↗</button></div>';
      grid.innerHTML = '<p>The live knit edit is temporarily unavailable. <a class="text-link" href="https://woo-demo-store-10-9.mystagingwebsite.com/shop/">Visit the shop ↗</a></p>';
      $("#retry-catalog").addEventListener("click", loadCatalog);
    }
  }

  function renderQuiz() {
    const question = questions[state.step];
    const progress = ((state.step + 1) / questions.length) * 100;
    panel.innerHTML = `
      <div class="quiz-meta"><span>QUESTION 0${state.step + 1} / 0${questions.length}</span><span>THE KNIT FINDER</span></div>
      <div class="progress-track" role="progressbar" aria-label="Quiz progress" aria-valuenow="${state.step + 1}" aria-valuemin="1" aria-valuemax="${questions.length}"><span style="width:${progress}%"></span></div>
      <h3>${escapeHtml(question.title)}</h3><p class="quiz-help">${escapeHtml(question.help)}</p>
      <div class="option-list">${question.options.map(option => `
        <button class="option" type="button" data-answer="${escapeHtml(option.value)}">
          <span class="option-icon" aria-hidden="true">${escapeHtml(option.icon)}</span>
          <span class="option-text"><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.detail)}</small></span>
          <span class="option-arrow" aria-hidden="true">↗</span>
        </button>`).join("")}</div>
      ${state.step > 0 ? '<button class="quiz-back" type="button" id="quiz-back">← Previous question</button>' : ""}`;
    panel.querySelectorAll("[data-answer]").forEach(button => button.addEventListener("click", () => answer(button.dataset.answer)));
    $("#quiz-back")?.addEventListener("click", () => { state.step--; renderQuiz(); });
  }

  function answer(value) {
    state.answers[state.step] = value;
    if (state.step < questions.length - 1) {
      state.step++;
      renderQuiz();
    } else {
      state.mode = "quiz";
      showProduct(rankProducts()[0]);
      panel.innerHTML = '<div class="error-state"><p class="section-kicker">YOUR MATCH IS READY ✳</p><h3>That’s the knit!</h3><p>We found a style that fits your answers. Choose your size and color below, or explore the rest of the edit.</p><button class="quiz-back" id="quiz-restart" type="button">↺ Take the quiz again</button></div>';
      $("#quiz-restart").addEventListener("click", restartQuiz);
    }
  }

  function rankProducts() {
    const [occasion, warmth, shape] = state.answers;
    return [...state.products].sort((a, b) => {
      const score = product => {
        const note = styleNotes[product.id];
        return (note.occasion === occasion ? 4 : 0) + (note.warmth === warmth ? 3 : 0) + (note.shape === shape ? 5 : 0);
      };
      return score(b) - score(a);
    });
  }

  function restartQuiz() {
    state.step = 0;
    state.answers = [];
    state.selected = null;
    resultSection.hidden = true;
    renderQuiz();
    $("#quiz").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function attribute(product, name) {
    return product.attributes?.find(item => item.name.toLowerCase() === name)?.terms || [];
  }

  function showProduct(product) {
    if (!product) return;
    previewRequest++;
    state.selected = product;
    state.size = "";
    state.color = "";
    state.preview = null;
    renderResult();
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderResult() {
    const product = state.selected;
    if (!product) return;
    const note = styleNotes[product.id];
    const sizes = attribute(product, "size");
    const colors = attribute(product, "color");
    const image = trustedUrl(state.preview?.images?.[0]?.src || product.images?.[0]?.src);
    resultSection.innerHTML = `<div class="result-wrap">
      <div class="result-topline"><p class="section-kicker">${state.mode === "quiz" ? "YOUR PERSONAL MATCH / 01" : "YOUR PICK FROM THE EDIT"}</p><button type="button" id="result-restart">↺ Retake the quiz</button></div>
      <h2 class="result-title">${state.mode === "quiz" ? "Meet your <em>match.</em>" : "Make it <em>yours.</em>"}</h2>
      <div class="result-layout">
        <div class="result-image">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy">` : ""}<span class="result-badge">${escapeHtml(note.tag)}</span></div>
        <div class="result-details">
          <p class="section-kicker">IRIS &amp; CO. / THE KNIT EDIT</p>
          <h3>${escapeHtml(product.name)}</h3>
          <p class="match-copy">${escapeHtml(note.copy)}</p>
          <div class="result-price">${escapeHtml(money(state.preview?.prices || product.prices))}</div>
          <fieldset class="selector-group"><legend>Choose your size</legend><div class="selector-options">${sizes.map(size => `<button class="selector-option" type="button" data-size="${escapeHtml(size.slug)}" aria-pressed="${state.size === size.slug}">${escapeHtml(size.name)}</button>`).join("")}</div></fieldset>
          <fieldset class="selector-group"><legend>Pick a color</legend><div class="selector-options">${colors.map(color => `<button class="selector-option color-option" type="button" data-color="${escapeHtml(color.slug)}" aria-pressed="${state.color === color.slug}"><span class="swatch" style="--swatch:${swatches[color.slug] || "#aaa"}" aria-hidden="true"></span>${escapeHtml(color.name)}</button>`).join("")}</div></fieldset>
          <button class="button button-primary add-button" id="add-to-cart" type="button" ${state.preview ? "" : "disabled"}>Add to mini cart <span aria-hidden="true">↗</span></button>
          <p class="product-status" id="product-status">${state.preview ? "Ready when you are." : "Choose a size and color to add this knit."}</p>
        </div>
      </div></div>`;
    $("#result-restart").addEventListener("click", restartQuiz);
    resultSection.querySelectorAll("[data-size]").forEach(button => button.addEventListener("click", () => selectOption("size", button.dataset.size)));
    resultSection.querySelectorAll("[data-color]").forEach(button => button.addEventListener("click", () => selectOption("color", button.dataset.color)));
    $("#add-to-cart").addEventListener("click", addSelectedToCart);
  }

  function selectOption(key, value) {
    state[key] = value;
    state.preview = null;
    const request = ++previewRequest;
    renderResult();
    const selectedButton = resultSection.querySelector(`[data-${key}="${CSS.escape(value)}"]`);
    selectedButton?.focus({ preventScroll: true });
    if (state.size && state.color) previewVariation(request);
  }

  function findVariation(product, size, color) {
    return product.variations?.find(variation => {
      const values = Object.fromEntries(variation.attributes.map(attribute => [attribute.name.toLowerCase(), attribute.value]));
      return values.size === size && values.color === color;
    });
  }

  async function previewVariation(request) {
    const product = state.selected;
    const variation = findVariation(product, state.size, state.color);
    const status = $("#product-status");
    if (!variation) {
      status.textContent = "That combination isn’t available. Try another size or color.";
      status.classList.add("error");
      return;
    }
    status.textContent = "Checking live stock and price…";
    try {
      const response = await fetch(`./api/variation?id=${variation.id}`, { headers: { accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Could not confirm variation");
      const { product: live } = await response.json();
      if (request !== previewRequest) return;
      if (!live || live.id !== variation.id || live.parent !== product.id || !live.is_purchasable || !live.is_in_stock) {
        status.textContent = "This combination is unavailable right now. Please pick another.";
        status.classList.add("error");
        return;
      }
      state.preview = live;
      renderResult();
    } catch (error) {
      if (request !== previewRequest) return;
      console.error("Could not preview knit", error);
      status.textContent = "We couldn’t confirm this knit. Please choose again.";
      status.classList.add("error");
    }
  }

  function addSelectedToCart() {
    const product = state.selected;
    const live = state.preview;
    if (!product || !live || !state.size || !state.color) return;
    const variation = findVariation(product, state.size, state.color);
    const status = $("#product-status");
    if (!variation || variation.id !== live.id || live.parent !== product.id) {
      status.textContent = "That combination isn’t available. Try another size or color.";
      status.classList.add("error");
      return;
    }
    const existing = state.cart.find(item => item.id === live.id);
    if (existing) existing.quantity = Math.min(99, existing.quantity + 1);
    else state.cart.push({ id: live.id, parent: product.id, name: product.name, size: state.size.toUpperCase(), color: attribute(product, "color").find(item => item.slug === state.color)?.name || state.color, prices: live.prices, image: trustedUrl(live.images?.[0]?.src || product.images?.[0]?.src), quantity: 1 });
    renderCart();
    toast("Added to your mini cart ✳");
    status.textContent = "Added! Keep exploring or open your mini cart.";
  }

  function renderGrid() {
    const featureIds = [817, 819, 820, 818, 41, 44];
    const products = featureIds.map(id => state.products.find(product => product.id === id)).filter(Boolean);
    grid.innerHTML = products.map((product, index) => `<article class="product-card">
      <div class="product-photo">${trustedUrl(product.images?.[0]?.src) ? `<img src="${escapeHtml(trustedUrl(product.images[0].src))}" alt="${escapeHtml(product.name)}" loading="lazy">` : ""}<span>${escapeHtml(styleNotes[product.id].tag)}</span></div>
      <div class="product-content"><h3>${escapeHtml(product.name)}</h3><div class="product-row"><span>${escapeHtml(money(product.prices))}</span><button type="button" data-product-id="${product.id}">Choose this knit ↗</button></div></div>
    </article>`).join("");
    grid.querySelectorAll("[data-product-id]").forEach(button => button.addEventListener("click", () => {
      state.mode = "picked";
      showProduct(state.products.find(product => product.id === Number(button.dataset.productId)));
    }));
  }

  function checkoutUrl() {
    const url = new URL("/checkout-link/", STORE);
    url.searchParams.set("products", state.cart.map(item => `${item.id}:${item.quantity}`).join(","));
    return url.href;
  }

  function renderCart() {
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    $("#cart-count").textContent = count;
    $("#cart-trigger").setAttribute("aria-label", `Open mini cart, ${count} ${count === 1 ? "item" : "items"}`);
    $("#cart-heading-count").textContent = `(${count})`;
    const items = $("#cart-items");
    const foot = $("#cart-foot");
    if (!count) {
      items.innerHTML = '<div class="empty-cart"><span aria-hidden="true">✳</span><h3>Nothing in your lineup yet.</h3><p>Take the quiz or explore the knit edit to find a favorite.</p></div>';
      foot.innerHTML = '<button class="button button-primary" id="cart-explore" type="button">Find my knit <span aria-hidden="true">↗</span></button>';
      $("#cart-explore").addEventListener("click", () => { dialog.close(); $("#quiz").scrollIntoView({ behavior: "smooth" }); });
      return;
    }
    items.innerHTML = state.cart.map(item => `<div class="cart-item">
      ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">` : "<div></div>"}
      <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.size)} · ${escapeHtml(item.color)}</p><strong>${escapeHtml(money(item.prices))}</strong>
      <div class="cart-item-controls"><div class="quantity-stepper" aria-label="Quantity for ${escapeHtml(item.name)}"><button type="button" data-quantity="minus" data-id="${item.id}" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button type="button" data-quantity="plus" data-id="${item.id}" aria-label="Increase quantity">+</button></div><button class="remove-item" type="button" data-remove="${item.id}">Remove</button></div></div>
    </div>`).join("");
    const totalMinor = state.cart.reduce((sum, item) => sum + Number(item.prices.price) * item.quantity, 0);
    const currency = state.cart[0].prices.currency_code || "USD";
    const minorUnit = Number(state.cart[0].prices.currency_minor_unit ?? 2);
    const total = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(totalMinor / 10 ** minorUnit);
    foot.innerHTML = `<div class="subtotal"><span>Subtotal</span><span>${escapeHtml(total)}</span></div><p>Shipping and taxes are calculated on the Iris &amp; Co. checkout page.</p><a class="button button-primary" href="${escapeHtml(checkoutUrl())}">Continue to checkout <span aria-hidden="true">↗</span></a>`;
    items.querySelectorAll("[data-quantity]").forEach(button => button.addEventListener("click", () => {
      const item = state.cart.find(entry => entry.id === Number(button.dataset.id));
      if (!item) return;
      item.quantity += button.dataset.quantity === "plus" ? 1 : -1;
      if (item.quantity <= 0) state.cart = state.cart.filter(entry => entry !== item);
      else item.quantity = Math.min(item.quantity, 99);
      renderCart();
    }));
    items.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", () => {
      state.cart = state.cart.filter(item => item.id !== Number(button.dataset.remove));
      renderCart();
    }));
  }

  $("#cart-trigger").addEventListener("click", () => dialog.showModal());
  $("#closing-cart").addEventListener("click", () => dialog.showModal());
  $("#cart-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  renderCart();
  loadCatalog();
})();
