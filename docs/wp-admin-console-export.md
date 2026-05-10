# WordPress Admin Console Export

Use this when you only have WordPress admin login access and cannot install plugins or access the server.

## Steps

1. Log in to WordPress admin.
2. Open the users page:

```text
https://k-link.cc/wp-admin/users.php?role=wetw_ai_vip
```

3. Open browser DevTools.
4. Go to Console.
5. Paste the script below.
6. Press Enter.

The script reads the user list pages and user edit pages with your existing WordPress login session. It looks for LINE UID values such as:

```text
U012e2380deb2d5815f6b6bda6bef35a6
```

Then it posts the result to KlinkPoint:

```text
POST https://klinkpoint.fangwl591021.workers.dev/api/wp-users/import
```

## Script

```js
(async () => {
  const KLINKPOINT_IMPORT_URL = "https://klinkpoint.fangwl591021.workers.dev/api/wp-users/import";
  const ROLE = "wetw_ai_vip";
  const MAX_PAGES = 50;
  const UID_RE = /U[a-fA-F0-9]{32}/g;
  const parser = new DOMParser();
  const users = new Map();

  async function fetchDoc(url) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
    const html = await res.text();
    return parser.parseFromString(html, "text/html");
  }

  function textOf(doc, selector) {
    return doc.querySelector(selector)?.textContent?.trim() || "";
  }

  function collectUserLinks(doc) {
    return [...doc.querySelectorAll('a[href*="user-edit.php?user_id="]')]
      .map((a) => new URL(a.href, location.origin))
      .filter((url) => url.searchParams.get("user_id"));
  }

  for (let page = 1; page <= MAX_PAGES; page++) {
    const listUrl = new URL("/wp-admin/users.php", location.origin);
    listUrl.searchParams.set("role", ROLE);
    listUrl.searchParams.set("paged", String(page));
    const doc = await fetchDoc(listUrl.href);
    const links = collectUserLinks(doc);
    console.log(`Page ${page}: ${links.length} user links`);
    if (!links.length) break;

    for (const url of links) {
      const wpUserId = Number(url.searchParams.get("user_id"));
      if (!wpUserId || users.has(wpUserId)) continue;

      const editDoc = await fetchDoc(url.href);
      const bodyText = editDoc.body?.innerText || "";
      const html = editDoc.documentElement?.innerHTML || "";
      const uid = [...new Set([...(bodyText.match(UID_RE) || []), ...(html.match(UID_RE) || [])])][0];
      if (!uid) {
        console.log(`No LINE UID found for user ${wpUserId}`);
        continue;
      }

      users.set(wpUserId, {
        wp_user_id: wpUserId,
        user_login: document.querySelector(`#user-${wpUserId} .username`)?.textContent?.trim(),
        display_name: textOf(editDoc, "#display_name") || textOf(editDoc, "#nickname"),
        email: editDoc.querySelector("#email")?.value || "",
        line_user_id: uid
      });

      console.log(`Found user ${wpUserId}: ${uid}`);
    }
  }

  const payload = {
    source: location.host,
    users: [...users.values()]
  };

  console.log("Importing to KlinkPoint", payload);
  const importRes = await fetch(KLINKPOINT_IMPORT_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await importRes.json();
  console.log("KlinkPoint import result", result);
})();
```

## Notes

- This does not install anything on WordPress.
- It uses your current admin login session in the browser.
- It does not read passwords.
- If the browser blocks the final POST because of a security policy, copy the printed `payload` from the console and send it with another tool.
