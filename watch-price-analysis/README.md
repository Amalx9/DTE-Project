# Seiko vs Citizen — Yodobashi Camera (Japan) vs Jamtangan.com (Indonesia)

Snapshot taken **1 November 2026**. Run `python3 analyze.py` to regenerate `results.csv` / `results.json`.

## Bottom line

| | Buy in Japan (Yodobashi, tax-refunded) vs Jamtangan | Verdict |
|---|---|---|
| **Seiko** (5 Sports SKX, SKX GMT) | **8–19 % cheaper** in Japan | Buy in Japan — modest but consistent saving |
| **Citizen** – Promaster Wave Tracker (JV3000/JV3001) | **17–19 % cheaper** in Japan | Buy in Japan — best saving in the sample |
| **Citizen** – Tsuyosa, Attesa, Zenshin, NB6004 diver | **8–28 % _more expensive_** in Japan | Buy at Jamtangan |

* **Seiko is the safer "buy in Japan" brand.** The JDM twins of the popular Seiko 5 Sports models (SBSA00x, SBSC00x) are 8–19 % cheaper at Yodobashi after the tax refund.
* **Citizen depends on the model.** Jamtangan discounts Citizen hard: on average 29 % off its strike-through price, against 15 % for Seiko. That wipes out Japan's advantage on most Citizen models. Only JDM-launched Promaster models were clearly cheaper in Japan.
* **Some Citizen models aren't official JDM.** International models like Zenshin (NJ0180) and the NB6004-08E diver are grey imports in Japan, so they cost much more there. Yodobashi also won't carry them through official channels.
* **Yodobashi points (≈10 %, often 8 % when paying by card) are a bonus on top**, but only if you spend them in Japan on the same trip. The savings above exclude them.

## Results

Japan price = Yodobashi price where Yodobashi is listed on kakaku.com today. Otherwise it is the lowest Japanese retail price on kakaku.com (marked *street*).
"Tax-free" = price ÷ 1.10, the 10 % consumption tax refunded to non-residents.

| Brand | Model | Jamtangan ref / IDR | Japan ref / ¥ (source) | Japan tax-free → IDR | ID import tax* | Saving vs Jamtangan |
|---|---|---|---|---|---|---|
| Seiko | 5 Sports SKX black | SRPD55K1 / 4,250,000 | SBSA005 / 36,080 (Yodobashi, MSRP 45,100) | 3,776,000 | 0 | **11 %** |
| Seiko | 5 Sports SKX blue | SRPD51K1 / 4,250,000 | SBSA001 / 36,080 (Yodobashi) | 3,776,000 | 0 | **11 %** |
| Seiko | 5 Sports SKX Pepsi | SRPD53K1 / 4,250,000 | SBSA003 / 33,060 (street) | 3,460,000 | 0 | **19 %** |
| Seiko | 5 Sports GMT "Batman" | SSK003K1 / 6,290,000 | SBSC003 / 55,440 (Yodobashi, MSRP 69,300) | 5,803,000 | 0 | **8 %** |
| Seiko | 5 Sports GMT black | SSK001K1 / 6,290,000 | SBSC001 / 55,440 (street) | 5,803,000 | 0 | **8 %** |
| Citizen | Promaster Wave Tracker, rubber | JV3000-13E / 11,397,000 | JV3000-13E / 88,550 (Yodobashi, MSRP 126,500) | 9,268,000 | ~40,000 | **18 %** |
| Citizen | Promaster Wave Tracker, steel | JV3001-53E / 12,388,000 | JV3001-53E / 96,250 (Yodobashi, MSRP 137,500) | 10,074,000 | ~220,000 | **17 %** |
| Citizen | Tsuyosa automatic | NJ0150-56A / 4,480,000 | NJ0150-56W / 46,200 (Yodobashi) | 4,836,000 | 0 | **−8 %** |
| Citizen | Attesa ACT Line black Ti | AT8294-59E / 14,590,000 | AT8294-59E / 143,300 (street) | 14,999,000 | ~1,310,000 | **−12 %** |
| Citizen | Attesa ACT Line Ti | AT8295-56E / 12,783,000 | AT8295-56E / 125,880 (street) | 13,175,000 | ~910,000 | **−10 %** |
| Citizen | Zenshin | NJ0180-80A / 6,382,000 | NJ0180-80A / 73,400 (street, grey import) | 7,682,000 | 0 | **−20 %** |
| Citizen | Promaster mech. diver 200m | NB6004-08E / 11,638,000 | NB6004-08E / 132,000 (street, grey import) | 13,816,000 | ~1,050,000 | **−28 %** |

