// Buyer "My Orders": har order ke shipments ka status + notifications
const STEPS = ["Placed", "Shipped", "Delivered"];
const PAY = { cod: "Cash on Delivery", upi: "UPI", card: "Card" };

function sellerLabel(sellerId) {
  if (sellerId === PLATFORM_SELLER) return "Zzapkart";
  const s = getSeller(sellerId);
  return s ? s.shopName : "Seller";
}

function timeline(sh) {
  const reached = STEPS.indexOf(sh.status);
  return `<ol class="track">${STEPS.map((st, i) => {
    const h = sh.history.find((x) => x.status === st);
    return `<li class="${i <= reached ? "done" : ""}"><span>${st}</span>${h ? `<small>${fmtDateTime(h.at)}</small>` : ""}</li>`;
  }).join("")}</ol>`;
}

function render() {
  const orders = getOrders();
  const notifs = dbGet(DB.buyerNotifs, []);

  document.getElementById("buyer-notifs-panel").classList.toggle("hidden", notifs.length === 0);
  document.getElementById("buyer-notifs").innerHTML = notifs.slice(0, 8).map((n) => `
    <div class="notif ${n.read ? "" : "unread"}">
      <div>${esc(n.message)}</div>
      <small class="muted">#${esc(n.orderId)} · ${fmtDateTime(n.at)}</small>
    </div>`).join("");
  dbSet(DB.buyerNotifs, notifs.map((n) => ({ ...n, read: true })));

  document.getElementById("orders-empty").classList.toggle("hidden", orders.length > 0);
  document.getElementById("orders-list").innerHTML = orders.map((o) => `
    <section class="panel order-card">
      <div class="order-head">
        <div>
          <strong>Order #${esc(o.id)}</strong>
          <div class="muted">${fmtDateTime(o.createdAt)} · ${PAY[o.payment] || esc(o.payment)} · ${esc(DELIVERY_OPTIONS[o.delivery]?.label || "")}</div>
        </div>
        <div class="order-total">${formatPrice(o.total)}</div>
      </div>
      ${o.shipments.map((sh) => `
        <div class="shipment">
          <div class="shipment-head">
            <span>Sold by <strong>${esc(sellerLabel(sh.sellerId))}</strong></span>
            <span class="status-pill s-${sh.status.toLowerCase()}">${sh.status}</span>
          </div>
          ${sh.items.map((it) => `
            <div class="mini-row">
              <div class="mini-img" style="background:#f3eefc">${safeImg(it.image) ? `<img src="${safeImg(it.image)}" alt="" />` : esc(it.emoji || "📦")}</div>
              <div class="mini-info"><div>${esc(it.name)}</div><div class="muted">${it.size ? `Size: ${esc(it.size)} · ` : ""}Qty: ${it.qty}</div></div>
              <div class="mini-price">${formatPrice(it.price * it.qty)}</div>
            </div>`).join("")}
          ${timeline(sh)}
          ${sh.trackingId ? `<p class="muted">Tracking ID: <strong>${esc(sh.trackingId)}</strong>${sh.courier ? " · " + esc(sh.courier) : ""}</p>` : ""}
        </div>`).join("")}
      <p class="muted">Delivering to: ${esc(o.buyer.name)}, ${esc(o.buyer.city)} – ${esc(o.buyer.pincode)}</p>
    </section>`).join("");
}

render();
