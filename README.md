# BQ Realty · Bill Qin PM Team — Website

## Files / 文件
| File | What it is |
|---|---|
| `index.html` | Home page 主页 |
| `tenants.html` | Tenant Center 租客页 |
| `owners.html` | Owner Requests 屋主页 |
| `assets/js/config.js` | **Settings 设置** — paste the Google Apps Script URL here |
| `assets/img/hero.jpg` | Home page big photo 首页大图 (optional; add a royalty-free photo) |
| `listings/` | One folder per rental 每套房源一个文件夹 |

## Add a new listing / 新房源上架
1. Copy `listings/_template/` → rename with a code, e.g. `listings/sj-001/` (no address in the name 不要用地址命名)
2. Put inside: `index.html` (your listing page), `listing.json`, `cover.jpg` (compressed, ~300 KB)
3. Edit `listing.json` → `"status": "available"`
4. Upload. The home page shows it in 1–3 minutes. 上传后 1–3 分钟主页自动显示。

## When a home is leased / 房子租出后
1. In `listing.json`: `"status": "leased"`, `"days_to_lease": 8`, `"leased_date": "2026-10"`
2. Delete `index.html` and the interior photos — keep only `listing.json` + `cover.jpg`
3. The home moves to "Recently Leased" — no address, no link. 自动移到"已租案例"，不显示地址、不能点进。

Other status: `"hidden"` = not shown. Delete the folder to remove completely.

> Folders that start with `_` (like `_template`) are never shown.
> The home page finds listing folders automatically on GitHub Pages. If that ever fails, list folder names in `listings/index.json`, e.g. `["sj-001","sc-002"]`.

## Form submissions / 表单
Website → Google Apps Script → Google Sheet "BQ PM Requests" + Drive folder "BQ PM Uploads" + email to pm.bqrealty@gmail.com.
Reply to the notification email to answer the tenant/owner directly. Update the **Status** column in the Sheet.

## Past leased homes (many at once) / 历史已租房源
Edit one file: `listings/leased.json` — one line per home. No folder or photo needed.
```json
[
  { "city": "San Jose", "type": "Single Family", "beds": 4, "baths": 2, "days_to_lease": 8, "leased_date": "2026-09" },
  { "city": "Milpitas", "type": "Townhouse", "beds": 3, "baths": 2.5, "days_to_lease": 11, "leased_date": "2026-08" }
]
```
Never put an address here. 不要填地址。Newest homes show first.
