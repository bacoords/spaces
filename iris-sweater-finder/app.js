(() => {
  "use strict";

  const STORE = "https://woo-demo-store-10-9.mystagingwebsite.com";
  const DEFAULT_PHOTO = `${STORE}/wp-content/themes/purple/assets/images/orange-sweater.webp`;
  const questions = [
    {
      title: "Where will your sweater go?",
      options: [
        { value: "everyday", icon: "☀", label: "Everyday, everywhere", detail: "Coffee runs to easy afternoons" },
        { value: "outside", icon: "✳", label: "Out into the elements", detail: "A little extra warmth, please" },
        { value: "dressed", icon: "✦", label: "Somewhere a little special", detail: "Softness with a polished feel" }
      ]
    },
    {
      title: "How cozy is your cozy?",
      options: [
        { value: "light", icon: "◡", label: "Light & easy", detail: "Just enough to throw on" },
        { value: "balanced", icon: "✶", label: "The happy middle", detail: "A year-round favorite" },
        { value: "cozy", icon: "❋", label: "Wrap me up", detail: "Bring on the chunky knits" }
      ]
    },
    {
      title: "Pick your favorite shape.",
      options: [
        { value: "crewneck", icon: "○", label: "Classic crewneck", detail: "Simple for a reason" },
        { value: "turtleneck", icon: "⌒", label: "Cozy turtleneck", detail: "A little more coverage" },
        { value: "cardigan", icon: "↟", label: "Layerable cardigan", detail: "Wear it your way" }
      ]
    }
  ];

  const styleNotes = {
    820: { occasion: "outside", warmth: "cozy", shape: "cardigan", copy: "An easy wool layer for crisp days." },
    819: { occasion: "dressed", warmth: "balanced", shape: "turtleneck", copy: "A refined merino knit with just the right warmth." },
    818: { occasion: "everyday", warmth: "cozy", shape: "crewneck", copy: "The familiar crewneck, turned up in heavyweight wool." },
    817: { occasion: "everyday", warmth: "light", shape: "crewneck", copy: "Soft ribbing and an easy shape for every day." },
    44: { occasion: "outside", warmth: "cozy", shape: "turtleneck", copy: "A warm wool turtleneck with a little more color." },
    43: { occasion: "dressed", warmth: "balanced", shape: "crewneck", copy: "Merino softness meets a timeless crewneck." },
    41: { occasion: "dressed", warmth: "light", shape: "crewneck", copy: "A cashmere crewneck you’ll want close." }
  };

  const swatches = {
    "forest-green": "#345c42", "navy-blue": "#26345c", navy: "#26345c", orange: "#e66b37",
    "light-pink": "#e9a6b2", lavender: "#a69ada", gray: "#96999a", "light-gray": "#c3c5c4",
    yellow: "#edc643", "mustard-yellow": "#d8a92d"
  };

  const state = { products: [], step: 0, answers: [], selected: null, size: "", color: "", preview: null, picks: [] };
  const $ = selector => document.querySelector(selector);
  const panel = $("#quiz-panel");
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
    } catch (error) {
      console.error("Could not load knit edit", error);
      panel.innerHTML = '<div class="error-state"><h2>Our knits are taking a moment.</h2><p>Please try again, or explore the full collection.</p><div class="error-actions"><button class="button button-primary" id="retry-catalog" type="button">Try again ↗</button><a href="https://woo-demo-store-10-9.mystagingwebsite.com/shop/">Visit the shop ↗</a></div></div>';
      $("#retry-catalog").addEventListener("click", loadCatalog);
    }
  }

  function renderQuiz() {
    const question = questions[state.step];
    const progress = ((state.step + 1) / questions.length) * 100;
    panel.innerHTML = `
      <div class="quiz-meta"><span>QUESTION 0${state.step + 1} / 0${questions.length}</span><span>THE KNIT FINDER</span></div>
      <div class="progress-track" role="progressbar" aria-label="Quiz progress" aria-valuenow="${state.step + 1}" aria-valuemin="1" aria-valuemax="${questions.length}"><span style="width:${progress}%"></span></div>
      <h2>${escapeHtml(question.title)}</h2>
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
      showProduct(rankProducts()[0]);
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
    previewRequest++;
    state.step = 0;
    state.answers = [];
    state.selected = null;
    state.size = "";
    state.color = "";
    state.preview = null;
    setHeroPhoto(DEFAULT_PHOTO, "Model wearing a bright orange Iris & Co. sweater");
    $("#hero-caption").textContent = "A LITTLE COLOR GOES A LONG WAY";
    renderQuiz();
    $("#main").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function attribute(product, name) {
    return product.attributes?.find(item => item.name.toLowerCase() === name)?.terms || [];
  }

  function setHeroPhoto(src, alt) {
    const url = trustedUrl(src);
    if (!url) return;
    const image = $("#hero-photo");
    image.src = url;
    image.alt = alt;
  }

  function showProduct(product) {
    if (!product) return;
    previewRequest++;
    state.selected = product;
    state.size = "";
    state.color = "";
    state.preview = null;
    setHeroPhoto(product.images?.[0]?.src, product.name);
    $("#hero-caption").textContent = "YOUR IRIS & CO. MATCH";
    renderResult();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderResult() {
    const product = state.selected;
    if (!product) return;
    const sizes = attribute(product, "size");
    const colors = attribute(product, "color");
    const alreadyPicked = state.preview && state.picks.some(item => item.id === state.preview.id);
    panel.innerHTML = `
      <div class="result-meta"><span>YOUR MATCH <span aria-hidden="true">✳</span></span><button type="button" id="quiz-restart">↺ Start again</button></div>
      <h2 class="result-name">${escapeHtml(product.name)}</h2>
      <p class="result-copy">${escapeHtml(styleNotes[product.id].copy)}</p>
      <p class="result-price">${escapeHtml(money(state.preview?.prices || product.prices))}</p>
      <fieldset class="selector-group"><legend>Size</legend><div class="selector-options">${sizes.map(size => `<button class="selector-option" type="button" data-size="${escapeHtml(size.slug)}" aria-pressed="${state.size === size.slug}">${escapeHtml(size.name)}</button>`).join("")}</div></fieldset>
      <fieldset class="selector-group"><legend>Color</legend><div class="selector-options">${colors.map(color => `<button class="selector-option color-option" type="button" data-color="${escapeHtml(color.slug)}" aria-pressed="${state.color === color.slug}"><span class="swatch" style="--swatch:${swatches[color.slug] || "#aaa"}" aria-hidden="true"></span>${escapeHtml(color.name)}</button>`).join("")}</div></fieldset>
      <button class="button button-primary add-button" id="add-to-picks" type="button" ${state.preview && !alreadyPicked ? "" : "disabled"}>${alreadyPicked ? "Added to your picks ✓" : "Add to my picks ↗"}</button>
      <p class="product-status" id="product-status">${alreadyPicked ? "Ready in the checkout bar below. Take the quiz again to find another." : state.preview ? "Ready to add to checkout." : "Choose a size and color to continue."}</p>`;
    $("#quiz-restart").addEventListener("click", restartQuiz);
    panel.querySelectorAll("[data-size]").forEach(button => button.addEventListener("click", () => selectOption("size", button.dataset.size)));
    panel.querySelectorAll("[data-color]").forEach(button => button.addEventListener("click", () => selectOption("color", button.dataset.color)));
    $("#add-to-picks").addEventListener("click", addSelectedToPicks);
  }

  function selectOption(key, value) {
    state[key] = value;
    state.preview = null;
    const request = ++previewRequest;
    renderResult();
    const selectedButton = panel.querySelector(`[data-${key}="${CSS.escape(value)}"]`);
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
      setHeroPhoto(live.images?.[0]?.src || product.images?.[0]?.src, product.name);
      renderResult();
    } catch (error) {
      if (request !== previewRequest) return;
      console.error("Could not preview knit", error);
      status.textContent = "We couldn’t confirm this knit. Please choose again.";
      status.classList.add("error");
    }
  }

  function addSelectedToPicks() {
    const product = state.selected;
    const live = state.preview;
    if (!product || !live || !state.size || !state.color) return;
    const variation = findVariation(product, state.size, state.color);
    if (!variation || variation.id !== live.id || live.parent !== product.id) return;
    if (state.picks.some(item => item.id === live.id)) return;
    state.picks.push({
      id: live.id,
      name: product.name,
      size: state.size.toUpperCase(),
      color: attribute(product, "color").find(item => item.slug === state.color)?.name || state.color,
      image: trustedUrl(live.images?.[0]?.src || product.images?.[0]?.src)
    });
    renderDock();
    renderResult();
    toast("Added to your picks ✳");
  }

  function checkoutUrl() {
    const url = new URL("/checkout-link/", STORE);
    url.searchParams.set("products", state.picks.map(item => `${item.id}:1`).join(","));
    return url.href;
  }

  function renderDock() {
    const count = state.picks.length;
    $("#pick-count").textContent = `(${count})`;
    $("#dock-label").textContent = count ? `${count} ${count === 1 ? "sweater" : "sweaters"} ready for checkout` : "Your sweaters will appear here.";
    const picks = $("#dock-picks");
    picks.innerHTML = count ? state.picks.map((item, index) => `
      <div class="dock-pick" style="--turn:${[-9, 7, -5, 10, -7][index % 5]}deg" title="${escapeHtml(`${item.name} · ${item.size} · ${item.color}`)}">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : '<span aria-hidden="true">✳</span>'}
        <button type="button" data-remove="${item.id}" aria-label="Remove ${escapeHtml(item.name)}, ${escapeHtml(item.size)}, ${escapeHtml(item.color)}">×</button>
      </div>`).join("") : '<span class="dock-empty" aria-hidden="true">✳</span>';
    $("#dock-action").innerHTML = count
      ? `<a class="button checkout-button" href="${escapeHtml(checkoutUrl())}">Checkout <span aria-hidden="true">↗</span></a>`
      : '<button class="button checkout-button" type="button" disabled>Checkout <span aria-hidden="true">↗</span></button>';
    picks.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", () => {
      state.picks = state.picks.filter(item => item.id !== Number(button.dataset.remove));
      renderDock();
      if (state.selected) renderResult();
    }));
  }

  renderDock();
  loadCatalog();
})();
