export function html(content: string, status = 200): Response {
  return new Response(content, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  });
}

export function renderApp(): string {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KlinkPoint</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8f4;
      --ink: #1f2933;
      --muted: #64707d;
      --line: #d9ded6;
      --panel: #ffffff;
      --accent: #116466;
      --accent-strong: #0b4f51;
      --warn: #9a3412;
      --ok: #166534;
      --soft: #e7f1ee;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--ink);
      font-family: Arial, "Noto Sans TC", sans-serif;
      letter-spacing: 0;
    }
    header {
      border-bottom: 1px solid var(--line);
      background: #ffffff;
    }
    .bar {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      min-height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .mark {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      font-weight: 700;
    }
    h1 {
      margin: 0;
      font-size: 20px;
      line-height: 1.2;
    }
    .status {
      color: var(--muted);
      font-size: 13px;
      white-space: nowrap;
    }
    main {
      width: min(1180px, calc(100% - 32px));
      margin: 24px auto 48px;
      display: grid;
      grid-template-columns: 360px minmax(0, 1fr);
      gap: 18px;
    }
    section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
    }
    h2 {
      margin: 0 0 14px;
      font-size: 16px;
    }
    label {
      display: block;
      margin: 12px 0 6px;
      color: var(--muted);
      font-size: 13px;
    }
    input, select {
      width: 100%;
      min-height: 38px;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--ink);
      font-size: 14px;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    button {
      min-height: 38px;
      border: 0;
      border-radius: 6px;
      padding: 8px 12px;
      background: var(--accent);
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    }
    button.secondary {
      background: var(--soft);
      color: var(--accent-strong);
      border: 1px solid #c8ddd7;
    }
    button:disabled {
      opacity: .55;
      cursor: wait;
    }
    .stack {
      display: grid;
      gap: 14px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      background: #fbfcfa;
      min-height: 82px;
    }
    .metric .name {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 8px;
    }
    .metric .value {
      font-size: 26px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .message {
      min-height: 38px;
      padding: 10px 12px;
      border-radius: 6px;
      background: #eef2f7;
      color: var(--muted);
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .message.ok { background: #e8f5ec; color: var(--ok); }
    .message.warn { background: #fff1e8; color: var(--warn); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 10px 8px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-weight: 600;
      background: #fbfcfa;
    }
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .empty {
      color: var(--muted);
      padding: 16px;
    }
    @media (max-width: 860px) {
      main { grid-template-columns: 1fr; }
      .summary { grid-template-columns: 1fr; }
      .bar { align-items: flex-start; flex-direction: column; padding: 16px 0; }
      .status { white-space: normal; }
    }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <div class="brand">
        <div class="mark">KP</div>
        <div>
          <h1>KlinkPoint</h1>
          <div class="status">雙 LINEOA 點數整併工具</div>
        </div>
      </div>
      <div class="status" id="serviceStatus">Worker ready</div>
    </div>
  </header>

  <main>
    <div class="stack">
      <section>
        <h2>會員</h2>
        <label for="memberId">Member ID</label>
        <input id="memberId" inputmode="numeric" placeholder="建立後自動填入，或手動輸入">
        <div class="row">
          <div>
            <label for="displayName">名稱</label>
            <input id="displayName" placeholder="例：王小明">
          </div>
          <div>
            <label for="phone">手機</label>
            <input id="phone" placeholder="0912345678">
          </div>
        </div>
        <label for="email">Email</label>
        <input id="email" placeholder="user@example.com">
        <div class="actions">
          <button id="createMember">建立會員</button>
          <button class="secondary" id="loadSummary">查詢點數</button>
        </div>
      </section>

      <section>
        <h2>批次同步</h2>
        <div class="row">
          <div>
            <label for="syncProvider">Provider</label>
            <select id="syncProvider">
              <option value="oa1">OA1</option>
              <option value="oa2">OA2</option>
            </select>
          </div>
          <div>
            <label for="syncPages">頁數上限</label>
            <input id="syncPages" inputmode="numeric" value="50">
          </div>
        </div>
        <div class="actions">
          <button id="syncProviderButton">同步點數</button>
          <button class="secondary" id="searchAccounts">搜尋帳號</button>
        </div>
      </section>

      <section>
        <h2>LINEOA 綁定</h2>
        <div class="row">
          <div>
            <label for="linkProvider">Provider</label>
            <select id="linkProvider">
              <option value="oa1">OA1</option>
              <option value="oa2">OA2</option>
            </select>
          </div>
          <div>
            <label for="shopId">Shop ID</label>
            <input id="shopId" inputmode="numeric" placeholder="空白使用預設">
          </div>
        </div>
        <label for="lineUserId">LINE User ID</label>
        <input id="lineUserId" placeholder="Uxxxxxxxxxxxxxxxx">
        <div class="actions">
          <button id="linkAccount">綁定</button>
        </div>
      </section>

      <section>
        <h2>操作</h2>
        <div class="row">
          <div>
            <label for="actionProvider">Provider</label>
            <select id="actionProvider">
              <option value="oa1">OA1</option>
              <option value="oa2">OA2</option>
            </select>
          </div>
          <div>
            <label for="pointType">Point Type</label>
            <input id="pointType" value="system_point">
          </div>
        </div>
        <label for="points">點數</label>
        <input id="points" inputmode="decimal" value="10">
        <label for="businessKey">核銷單號</label>
        <input id="businessKey" placeholder="例：order-001">
        <div class="actions">
          <button id="checkin">簽到</button>
          <button class="secondary" id="redeem">核銷</button>
        </div>
      </section>
    </div>

    <div class="stack">
      <section>
        <h2>同步帳號</h2>
        <div class="row">
          <div>
            <label for="accountProvider">Provider</label>
            <select id="accountProvider">
              <option value="">全部</option>
              <option value="oa1">OA1</option>
              <option value="oa2">OA2</option>
            </select>
          </div>
          <div>
            <label for="accountSearch">搜尋</label>
            <input id="accountSearch" placeholder="LINE_user_id 或 user_id">
          </div>
        </div>
        <div class="row">
          <div>
            <label for="mergeOa1">OA1 LINE User ID</label>
            <input id="mergeOa1" placeholder="從下方帳號選取">
          </div>
          <div>
            <label for="mergeOa2">OA2 LINE User ID</label>
            <input id="mergeOa2" placeholder="從下方帳號選取">
          </div>
        </div>
        <div class="actions">
          <button id="mergeAccounts">合併成會員</button>
        </div>
        <div class="table-wrap" id="accounts"></div>
      </section>

      <section>
        <h2>整併餘額</h2>
        <div class="summary" id="summary"></div>
        <div class="message" id="message">等待操作</div>
      </section>

      <section>
        <h2>點數明細</h2>
        <div class="table-wrap" id="history"></div>
      </section>
    </div>
  </main>

  <script>
    const $ = (id) => document.getElementById(id);
    const state = { busy: false };

    function getMemberId() {
      const value = Number($("memberId").value);
      if (!Number.isFinite(value) || value <= 0) throw new Error("請先建立或輸入 Member ID");
      return value;
    }

    function setMessage(text, type = "") {
      const el = $("message");
      el.textContent = text;
      el.className = "message" + (type ? " " + type : "");
    }

    function setBusy(busy) {
      state.busy = busy;
      document.querySelectorAll("button").forEach((button) => button.disabled = busy);
    }

    async function api(path, options = {}) {
      const response = await fetch(path, {
        headers: { "content-type": "application/json", ...(options.headers || {}) },
        ...options
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "API request failed");
      }
      return data;
    }

    async function run(task) {
      if (state.busy) return;
      setBusy(true);
      try {
        await task();
      } catch (error) {
        setMessage(error.message || String(error), "warn");
      } finally {
        setBusy(false);
      }
    }

    function renderSummary(total) {
      const entries = Object.entries(total || {});
      $("summary").innerHTML = entries.length
        ? entries.map(([name, value]) => '<div class="metric"><div class="name">' + escapeHtml(name) + '</div><div class="value">' + escapeHtml(String(value)) + '</div></div>').join("")
        : '<div class="metric"><div class="name">尚無資料</div><div class="value">0</div></div>';
    }

    function renderHistory(providers) {
      const rows = [];
      for (const provider of providers || []) {
        for (const item of provider.list || []) {
          rows.push({ provider: provider.provider_key, ...item });
        }
      }
      rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

      if (!rows.length) {
        $("history").innerHTML = '<div class="empty">尚無點數明細</div>';
        return;
      }

      $("history").innerHTML = '<table><thead><tr><th>時間</th><th>OA</th><th>類型</th><th>異動</th><th>餘額</th><th>事件</th></tr></thead><tbody>' +
        rows.slice(0, 80).map((row) => '<tr><td>' + escapeHtml(row.created_at || "") + '</td><td>' + escapeHtml(row.provider || "") + '</td><td>' + escapeHtml(row.point_type || "") + '</td><td>' + escapeHtml(row.get_point || "") + '</td><td>' + escapeHtml(row.point_balance || "") + '</td><td>' + escapeHtml(row.event_name || "") + '</td></tr>').join("") +
        '</tbody></table>';
    }

    function renderAccounts(accounts) {
      if (!accounts || !accounts.length) {
        $("accounts").innerHTML = '<div class="empty">尚無同步帳號</div>';
        return;
      }

      $("accounts").innerHTML = '<table><thead><tr><th>OA</th><th>LINE User ID</th><th>WP user_id</th><th>餘額</th><th>會員</th><th></th></tr></thead><tbody>' +
        accounts.map((account) => {
          const balanceText = Object.entries(account.balances || {}).map(([key, value]) => key + ': ' + value).join(', ');
          const selectButton = '<button class="secondary" data-provider="' + escapeHtml(account.provider_key) + '" data-line="' + escapeHtml(account.line_user_id) + '">選取</button>';
          return '<tr><td>' + escapeHtml(account.provider_key) + '</td><td>' + escapeHtml(account.line_user_id) + '</td><td>' + escapeHtml(account.wp_user_id || '') + '</td><td>' + escapeHtml(balanceText || '{}') + '</td><td>' + escapeHtml(account.member_id || '') + '</td><td>' + selectButton + '</td></tr>';
        }).join("") +
        '</tbody></table>';

      $("accounts").querySelectorAll("button[data-provider]").forEach((button) => {
        button.addEventListener("click", () => {
          const target = button.dataset.provider === "oa1" ? "mergeOa1" : "mergeOa2";
          $(target).value = button.dataset.line || "";
          setMessage("已選取 " + button.dataset.provider + " 帳號", "ok");
        });
      });
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    async function loadSummary() {
      const memberId = getMemberId();
      const data = await api("/api/points/summary?member_id=" + encodeURIComponent(memberId));
      renderSummary(data.total);
      renderHistory(data.providers);
      setMessage("查詢完成", "ok");
    }

    async function loadAccounts() {
      const params = new URLSearchParams();
      if ($("accountProvider").value) params.set("provider_key", $("accountProvider").value);
      if ($("accountSearch").value) params.set("q", $("accountSearch").value);
      params.set("limit", "100");
      const data = await api("/api/synced/accounts?" + params.toString());
      renderAccounts(data.accounts);
      setMessage("帳號搜尋完成", "ok");
    }

    $("createMember").addEventListener("click", () => run(async () => {
      const data = await api("/api/members", {
        method: "POST",
        body: JSON.stringify({
          display_name: $("displayName").value,
          phone: $("phone").value,
          email: $("email").value
        })
      });
      $("memberId").value = data.member_id;
      setMessage("會員已建立：" + data.member_id, "ok");
    }));

    $("linkAccount").addEventListener("click", () => run(async () => {
      const payload = {
        member_id: getMemberId(),
        provider_key: $("linkProvider").value,
        LINE_user_id: $("lineUserId").value
      };
      if ($("shopId").value) payload.shop_id = Number($("shopId").value);
      await api("/api/member/link", { method: "POST", body: JSON.stringify(payload) });
      setMessage("LINEOA 綁定完成", "ok");
      await loadSummary();
    }));

    $("loadSummary").addEventListener("click", () => run(loadSummary));

    $("syncProviderButton").addEventListener("click", () => run(async () => {
      const data = await api("/api/sync/provider", {
        method: "POST",
        body: JSON.stringify({
          provider_key: $("syncProvider").value,
          max_pages: Number($("syncPages").value || 50)
        })
      });
      setMessage("同步完成：" + data.synced_entries + " 筆明細，觸及 " + data.touched_accounts + " 個帳號", "ok");
      await loadAccounts();
    }));

    $("searchAccounts").addEventListener("click", () => run(loadAccounts));

    $("mergeAccounts").addEventListener("click", () => run(async () => {
      if (!$("mergeOa1").value && !$("mergeOa2").value) {
        setMessage("請先在同步帳號列表按「選取」，或手動輸入 OA1/OA2 LINE User ID", "warn");
        return;
      }

      const data = await api("/api/synced/merge", {
        method: "POST",
        body: JSON.stringify({
          oa1_LINE_user_id: $("mergeOa1").value || undefined,
          oa2_LINE_user_id: $("mergeOa2").value || undefined
        })
      });
      $("memberId").value = data.member_id;
      setMessage("已合併成會員：" + data.member_id, "ok");
      await loadAccounts();
      await loadSummary();
    }));

    $("checkin").addEventListener("click", () => run(async () => {
      await api("/api/points/checkin", {
        method: "POST",
        body: JSON.stringify({
          member_id: getMemberId(),
          provider_key: $("actionProvider").value,
          point_type: $("pointType").value,
          points: Number($("points").value)
        })
      });
      setMessage("簽到完成", "ok");
      await loadSummary();
    }));

    $("redeem").addEventListener("click", () => run(async () => {
      await api("/api/points/redeem", {
        method: "POST",
        body: JSON.stringify({
          member_id: getMemberId(),
          provider_key: $("actionProvider").value,
          point_type: $("pointType").value,
          points: Number($("points").value),
          business_key: $("businessKey").value || undefined
        })
      });
      setMessage("核銷完成", "ok");
      await loadSummary();
    }));

    fetch("/health").then((r) => r.json()).then((data) => {
      $("serviceStatus").textContent = "OA1 " + data.providers.oa1_shop_id + " / OA2 " + data.providers.oa2_shop_id;
    }).catch(() => {
      $("serviceStatus").textContent = "Health check failed";
    });
  </script>
</body>
</html>`;
}
