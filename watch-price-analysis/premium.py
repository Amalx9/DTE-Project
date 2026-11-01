"""Seiko Presage / Prospex / Alpinist / GMT / King Seiko: Jamtangan vs Japan (2026-11-01).
JDM twins matched on calibre + case dimensions (+weight) from seikowatches.com JP vs SG/ID pages."""
import csv
INR_USD, IDR_USD, JPY_USD = 95.050072, 18131.950547, 157.49531
INR_IDR, INR_JPY = INR_USD/IDR_USD, INR_USD/JPY_USD
rows = [  # line, model, JT ref, JT IDR, JP ref, JP JPY, source
 ("Presage","Cocktail Time (new 2026)","HCB003J1",8925000,"HCB003J",58080,"Yodobashi"),
 ("Presage","Cocktail Time 40.5mm","SRPE15J1",6460000,"SARY161 family",48400,"Yodobashi"),
 ("Presage","Cocktail Time 34mm","SRPL61J1",7820000,"SRRY049",64240,"Yodobashi"),
 ("Presage","Style60's","SRPL71J1",8202000,"SARY265",63360,"street"),
 ("Presage","Classic Tomioka silk","HCC001J1",13302000,"HCC001J",136400,"Yodobashi"),
 ("Presage","Classic Tomioka silk pink","HCC003J1",13005000,"HCC003J",134200,"Yodobashi"),
 ("Presage","Sharp Edged","SPB465J1",12325000,"SARX121 family",136400,"Yodobashi"),
 ("Presage","Classic 36mm","SPB523J1",13005000,"SARX129 family",136400,"Yodobashi"),
 ("Presage","Arita porcelain LE","HCC007J1",29500000,"HCC007J",242000,"MSRP"),
 ("Prospex","Sumo","SPB539J1",11050000,"SBDC081 family",113300,"Yodobashi"),
 ("Prospex","1965 Heritage diver","SPB451J1",18360000,"SBDC195",181500,"Yodobashi"),
 ("Prospex","1968 Heritage diver (new)","HBC005J1",19699000,"HBC005J",192500,"Yodobashi"),
 ("Prospex","Speedtimer","HBC003J1",14155000,"HBC003J",141898,"street"),
 ("Prospex","Speedtimer","SPB513J1",15010000,"SBDC215",124980,"street"),
 ("Alpinist","Alpinist","SPB505J1",14195000,"SBDC209",147400,"Yodobashi"),
 ("GMT","5 Sports GMT","SSK001K1",6290000,"SBSC001",55440,"street"),
 ("GMT","Presage Cocktail Time GMT","SSK037J1",8330000,"SARY241",64240,"Yodobashi"),
 ("GMT","Alpinist GMT","SPB377J1",16150000,"SBEJ005",149000,"street"),
 ("GMT","Prospex 1968 Heritage GMT","SPB519J1",25415000,"SBEJ029",228000,"street"),
 ("GMT","Prospex 1968 Heritage GMT (new)","HBC002J1",25500000,"HBC002J",255200,"Yodobashi"),
 ("King Seiko","King Seiko 6L35","SJE111J1",43470000,"SDKA017 family",396000,"MSRP"),
]
out=[]
for line,model,jr,idr,jp,jpy,src in rows:
    jt=idr*INR_IDR; jt_ref=jt*(1-11/111)          # Indonesian PPN refund (tourist)
    jp_inr=jpy*INR_JPY; jp_ref=jp_inr/1.1          # Japan consumption-tax refund
    out.append(dict(line=line,model=model,jamtangan_ref=jr,jamtangan_idr=idr,japan_ref=jp,japan_jpy=jpy,japan_source=src,
        jamtangan_inr=round(jt),jamtangan_after_vat_refund_inr=round(jt_ref),japan_inr=round(jp_inr),japan_after_tax_refund_inr=round(jp_ref),
        japan_vs_jamtangan_both_refunds=round(1-jp_ref/jt_ref,3),japan_vs_jamtangan_no_id_refund=round(1-jp_ref/jt,3),
        yodobashi_points_inr=round(jp_inr*0.1) if src=="Yodobashi" else 0))
with open('results_premium.csv','w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=out[0].keys()); w.writeheader(); w.writerows(out)
for o in out:
    print(f"{o['line']:10}{o['model'][:30]:31}{o['jamtangan_ref']:9}{o['japan_ref'][:15]:16}{o['japan_source']:10}{o['jamtangan_inr']:>9,}{o['jamtangan_after_vat_refund_inr']:>9,}{o['japan_after_tax_refund_inr']:>9,}{o['japan_vs_jamtangan_both_refunds']:>7.0%}{o['japan_vs_jamtangan_no_id_refund']:>7.0%}")
