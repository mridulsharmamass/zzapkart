// =====================================================================
// Zzapkart Assistant — website ka chat bot (home + shopping pages)
// Bina server ke kaam karta hai: asli catalog (PRODUCTS), cart, customer ke
// orders, policies aur Brand Stores se jawab deta hai. Hindi / Hinglish /
// English samajhta hai. "Talk to support" se support ticket banta hai →
// Super Admin (admin.html → Support) reply karta hai → reply yahin chat me.
// Sab kuch is IIFE ke andar hai (koi global naam nahi banta).
// =====================================================================
(() => {
  if (typeof PRODUCTS === "undefined" || document.getElementById("zc-root")) return;

  const MAX_LOG = 80;
  const ORDER_RE = /\bzk\d{6,10}\b/i;
  const CANCEL_RE = /^(cancel|stop|chhodo|chodo|rehne do|rahne do|nahi|no|exit|quit|band karo|✖ rehne do)$/i;
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const here = page + location.search;
  const loginHref = () => "account.html?next=" + encodeURIComponent(here);
  const firstName = (c) => esc(String(c.name || "").split(" ")[0]);
  const money = (n) => formatPrice(n);

  // ---------------------------------------------------------------
  // Chat history (localStorage — page badalne par bhi chat bani rahe)
  // ---------------------------------------------------------------
  let S = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(DB.chat));
      if (s && Array.isArray(s.msgs)) return { msgs: s.msgs.slice(-MAX_LOG), flow: s.flow || null };
    } catch { /* khaali chat */ }
    return { msgs: [], flow: null };
  }
  function save() {
    try { localStorage.setItem(DB.chat, JSON.stringify({ msgs: S.msgs.slice(-MAX_LOG), flow: S.flow })); } catch { /* storage full */ }
  }

  // ---------------------------------------------------------------
  // Quick replies
  // ---------------------------------------------------------------
  const C = {
    track: { label: "📦 Track order", q: "track my order" },
    deals: { label: "🔥 Today's deals", q: "today's deals" },
    cats: { label: "🗂️ Categories", q: "categories" },
    returns: { label: "↩️ Returns", q: "return policy" },
    delivery: { label: "🚚 Delivery", q: "delivery charges" },
    pay: { label: "💳 Payment", q: "payment options" },
    human: { label: "🙋 Talk to support", q: "talk to support" },
    cart: { label: "🛒 My cart", q: "my cart" },
    sell: { label: "🏪 Sell on Zzapkart", q: "sell on zzapkart" },
    tickets: { label: "🎫 Meri requests", q: "my support requests" },
    stores: { label: "🏬 Brand stores", q: "brand stores" },
    cancel: { label: "✖ Rehne do", q: "cancel" },
  };
  const MENU = [C.track, C.deals, C.cats, C.returns, C.delivery, C.human];
  const pdpId = page === "product.html" ? new URLSearchParams(location.search).get("id") : null;
  const pdpProduct = pdpId ? PRODUCTS.find((p) => String(p.id) === String(pdpId)) : null;

  function welcome() {
    const c = currentCustomer();
    const chips = pdpProduct ? [{ label: "📦 Is product ke baare me", q: "__product:" + pdpProduct.id }, ...MENU.slice(0, 5)] : MENU;
    return {
      html: `Namaste${c ? " " + firstName(c) : ""}! 👋 Main <strong>Zzapkart Assistant</strong> hoon.<br>Product dhoondhna ho, order track karna ho, ya return / delivery / payment ke baare me poochna ho — bas likhiye.<br><span class="zc-muted">Jaise: "running shoes under 3000" ya "mera order kahan hai"</span>`,
      chips,
    };
  }

  // ---------------------------------------------------------------
  // Product search (catalog se) — price filter bhi samajhta hai
  // ---------------------------------------------------------------
  const STOP = new Set(("show me my i want need needed looking look for a an the some any please pls plz buy kharidna kharidni kharid chahiye chahie chaiye " +
    "dikhao dikha dikhaiye do de dena dedo batao bata under below above over less more than upto up to within between and or rs inr ka ki ke ko " +
    "se kam zyada jyada upar neeche niche andar tak mein me mujhe mere mera meri liye wala wali wale koi kuch accha achha acha best good nice cheap " +
    "sasta sasti saste price prices budget find search get have you is are there available product products item items hai h kya aap ap app " +
    "with in of on max min minimum maximum starting from sab all latest top range rupees rupee k chahta chahti hoon hu ek kuchh dekhna today todays aaj " +
    "offer offers deal deals discount discounts sale").split(" "));
  const SYN = {
    mobile: ["phone", "smartphone", "mobile"], mobiles: ["phone", "smartphone", "mobile"], phone: ["phone", "smartphone", "mobile"], phones: ["phone", "smartphone"],
    smartphone: ["smartphone", "phone"], tshirt: ["t-shirt", "tshirt", "tee"], tshirts: ["t-shirt", "tshirt", "tee"], tee: ["t-shirt", "tshirt", "tee"],
    shoe: ["shoe", "sneaker", "footwear"], shoes: ["shoe", "sneaker", "footwear"], sneakers: ["sneaker", "shoe"], joote: ["shoe", "footwear"], juta: ["shoe", "footwear"], jute: ["shoe", "footwear"],
    headphone: ["headphone", "earphone", "earbud", "headset"], headphones: ["headphone", "earphone", "earbud", "headset"], earphones: ["earphone", "earbud", "headphone"], earbuds: ["earbud", "earphone"],
    ghadi: ["watch"], watches: ["watch"], bags: ["bag", "backpack"], backpack: ["backpack", "bag"], kitab: ["book", "novel", "notebook"], books: ["book", "novel"],
    paudha: ["plant"], plants: ["plant"], khilona: ["toy"], toys: ["toy", "game"], kapde: ["shirt", "t-shirt", "kurta", "jeans", "dress"], kapda: ["shirt", "t-shirt", "kurta", "jeans", "dress"],
    chashma: ["sunglass", "eyewear", "glasses"], sunglasses: ["sunglass"], laptops: ["laptop"], speakers: ["speaker"],
  };
  const compact = (s) => s.replace(/[^a-z0-9]/g, "");
  function hayOf(p) {
    const attrs = p.attrs ? Object.values(p.attrs).filter((v) => typeof v === "string").join(" ") : "";
    const h = `${p.name} ${p.brand || ""} ${p.category || ""} ${p.catName || ""} ${p.verticalName || ""} ${p.keywords || ""} ${attrs}`.toLowerCase();
    return { h, c: compact(h) };
  }
  const tokenAlts = (t) => SYN[t] || [t, t.length > 4 && t.endsWith("es") ? t.slice(0, -2) : null, t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : null].filter(Boolean);
  const tokenHit = (hay, t) => tokenAlts(t).some((a) => hay.h.includes(a) || (a.length > 3 && hay.c.includes(compact(a))));

  function parsePrice(text) {
    const num = (s) => { const m = String(s).replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k)?/i); return m ? Math.round(Number(m[1]) * (m[2] ? 1000 : 1)) : NaN; };
    const N = "(?:₹|rs\\.?|inr)?\\s*(\\d[\\d,]*(?:\\.\\d+)?\\s*k?)\\b";
    const t = text.toLowerCase();
    let min = 0, max = Infinity, m;
    if ((m = t.match(new RegExp(`(?:between|from|bich|beech)?\\s*${N}\\s*(?:and|to|-|se)\\s*${N}`)))) { min = num(m[1]); max = num(m[2]); }
    else {
      if ((m = t.match(new RegExp(`(?:under|below|less than|upto|up to|within|max|maximum|budget|<)\\s*${N}`)))) max = num(m[1]);
      else if ((m = t.match(new RegExp(`${N}\\s*(?:se kam|ke andar|ke neeche|ke niche|tak|or less|and below|max)`)))) max = num(m[1]);
      if ((m = t.match(new RegExp(`(?:above|over|more than|min|minimum|starting|>)\\s*${N}`)))) min = num(m[1]);
      else if ((m = t.match(new RegExp(`${N}\\s*(?:se upar|se zyada|se jyada|ke upar|or more|and above|plus|\\+)`)))) min = num(m[1]);
    }
    if (!(min >= 0)) min = 0;
    if (!(max > 0)) max = Infinity;
    if (min > max) [min, max] = [max, min];
    if (max < 50) { min = 0; max = Infinity; } // "size 8 to 10" jaisa — price nahi
    return { min, max, has: min > 0 || max < Infinity };
  }
  function tokensOf(text) {
    return text.toLowerCase()
      .replace(/\bt[\s-]?shirts?\b/g, "tshirt")
      .replace(/(₹|rs\.?|inr)\s*\d[\d,]*k?/g, " ")
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .filter((w) => w.length >= 2 && !/^\d+k?$/.test(w) && !STOP.has(w));
  }
  function searchProducts(text) {
    const price = parsePrice(text);
    const toks = tokensOf(text);
    if (!toks.length && !price.has) return null;
    const inRange = (p) => p.price >= price.min && p.price <= price.max;
    const rank = (a, b) => (b.score - a.score) || (inStock(b.p) - inStock(a.p)) || ((b.p.featured ? 1 : 0) - (a.p.featured ? 1 : 0)) || (discount(b.p) - discount(a.p));
    const scored = PRODUCTS.filter(inRange).map((p) => {
      const hay = hayOf(p);
      return { p, score: toks.filter((t) => tokenHit(hay, t)).length };
    });
    let exact = true;
    let list = toks.length ? scored.filter((x) => x.score === toks.length) : scored;
    if (!list.length && toks.length > 1) { list = scored.filter((x) => x.score > 0); exact = false; }
    return { list: list.sort(rank).map((x) => x.p), toks, price, exact };
  }

  function prodCard(p) {
    const off = discount(p);
    const out = !inStock(p);
    const act = out ? `<span class="zc-out">Out of stock</span>`
      : p.hasSizes ? `<a class="zc-mini-btn" href="${productUrl(p)}">Size chunein</a>`
      : `<button type="button" class="zc-mini-btn" data-zc-add="${p.id}">+ Add to cart</button>`;
    return `<div class="zc-prod">
      <a class="zc-prod-img" href="${productUrl(p)}" style="background:${esc(p.color || "#f3eefc")}" tabindex="-1" aria-hidden="true">${productThumb(p)}</a>
      <div class="zc-prod-info">
        <a class="zc-prod-name" href="${productUrl(p)}">${esc(p.name)}</a>
        <span class="zc-prod-price"><strong>${money(p.price)}</strong>${off ? ` <s>${money(p.mrp)}</s> <em>${off}% off</em>` : ""}</span>
        ${act}
      </div>
    </div>`;
  }
  const prodList = (list) => `<div class="zc-prods">${list.map(prodCard).join("")}</div>`;
  function priceText(pr) {
    if (pr.min > 0 && pr.max < Infinity) return ` (${money(pr.min)} – ${money(pr.max)})`;
    if (pr.max < Infinity) return ` (${money(pr.max)} tak)`;
    if (pr.min > 0) return ` (${money(pr.min)} se upar)`;
    return "";
  }

  // ---------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------
  function expectedBy(o, sh) {
    const days = (DELIVERY_OPTIONS[o.delivery] || DELIVERY_OPTIONS.standard).days;
    return new Date((sh.dispatchBy || o.createdAt) + days * DAY).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  }
  function orderHtml(o) {
    return `<div class="zc-order">
      <div class="zc-order-head"><strong>#${esc(o.id)}</strong><span>${fmtDate(o.createdAt)} · ${money(o.total)}</span></div>
      <ul>${o.shipments.map((sh) => {
        const items = sh.items.map((it) => esc(it.name) + (it.size ? ` (${esc(it.size)})` : "") + (it.qty > 1 ? ` ×${it.qty}` : "")).join(", ");
        const last = sh.history[sh.history.length - 1] || { at: o.createdAt };
        return `<li><span class="zc-st st-${esc(sh.status.toLowerCase())}">${esc(sh.status)}</span> ${items}
          ${sh.trackingId ? `<small>🚚 ${esc(sh.courier || "Courier")} · Tracking ID ${esc(sh.trackingId)}</small>` : ""}
          <small>${sh.status === "Delivered" ? `Delivered ${fmtDate(sh.deliveredAt || last.at)}` : `Expected delivery: <strong>${expectedBy(o, sh)}</strong>`}</small></li>`;
      }).join("")}</ul>
    </div>`;
  }
  function ordersAnswer() {
    const c = currentCustomer();
    if (!c) return {
      html: `Order track karne ke liye pehle <a href="${loginHref()}">login</a> karein — phir main aapke saare orders ka status yahin bata dunga. 📦`,
      chips: [{ label: "🔐 Login karo", href: loginHref() }, C.human],
    };
    const os = customerOrders(c.id);
    if (!os.length) return { html: `${firstName(c)}, aapne abhi tak koi order nahi kiya. Shopping shuru karein? 🛍️`, chips: [C.deals, C.cats] };
    return {
      html: `Aapke latest order${os.length > 1 ? "s" : ""}:${os.slice(0, 3).map(orderHtml).join("")}<a class="zc-more" href="account.html#orders">Saare ${os.length} orders dekho →</a>`,
      chips: [{ label: "↩️ Return / problem", q: "__ticket:Return / problem with order" }, C.human, C.deals],
    };
  }
  function orderById(id) {
    id = id.toUpperCase();
    const o = getOrders().find((x) => x.id === id);
    const c = currentCustomer();
    if (!o) return { html: `Order <strong>#${esc(id)}</strong> nahi mila. ID dobara check karein (jaise ZK12345678) — ye order confirmation aur My Orders me likhi hoti hai.`, chips: [C.track, C.human] };
    if (o.customerId && (!c || c.id !== o.customerId)) {
      return c
        ? { html: `Order #${esc(id)} aapke account ka nahi hai. Jis account se order kiya tha, us se login karein.`, chips: [C.track, C.human] }
        : { html: `Order #${esc(id)} dekhne ke liye pehle <a href="${loginHref()}">login</a> karein (privacy ke liye).`, chips: [{ label: "🔐 Login karo", href: loginHref() }] };
    }
    return { html: `Order ki jaankari:${orderHtml(o)}`, chips: [{ label: "↩️ Return / problem", q: `__ticket:Return / problem — order ${o.id}` }, C.human] };
  }

  // ---------------------------------------------------------------
  // Support tickets (multi-step)
  // ---------------------------------------------------------------
  function startTicket(topic) {
    const c = currentCustomer();
    const orderId = (String(topic || "").match(ORDER_RE) || [""])[0].toUpperCase();
    S.flow = { k: "ticket", step: c ? "msg" : "name", topic: String(topic || "").slice(0, 60), orderId };
    save();
    if (c) {
      return {
        html: `Zaroor ${firstName(c)}! 🙋 Apni problem thodi detail me likhiye${S.flow.topic ? ` <span class="zc-muted">(${esc(S.flow.topic)})</span>` : ""}. Order se judi ho to <strong>Order ID</strong> bhi likhein.<br>Hamari team 24 ghante me reply karegi — reply <strong>yahin chat me</strong> aayega.`,
        chips: [C.cancel],
      };
    }
    return {
      html: `Support team aapki madad karegi 🙋 Pehle apna <strong>naam</strong> batayiye.<br><span class="zc-muted">Login karke poochenge to aapke orders apne-aap jud jayenge.</span>`,
      chips: [{ label: "🔐 Login karo", href: loginHref() }, C.cancel],
    };
  }
  function flowStep(q) {
    const f = S.flow;
    const text = q.trim();
    if (CANCEL_RE.test(text)) { S.flow = null; save(); return { html: "Theek hai 👍 Request cancel kar di. Aur kuch madad karun?", chips: MENU }; }
    if (f.k === "ticket") {
      if (f.step === "name") {
        const n = text.replace(/\s+/g, " ");
        if (n.length < 2 || n.length > 60 || /[\d@]/.test(n)) return { html: "Kripya apna sahi naam likhiye (2–60 letters).", chips: [C.cancel] };
        f.name = n;
        f.step = "email";
        save();
        return { html: `Shukriya ${esc(n.split(" ")[0])}! Ab apna <strong>email</strong> likhiye.`, chips: [C.cancel] };
      }
      if (f.step === "email") {
        const e = text.toLowerCase();
        if (!EMAIL_RE.test(e)) return { html: "Ye email sahi nahi lag raha. Jaise: <em>naam@gmail.com</em>", chips: [C.cancel] };
        f.email = e;
        f.step = "msg";
        save();
        return { html: `Ab apni problem detail me likhiye${f.topic ? ` <span class="zc-muted">(${esc(f.topic)})</span>` : ""}. Order ID ho to woh bhi.`, chips: [C.cancel] };
      }
      if (text.length < 10) return { html: "Thoda aur detail me likhiye (kam se kam 10 characters) taaki team sahi madad kar sake.", chips: [C.cancel] };
      const full = f.topic && !text.toLowerCase().includes(f.topic.toLowerCase()) ? `[${f.topic}] ${text}` : text;
      const orderId = ((text.match(ORDER_RE) || [])[0] || f.orderId || "").toUpperCase();
      const t = createTicket({ name: f.name, email: f.email, text: full, orderId });
      S.flow = null;
      save();
      if (!t) return { html: "Request save nahi ho payi (browser storage bhar gaya). Thodi der baad try karein.", chips: MENU };
      return {
        html: `✅ Aapki request <strong>#${esc(t.id)}</strong> ban gayi.<br>Hamari support team 24 ghante me reply karegi — reply <strong>yahin chat me</strong> aayega${t.customerId ? "" : " (isi browser me)"}.`,
        chips: [C.tickets, C.deals, C.track],
      };
    }
    if (f.k === "reply") {
      if (text.length < 2) return { html: "Apna message likhiye.", chips: [C.cancel] };
      const t = ticketReply(f.id, "customer", text);
      S.flow = null;
      save();
      return t
        ? { html: `✅ Aapka message request <strong>#${esc(t.id)}</strong> par bhej diya. Team jaldi reply karegi.`, chips: [C.tickets, ...MENU.slice(0, 2)] }
        : { html: "Ye request nahi mili.", chips: MENU };
    }
    S.flow = null;
    save();
    return null;
  }
  function ticketsAnswer() {
    const list = myTickets().slice(0, 5);
    if (!list.length) return { html: "Aapki koi support request nahi hai. Koi problem ho to batayiye 🙋", chips: [C.human, C.track] };
    return {
      html: `Aapki support requests:${list.map((t) => {
        const last = t.messages[t.messages.length - 1];
        const st = t.status !== "open" ? ["Resolved", "st-delivered"] : last.from === "admin" ? ["Reply aaya", "st-shipped"] : ["Open — team dekh rahi hai", "st-placed"];
        return `<div class="zc-ticket"><div><strong>#${esc(t.id)}</strong> <span class="zc-st ${st[1]}">${st[0]}</span></div>
          <small>${esc(t.subject)}</small>
          <small class="zc-muted">${last.from === "admin" ? "Support" : "Aap"}: ${esc(last.text.slice(0, 100))}${last.text.length > 100 ? "…" : ""}</small></div>`;
      }).join("")}`,
      chips: list.filter((t) => t.status === "open").slice(0, 2).map((t) => ({ label: `↩ Reply #${t.id}`, q: "__reply:" + t.id })).concat([C.human]),
    };
  }

  // ---------------------------------------------------------------
  // Jawab (intent detection)
  // ---------------------------------------------------------------
  const rx = (words) => new RegExp(`(^|[^a-z0-9])(${words})(?=$|[^a-z0-9])`, "i");
  const R = {
    greet: /^(hi+|hello+|helo|hey+|hlo|hii+|namaste|namaskar|pranam|good (morning|afternoon|evening)|yo|hola|salaam|sat sri akal)\b/i,
    thanks: rx("thanks?|thank you|thanku|thx|ty|shukriya|dhanyavaad|dhanyawad|dhanyavad"),
    bye: rx("bye|goodbye|alvida|tata|see you"),
    how: rx("how are you|kaise ho|kaisi ho|kya haal|kya hal|how r u"),
    who: rx("who are you|kaun ho|your name|tumhara naam|aapka naam|are you a bot|are you human|bot ho"),
    ok: /^(ok|okay|okk+|k|theek|thik|theek hai|thik hai|hmm+|accha|achha|acha|cool|great|nice|done|got it|samajh gaya)[.! ]*$/i,
    tickets: rx("tickets?|support requests?|my requests?|meri requests?|meri request|complaint status|request status"),
    human: rx("human|agent|executive|customer care|customer service|support|helpline|complain|complaint|shikayat|baat karni|baat karna|talk to|call me|insaan|contact"),
    cancel: rx("cancel|cancellation|radd"),
    track: rx("track|tracking|order status|my orders?|mera order|mere order|meri order|orders|parcel|shipment|kab aayega|kab ayega|kab aaega|kahan hai|kaha hai|where is my|not delivered|deliver nahi|kab tak aayega"),
    returns: rx("return|returns|refund|wapas|vapas|exchange|replace|replacement|paisa wapas|damaged|damage|galat product|wrong product|kharab|toota|broken"),
    pin: /\b([1-9]\d{5})\b/,
    delivery: rx("deliver|delivery|shipping|ship|kitne din|how many days|how long|dispatch|courier|free delivery|delivery charges?|shipping charges?|express"),
    pay: rx("pay|payment|payments|upi|cod|cash on delivery|card|cards|emi|net ?banking|wallet|paytm|phonepe|gpay|google pay|debit|credit"),
    coupon: rx("coupon|coupons|promo|promocode|voucher|code"),
    deals: rx("offers?|deals?|discounts?|sale|sasta|saste|sasti|cheap|cheapest|best price|today'?s deals"),
    cart: rx("cart|basket|my bag|checkout"),
    password: rx("forgot|forget|reset password|password bhool|password reset"),
    account: rx("login|log in|signin|sign in|sign ?up|signup|register|account|password|profile|logout|log out"),
    address: rx("address|addresses|delivery address"),
    sell: rx("sell|seller|sellers|become a seller|bechna|bechne|bechu|dukaan|dukan|vendor|supplier|commission|seller plan"),
    stores: rx("brand stores?|stores|brand store"),
    cats: rx("categor(y|ies)|browse|kya kya|what do you sell|what all|sab kuch"),
    help: rx("help|madad|menu|options|what can you do|kya kar sakte|kya kar sakta"),
    question: rx("what|how|why|when|who|kya|kaise|kyun|kyu|kab|kaun|kaunsa|can i|kar sakte|kar sakta|should"),
  };

  function reply(q) {
    if (q.startsWith("__reply:")) {
      const id = q.slice(8);
      S.flow = { k: "reply", id };
      save();
      return { html: `Request <strong>#${esc(id)}</strong> par apna reply likhiye:`, chips: [C.cancel] };
    }
    if (q.startsWith("__product:")) return productInfo(q.slice(10)) || welcome();
    if (q.startsWith("__ticket:")) return startTicket(q.slice(9));
    if (S.flow) { const r = flowStep(q); if (r) return r; }
    const c = currentCustomer();
    let t = q.toLowerCase().trim();
    if (R.greet.test(t)) {
      const rest = t.replace(R.greet, "").replace(/^[\s,!.]+/, "").trim();
      if (rest.replace(/[^a-z0-9]/g, "").length < 3) return { html: `Namaste${c ? " " + firstName(c) : ""}! 😊 Batayiye, aaj kya dhoondh rahe hain?`, chips: MENU };
      t = rest; // "hi, shoes dikhao" → baaki sawaal ka jawab
      q = rest;
    }
    if (R.thanks.test(t)) return { html: "Aapka swagat hai! 😊 Aur kuch madad chahiye to batayiye.", chips: [C.deals, C.track] };
    if (R.bye.test(t)) return { html: "Bye! 👋 Happy shopping — kabhi bhi zaroorat ho to main yahin hoon." };
    if (R.how.test(t)) return { html: "Main badhiya hoon, shukriya! 😊 Aapki kya madad karun?", chips: MENU };
    if (R.who.test(t)) return { html: "Main <strong>Zzapkart Assistant</strong> hoon — ek chat bot 🤖. Products, orders, returns, delivery aur payment me madad karta hoon. Kisi insaan se baat karni ho to <strong>Talk to support</strong> dabayein.", chips: MENU };
    if (R.ok.test(t)) return { html: "👍 Aur kuch madad chahiye?", chips: MENU };

    const oid = t.match(ORDER_RE);
    if (R.cancel.test(t)) {
      return {
        html: `Order ship hone se pehle cancel ho sakta hai. Website par abhi khud cancel ka button nahi hai — support team aapke liye cancel karegi aur prepaid payment poora refund hoga.${oid ? ` <br>Order: <strong>#${esc(oid[0].toUpperCase())}</strong>` : ""}`,
        chips: [{ label: "🙋 Cancel request bhejo", q: `__ticket:Cancel order${oid ? " " + oid[0].toUpperCase() : ""}` }, C.track],
      };
    }
    if (oid && !R.returns.test(t) && !R.human.test(t)) return orderById(oid[0]);
    if (R.tickets.test(t)) return ticketsAnswer();
    if (R.human.test(t)) return startTicket(oid ? `Order ${oid[0].toUpperCase()}` : "");
    if (R.returns.test(t)) {
      return {
        html: `<strong>Returns &amp; refunds</strong><br>• Zyadatar products par <strong>7 din easy return</strong> (kuch sellers 10 / 30 din dete hain — product page aur seller ke store par likha hota hai).<br>• Product unused ho, tags aur packing ke saath.<br>• Refund pickup ke baad <strong>5–7 din</strong> me — prepaid ho to usi payment method me, COD ho to bank / UPI me.<br>• Damaged / galat product mila? Delivery ke 48 ghante ke andar batayein — replacement ya poora refund.`,
        chips: [{ label: "↩️ Return request bhejo", q: `__ticket:Return request${oid ? " — order " + oid[0].toUpperCase() : ""}` }, C.track],
      };
    }
    if (R.track.test(t)) return ordersAnswer();
    const pin = t.match(R.pin);
    if (pin && (R.delivery.test(t) || /pin ?code|pincode|pin\b/.test(t) || t.replace(/\D/g, "").length === t.replace(/\s/g, "").length)) return pincodeAnswer(pin[1]);
    if (R.delivery.test(t) && !R.track.test(t)) {
      return {
        html: `<strong>Delivery</strong><br>• ${money(FREE_DELIVERY_MIN)} ya zyada ke order par <strong>FREE delivery</strong>, warna ₹40.<br>• Standard: dispatch ke baad ~${DELIVERY_OPTIONS.standard.days} din.<br>• Express: ${money(DELIVERY_OPTIONS.express.charge)} me ~${DELIVERY_OPTIONS.express.days} din.<br>• Har order ki tracking My Orders me.<br><span class="zc-muted">Apna pincode likhiye — main bata dunga delivery hoti hai ya nahi.</span>`,
        chips: [C.track, C.pay],
      };
    }
    if (R.pay.test(t)) {
      return {
        html: `<strong>Payment options</strong><br>• 💵 Cash on Delivery (COD)<br>• 📱 UPI (GPay, PhonePe, Paytm…)<br>• 💳 Debit / Credit card<br>Saare payments Zzapkart checkout par safe hain. EMI abhi available nahi. <span class="zc-muted">(Ye demo site hai — asli payment nahi hota.)</span>`,
        chips: [C.cart, C.delivery],
      };
    }
    if (R.coupon.test(t)) {
      const deal = topDeals(3);
      return { html: `Abhi koi coupon code nahi chal raha — par products par seedha discount hai 🎉 Ye dekhiye:${prodList(deal)}`, chips: [C.deals, C.cats] };
    }
    if (R.cart.test(t)) return cartAnswer();
    if (R.password.test(t)) {
      return { html: "Abhi website par khud se password reset ka option nahi hai 🙏 Support team ko request bhejiye — wo aapka account verify karke madad karenge.", chips: [C.human, { label: "🔐 Login page", href: loginHref() }] };
    }
    if (R.address.test(t) && !R.sell.test(t)) {
      return c
        ? { html: `Aapke <strong>${(c.addresses || []).length}</strong> saved address hain. Naya address jodna, edit karna ya default badalna — <a href="account.html#addresses">Saved Addresses</a> me. Checkout par bhi naya address daal sakte hain (apne-aap save ho jata hai).`, chips: [{ label: "📍 Saved addresses", href: "account.html#addresses" }] }
        : { html: `Address save karne ke liye <a href="${loginHref()}">login</a> karein. Checkout par jo address daalenge wo account me save ho jayega.`, chips: [{ label: "🔐 Login karo", href: loginHref() }] };
    }
    if (R.sell.test(t)) return sellAnswer();
    if (R.account.test(t)) {
      return c
        ? { html: `Aap <strong>${esc(c.name)}</strong> (${esc(c.email)}) ke roop me logged in hain. My Account me orders, addresses aur profile / password.`, chips: [{ label: "👤 My account", href: "account.html" }, C.track] }
        : { html: `Account banane ya login ke liye <a href="${loginHref()}">yahan</a> jaiye — naam, email aur password se 1 minute me. Login karke orders track kar sakte hain aur address save hote hain.`, chips: [{ label: "🔐 Login / Sign up", href: loginHref() }] };
    }
    if (R.stores.test(t)) return storesAnswer();
    if (R.deals.test(t) && !tokensOf(t).length && !parsePrice(t).has) return { html: `🔥 Aaj ke best deals:${prodList(topDeals(4))}`, chips: [C.cats, C.cart] };
    if (R.cats.test(t)) return catsAnswer();
    if (R.help.test(t)) return { html: "Main in cheezon me madad kar sakta hoon 👇 Ya seedha product ka naam likhiye.", chips: [...MENU, C.cart, C.pay, C.sell, C.tickets] };

    // Product search
    const res = searchProducts(q);
    if (res && res.list.length) {
      const n = res.list.length;
      const qLink = res.toks.length ? `<a class="zc-more" href="index.html?q=${encodeURIComponent(res.toks.join(" "))}">Saare results dekho →</a>` : "";
      return {
        html: `${res.exact ? `Ye mile — <strong>${n}</strong> product${n > 1 ? "s" : ""}${priceText(res.price)}:` : `Bilkul wahi nahi mila, par ye milte-julte products hain${priceText(res.price)}:`}${prodList(res.list.slice(0, 4))}${n > 4 ? qLink : ""}`,
        chips: [C.cart, C.deals],
      };
    }
    if (res && res.toks.length && !R.question.test(t)) {
      return {
        html: `"${esc(q.slice(0, 60))}" abhi Zzapkart par nahi mila 😕${res.price.has ? " (is price range me)" : ""}<br>Spelling check karein, ya categories dekhiye.`,
        chips: [C.cats, C.deals, C.human],
      };
    }
    return {
      html: "Maaf kijiye, ye main abhi samajh nahi paaya 🤔 Aap ye pooch sakte hain — ya <strong>Talk to support</strong> se hamari team se baat karein:",
      chips: MENU,
    };
  }

  function topDeals(n) {
    return PRODUCTS.filter(inStock).sort((a, b) => discount(b) - discount(a) || a.price - b.price).slice(0, n);
  }
  function cartAnswer() {
    const items = cartItemsResolved().filter((x) => x.qty > 0);
    if (!items.length) return { html: "Aapka cart khaali hai 🛒 Kuch dhoondhein?", chips: [C.deals, C.cats] };
    const count = items.reduce((s, x) => s + x.qty, 0);
    const total = items.reduce((s, x) => s + x.product.price * x.qty, 0);
    const left = FREE_DELIVERY_MIN - total;
    return {
      html: `🛒 Cart me <strong>${count}</strong> item${count > 1 ? "s" : ""} · <strong>${money(total)}</strong><ul class="zc-list">${items.slice(0, 5).map((x) => `<li>${esc(x.product.name)}${x.variant && x.variant.size ? ` (${esc(x.variant.size)})` : ""} × ${x.qty}</li>`).join("")}</ul>${left > 0 ? `₹${left.toLocaleString("en-IN")} aur add karo → <strong>FREE delivery</strong>` : "🎉 Aapko FREE delivery mil rahi hai"}`,
      chips: [{ label: "✅ Checkout", href: "checkout.html" }, { label: "🛒 Cart kholo", href: "cart.html" }],
    };
  }
  function catsAnswer() {
    return {
      html: `Zzapkart par ye categories hain 👇 <a href="browse.html">Saari sub-categories dekho →</a>`,
      chips: CATEGORIES.map((cat) => ({ label: `${cat.emoji} ${cat.name}`, href: categoryUrl(cat) })),
    };
  }
  function sellAnswer() {
    const P = PLAN_ORDER.map((k) => PLANS[k]);
    return {
      html: `<strong>Zzapkart par bechna shuru karein</strong> 🏪<br>1. <a href="seller.html">Seller account</a> banao<br>2. KYC (ID + address proof) submit karo<br>3. Products list karo → QC pass → live!<br><br><strong>Plans:</strong> Free (3 products) · ${P.map((p) => `${p.name} ${money(p.price)}/mahina`).join(" · ")}<br><span class="zc-muted">Premium me apna Brand Store (khud ki website) milta hai.</span>`,
      chips: [{ label: "🏪 Seller account banao", href: "seller.html" }, C.stores],
    };
  }
  function storesAnswer() {
    const st = activeStores();
    if (!st.length) return { html: "Abhi koi Brand Store live nahi hai. Seller ho? Premium plan me apna store bana sakte ho 🏬", chips: [C.sell] };
    return {
      html: `🏬 Zzapkart Brand Stores — brands ki apni dukaan:`,
      chips: st.slice(0, 8).map((s) => ({ label: s.name, href: storeUrl(s.slug) })),
    };
  }
  function pincodeAnswer(pin) {
    const zone = { 1: "Delhi / Haryana / Punjab / HP / J&K", 2: "Uttar Pradesh / Uttarakhand", 3: "Rajasthan / Gujarat", 4: "Maharashtra / MP / Chhattisgarh / Goa", 5: "Andhra / Telangana / Karnataka", 6: "Tamil Nadu / Kerala", 7: "West Bengal / Odisha / North-East", 8: "Bihar / Jharkhand" }[pin[0]];
    if (!zone) return { html: `${esc(pin)} sahi Indian pincode nahi lag raha. 6 digit ka pincode likhiye, jaise 110001.`, chips: [C.delivery] };
    const d = new Date(Date.now() + (2 + DELIVERY_OPTIONS.standard.days) * DAY).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    return {
      html: `✅ Haan! Pincode <strong>${esc(pin)}</strong> (${esc(zone)}) par delivery hoti hai.<br>• Standard: aaj order karein to ~<strong>${d}</strong> tak<br>• Express (${money(DELIVERY_OPTIONS.express.charge)}): 1–2 din jaldi<br>• 💵 Cash on Delivery available`,
      chips: [C.deals, C.pay],
    };
  }
  function productInfo(id) {
    const p = PRODUCTS.find((x) => String(x.id) === String(id));
    if (!p) return null;
    const off = discount(p);
    const sizes = p.hasSizes ? p.variants.filter((v) => v.stock > 0).map((v) => esc(v.size)) : [];
    const ship = new Date(Date.now() + ((p.sla || 2) + 2) * DAY).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    return {
      html: `<strong>${esc(p.name)}</strong><br>💰 ${money(p.price)}${off ? ` <span class="zc-muted">(${off}% off · MRP ${money(p.mrp)})</span>` : ""}<br>${inStock(p) ? (p.stock !== undefined && p.stock <= 5 ? `⚠️ Sirf ${p.stock} bache hain` : "✅ In stock") : "❌ Abhi out of stock"}${p.hasSizes ? `<br>📏 Sizes available: ${sizes.join(", ") || "—"}` : ""}<br>🚚 Delivery by <strong>${ship}</strong> · ${money(FREE_DELIVERY_MIN)}+ par FREE<br>🏪 Sold by ${esc(p.sellerName || "Zzapkart")}${p.storeSlug ? ` · <a href="${storeUrl(p.storeSlug)}">Store dekho</a>` : ""}${p.video ? "<br>🎬 Is product ka video bhi hai — photos ke saath dekhiye" : ""}`,
      chips: [C.returns, C.pay, C.human],
    };
  }

  function addFromChat(id) {
    const p = PRODUCTS.find((x) => String(x.id) === String(id));
    if (!p) return;
    if (p.hasSizes) { location.href = productUrl(p); return; }
    const key = p.variants && p.variants.length === 1 ? cartKey(p.id, p.variants[0].id) : String(p.id);
    const item = resolveCartItem(key, 0);
    const inCart = getCart()[key] || 0;
    if (!item || inCart >= item.maxStock) {
      bot(`Sorry, <strong>${esc(p.name)}</strong> ke sirf ${item ? item.maxStock : 0} piece stock me hain — sab aapke cart me hain.`, [C.cart]);
      return;
    }
    addToCart(key);
    trackCartAdd(p.id);
    showToast(`${p.name} cart mein add ho gaya ✓`);
    bot(`✅ <strong>${esc(p.name)}</strong> cart me add ho gaya. Cart me ab ${cartCount()} item(s).`, [{ label: "✅ Checkout", href: "checkout.html" }, { label: "🛒 Cart kholo", href: "cart.html" }, C.deals]);
  }

  // ---------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------
  const root = document.createElement("div");
  root.id = "zc-root";
  root.innerHTML = `
    <button type="button" class="zc-fab" id="zc-fab" aria-label="Help chat kholo" aria-expanded="false" aria-controls="zc-panel">
      <span class="zc-fab-ico" aria-hidden="true">💬</span><span class="zc-fab-label">Help</span>
      <span class="zc-badge hidden" id="zc-badge" aria-label="Naye reply"></span>
    </button>
    <section class="zc-panel" id="zc-panel" role="dialog" aria-label="Zzapkart Assistant chat" hidden>
      <header class="zc-head">
        <span class="zc-ava" aria-hidden="true">🤖</span>
        <div class="zc-title"><strong>Zzapkart Assistant</strong><small><i class="zc-dot" aria-hidden="true"></i> Online · turant jawab</small></div>
        <button type="button" class="zc-icon" data-zc="restart" title="Nayi chat" aria-label="Nayi chat shuru karo">↺</button>
        <button type="button" class="zc-icon" data-zc="close" title="Band karo" aria-label="Chat band karo">✕</button>
      </header>
      <div class="zc-log" id="zc-log" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div class="zc-chips" id="zc-chips"></div>
      <form class="zc-form" id="zc-form" autocomplete="off">
        <input id="zc-input" type="text" maxlength="500" placeholder="Apna sawaal likhiye…" aria-label="Apna message likhiye" enterkeyhint="send" />
        <button type="submit" class="zc-send" aria-label="Message bhejo"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5Z" fill="currentColor"/></svg></button>
      </form>
    </section>`;
  document.body.appendChild(root);
  const fab = root.querySelector("#zc-fab");
  const panel = root.querySelector("#zc-panel");
  const logEl = root.querySelector("#zc-log");
  const chipsEl = root.querySelector("#zc-chips");
  const input = root.querySelector("#zc-input");
  const badgeEl = root.querySelector("#zc-badge");
  document.body.classList.add("has-zc");

  const isOpen = () => !panel.hidden;
  function msgHtml(m) {
    if (m.from === "user") return `<div class="zc-msg user"><div class="zc-bubble">${esc(m.text)}</div></div>`;
    const ava = m.from === "support" ? "🧑‍💼" : "🤖";
    return `<div class="zc-msg bot ${m.from === "support" ? "support" : ""}"><span class="zc-ava-s" aria-hidden="true">${ava}</span><div class="zc-bubble">${m.html}</div></div>`;
  }
  function chipHtml(ch) {
    return ch.href
      ? `<a class="zc-chip" href="${esc(ch.href)}">${esc(ch.label)}</a>`
      : `<button type="button" class="zc-chip" data-zc-q="${esc(ch.q)}">${esc(ch.label)}</button>`;
  }
  function renderChips() {
    const last = S.msgs[S.msgs.length - 1];
    let chips = last && last.from !== "user" ? last.chips || [] : [];
    // Product page par "is product ke baare me" hamesha haath me rahe (flow ke beech nahi)
    if (pdpProduct && !S.flow && last && last.from !== "user" && !chips.some((c) => String(c.q || "").startsWith("__product:"))) {
      chips = [{ label: "📦 Is product ke baare me", q: "__product:" + pdpProduct.id }, ...chips];
    }
    chipsEl.innerHTML = chips.map(chipHtml).join("");
    chipsEl.classList.toggle("hidden", !chips.length);
  }
  function scrollEnd() { logEl.scrollTop = logEl.scrollHeight; }
  function renderAll() {
    logEl.innerHTML = S.msgs.map(msgHtml).join("");
    renderChips();
    scrollEnd();
  }
  function push(m) {
    S.msgs.push({ ...m, at: Date.now() });
    if (S.msgs.length > MAX_LOG) S.msgs = S.msgs.slice(-MAX_LOG);
    save();
    if (isOpen()) {
      logEl.insertAdjacentHTML("beforeend", msgHtml(m));
      renderChips();
      scrollEnd();
    }
  }
  function bot(html, chips) { push({ from: "bot", html, chips: chips || [] }); }

  let typingEl = null;
  function typing(on) {
    if (on && !typingEl) {
      logEl.insertAdjacentHTML("beforeend", `<div class="zc-msg bot zc-typing"><span class="zc-ava-s" aria-hidden="true">🤖</span><div class="zc-bubble" aria-label="Assistant likh raha hai"><i></i><i></i><i></i></div></div>`);
      typingEl = logEl.lastElementChild;
      scrollEnd();
    } else if (!on && typingEl) { typingEl.remove(); typingEl = null; }
  }
  let pending = 0;
  function send(q, shown) {
    q = String(q || "").trim().slice(0, 500);
    if (!q) return;
    push({ from: "user", text: shown || q });
    pending++;
    typing(true);
    setTimeout(() => {
      pending--;
      if (!pending) typing(false);
      let r;
      try { r = reply(q); } catch (e) { console.error(e); r = { html: "Oops, kuch gadbad ho gayi 🙏 Dobara try karein ya Talk to support.", chips: [C.human] }; }
      bot(r.html, r.chips);
    }, 300 + Math.min(500, q.length * 6));
  }

  function setBadge(n) {
    badgeEl.textContent = n > 9 ? "9+" : String(n);
    badgeEl.classList.toggle("hidden", !n);
    fab.setAttribute("aria-label", n ? `Help chat kholo — ${n} naya reply` : "Help chat kholo");
  }
  // Support team ka reply aaya? Chat khuli ho to dikhao, warna badge
  function checkReplies() {
    let unread;
    try { unread = myTickets().filter((t) => t.unreadCustomer > 0); } catch { return; }
    if (!isOpen()) { setBadge(unread.reduce((n, t) => n + t.unreadCustomer, 0)); return; }
    unread.forEach((t) => {
      t.messages.filter((m) => m.from === "admin").slice(-t.unreadCustomer).forEach((m) => {
        push({
          from: "support",
          html: `<strong>Zzapkart Support</strong> <span class="zc-muted">· request #${esc(t.id)}</span><br>${esc(m.text).replace(/\n/g, "<br>")}`,
          chips: t.status === "open" ? [{ label: "↩ Reply karo", q: "__reply:" + t.id }, C.tickets] : [C.tickets, ...MENU.slice(0, 2)],
        });
      });
      updateTicket(t.id, (x) => { x.unreadCustomer = 0; });
    });
    setBadge(0);
  }

  function openChat() {
    panel.hidden = false;
    root.classList.add("open");
    fab.setAttribute("aria-expanded", "true");
    document.body.classList.add("zc-open");
    if (!S.msgs.length) { const w = welcome(); S.msgs.push({ from: "bot", html: w.html, chips: w.chips, at: Date.now() }); save(); }
    renderAll();
    checkReplies();
    if (!matchMedia("(hover: none)").matches) input.focus();
  }
  function closeChat() {
    panel.hidden = true;
    root.classList.remove("open");
    fab.setAttribute("aria-expanded", "false");
    document.body.classList.remove("zc-open");
    typing(false);
    fab.focus();
  }

  fab.addEventListener("click", () => (isOpen() ? closeChat() : openChat()));
  root.querySelector("#zc-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    send(v);
  });
  panel.addEventListener("click", (e) => {
    const t = e.target;
    const act = t.closest("[data-zc]");
    if (act && act.dataset.zc === "close") return closeChat();
    if (act && act.dataset.zc === "restart") {
      S = { msgs: [], flow: null };
      save();
      const w = welcome();
      S.msgs.push({ from: "bot", html: w.html, chips: w.chips, at: Date.now() });
      save();
      renderAll();
      input.focus();
      return;
    }
    const chip = t.closest("[data-zc-q]");
    if (chip) {
      const q = chip.dataset.zcQ;
      send(q, chip.textContent.trim());
      return;
    }
    const add = t.closest("[data-zc-add]");
    if (add) { addFromChat(add.dataset.zcAdd); return; }
  });
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); closeChat(); } });
  window.addEventListener("storage", (e) => {
    if (e.key === DB.tickets) checkReplies();
    if (e.key === DB.chat && !isOpen()) S = load();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkReplies(); });
  checkReplies();

  // Doosre scripts / links se chat kholne ke liye: <a href="#help-chat"> ya ?chat=1
  if (location.hash === "#help-chat" || new URLSearchParams(location.search).get("chat") === "1") openChat();
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href="#help-chat"]');
    if (a) { e.preventDefault(); openChat(); }
  });
})();