\* Assumes the watch is the only thing you bring home, using the base-case rate (10 % duty + 11 % VAT on the value above US$500). The table's savings include this import tax. If your other purchases already use up the allowance, every rupiah of the watch is taxed at ≈22 % (≈33 % if PPh is levied). That turns all the Seiko savings negative.

## Assumptions

### Exchange rate
* **1 JPY = 115.13 IDR**, calculated as 1 USD = 18,131.95 IDR ÷ 157.495 JPY. Source: open.er-api.com, 1 Nov 2026 00:02 UTC.
* Cross-check: ECB/Frankfurter rate of 115.41 on 30 Oct 2026.
* Card FX spreads (typically 1–3 %) are **not** included. Deduct them from the Japan savings.

### Japan tax refund
* **Japan switched to a refund system on 1 Nov 2026.** Tourists now pay the full 10 % at the till. Customs checks the goods at departure, then the tax is refunded.
* The refund is 10/110 of the tax-inclusive price (≈9.1 %), not 10 %.
* Some retailers or refund operators may deduct a handling fee. Check this with Yodobashi before you buy.

### Indonesian import rules (PMK 34/2025)
* Passengers get a US$500 FOB allowance per person, ≈ ¥78,750 or IDR 9.07M.
* Above that, the **excess** pays a 10 % flat duty, plus PPN (12 % × DPP 11/12 = 11 % effective) on the excess plus duty.
* Sources disagree on whether PPh 22 import tax (up to 10 %) also applies. It is included as a worst case in `results.csv`.
* Under-declaring carries penalties of 100–500 % of the duty.

### Indonesian VAT
* Jamtangan prices already include PPN.
* Indonesia's VAT refund for tourists is for foreign passport holders only. The analysis assumes the buyer lives in Indonesia, so it doesn't apply.

### Yodobashi pricing pattern (observed on kakaku.com)
* Seiko 5 Sports: ≈20 % below MSRP.
* Citizen: ≈30 % below MSRP.
* Both add 10 % points.

### Warranty
* JDM models (SBSA/SBSC) carry a Japanese domestic warranty. Jamtangan sells with the Indonesian official warranty.
* Seiko and Citizen service centres in Indonesia may not honour a Japan-only warranty card.

## Data limitations

* **yodobashi.com blocks automated access** (it returned 503/502 for every request). Yodobashi prices therefore come from Yodobashi.com's own listing on kakaku.com, Japan's price-comparison site. Where Yodobashi wasn't listed for a model, the lowest Japanese retail price is used instead and marked *street*.
* Japanese MSRPs for Seiko come from seikowatches.com/jp-ja. Citizen MSRPs come from kakaku.com.
* **Jamtangan:** 518 Seiko and Citizen product pages were collected through the site's product sitemap (`data_jamtangan_raw.json`).
* **Reference mapping:**
  * Seiko international and JDM refs map one-to-one: SRPD55↔SBSA005, SRPD51↔SBSA001, SRPD53↔SBSA003, SSK001↔SBSC001, SSK003↔SBSC003.
  * The Tsuyosa pair is the same model family with a different dial code. Their MSRPs are within about 10 %.
* Prices and stock change daily. Re-check both sites before buying.
