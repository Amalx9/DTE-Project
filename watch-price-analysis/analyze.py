"""Seiko vs Citizen: Yodobashi Camera (Japan) vs Jamtangan.com (Indonesia).
Data collected 2026-11-01. See README.md for sources and assumptions."""
import json, csv

IDR_PER_JPY = 115.13      # open.er-api.com, 2026-11-01 00:02 UTC (USD=18,131.95 IDR / 157.495 JPY)
IDR_PER_USD = 18131.95
JP_CT = 0.10              # Japan consumption tax, refunded to non-residents on departure
ID_ALLOW_USD = 500        # PMK 34/2025 passenger allowance (FOB, per person)
ID_DUTY, ID_VAT = 0.10, 0.11   # flat duty on excess; PPN 12% x DPP 11/12 = 11% effective
ID_PPH_WORST = 0.10            # import income tax; applicability to passenger goods disputed

# (brand, model, Jamtangan ref, Jamtangan IDR, Jamtangan "orig" IDR, Japan ref, Yodobashi JPY, Yodo points, JP MSRP JPY, note)
jt = {x['slug']: x for x in json.load(open('data_jamtangan_raw.json'))}
def J(key):
    m = [x for s, x in jt.items() if key in s]
    return m[0]['price'], m[0]['orig']
rows = [
 ("Seiko",  "5 Sports SKX black (auto)",       "SRPD55K1", *J("srpd55k1"), "SBSA005", 36080, 3608, 45100, "same watch, JDM ref"),
 ("Seiko",  "5 Sports SKX blue (auto)",        "SRPD51K1", *J("srpd51k1"), "SBSA001", 36080, 3608, 45100, "same watch, JDM ref"),
 ("Seiko",  "5 Sports SKX GMT 'Batman'",      "SSK003K1", *J("ssk003k1"), "SBSC003", 55440, 5544, 69300, "same watch, JDM ref"),
 ("Citizen","Promaster Wave Tracker (rubber)", "JV3000-13E", *J("jv300013e"), "JV3000-13E", 88550, 8855, 126500, "identical ref"),
 ("Citizen","Promaster Wave Tracker (steel)",  "JV3001-53E", *J("jv300153e"), "JV3001-53E", 96250, 9625, 137500, "identical ref"),
 ("Citizen","Tsuyosa automatic",               "NJ0150-56A", *J("nj015056a"), "NJ0150-56W", 46200, 4620, 66000, "same family, JDM dial variant"),
]
# Street-price only (Yodobashi not listing on kakaku today) - lowest Japanese retail price
street = [
 ("Seiko",  "5 Sports SKX Pepsi",             "SRPD53K1", *J("srpd53k1"), "SBSA003", 33060, 45100, "kakaku lowest"),
 ("Seiko",  "5 Sports SKX GMT black",         "SSK001K1", *J("ssk001k1"), "SBSC001", 55440, 69300, "kakaku lowest (Yamada)"),
 ("Citizen","Attesa ACT Line black Ti",       "AT8294-59E", *J("at829459e"), "AT8294-59E", 143300, 220000, "kakaku lowest"),
 ("Citizen","Attesa ACT Line Ti",             "AT8295-56E", *J("at829556e"), "AT8295-56E", 125880, 198000, "kakaku lowest"),
 ("Citizen","Zenshin (overseas model in JP)", "NJ0180-80A", *J("nj018080a"), "NJ0180-80A", 73400, None, "grey import; not official JDM"),
 ("Citizen","Promaster mech. diver 200m",     "NB6004-08E", *J("nb600408e"), "NB6004-08E", 132000, 120000, "grey import in JP"),
]

def landed(jpy):
    taxfree = jpy / (1 + JP_CT)                 # 10/110 refunded
    idr = taxfree * IDR_PER_JPY
    excess_usd = max(0, taxfree * IDR_PER_JPY / IDR_PER_USD - ID_ALLOW_USD)
    excess_idr = excess_usd * IDR_PER_USD
    base = excess_idr * (ID_DUTY + (1 + ID_DUTY) * ID_VAT)
    worst = excess_idr * (ID_DUTY + (1 + ID_DUTY) * (ID_VAT + ID_PPH_WORST))
    return taxfree, idr, base, worst

out = []
for kind, data in (("Yodobashi", rows), ("JP street", street)):
    for r in data:
        brand, model, jref, jidr, jorig, jpref, jpy = r[:7]
        msrp = r[8] if kind == "Yodobashi" else r[7]
        pts = r[7] if kind == "Yodobashi" else 0
        tf, idr, b, w = landed(jpy)
        out.append(dict(source=kind, brand=brand, model=model, jamtangan_ref=jref, jamtangan_idr=jidr,
            jamtangan_strike_idr=jorig or None, japan_ref=jpref, japan_price_jpy=jpy, japan_msrp_jpy=msrp,
            japan_disc_vs_msrp=round(1 - jpy / msrp, 3) if msrp else None, yodobashi_points=pts,
            japan_price_idr_incl_tax=round(jpy * IDR_PER_JPY), japan_taxfree_jpy=round(tf),
            japan_taxfree_idr=round(idr), id_import_tax_alone_idr=round(b), id_import_tax_worst_idr=round(w),
            saving_pct_alone=round(1 - (idr + b) / jidr, 3), saving_pct_within_allowance=round(1 - idr / jidr, 3),
            saving_pct_worst=round(1 - (idr + w) / jidr, 3)))

with open('results.csv', 'w', newline='') as f:
    wr = csv.DictWriter(f, fieldnames=out[0].keys()); wr.writeheader(); wr.writerows(out)
json.dump(out, open('results.json', 'w'), indent=1, ensure_ascii=False)
fmt = lambda n: f"{n/1e6:,.2f}M"
print(f"{'src':10}{'brand':8}{'model':34}{'JT IDR':>9}{'JP ¥':>9}{'JP→IDR tf':>11}{'+duty':>8}{'save(≤$500)':>12}{'save(alone)':>12}")
for o in out:
    print(f"{o['source']:10}{o['brand']:8}{o['model'][:33]:34}{fmt(o['jamtangan_idr']):>9}{o['japan_price_jpy']:>9,}{fmt(o['japan_taxfree_idr']):>11}{fmt(o['id_import_tax_alone_idr']):>8}{o['saving_pct_within_allowance']:>12.0%}{o['saving_pct_alone']:>12.0%}")
for b in ("Seiko", "Citizen"):
    s = [o for o in out if o['brand'] == b]
    print(b, "avg saving within allowance", f"{sum(o['saving_pct_within_allowance'] for o in s)/len(s):.0%}",
          "| avg Jamtangan discount vs its strike price", f"{sum(1-o['jamtangan_idr']/o['jamtangan_strike_idr'] for o in s if o['jamtangan_strike_idr'])/len(s):.0%}")
