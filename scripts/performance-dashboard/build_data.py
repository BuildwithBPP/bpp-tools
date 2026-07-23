# -*- coding: utf-8 -*-
"""Build the monthly data model JSON for the dynamic BPP performance dashboard."""
import csv, json, os, glob
from collections import defaultdict

DA3=r"C:\Users\dtben\OneDrive - Business Plans Plus\BPP Operations\BPP Workspace\1. Internal Operations\7. Data Analytics\DA-003 - Social Media Database"
DA4=r"C:\Users\dtben\OneDrive - Business Plans Plus\BPP Operations\BPP Workspace\1. Internal Operations\7. Data Analytics\DA-004 - Financial Database"
OUT=r"C:\Users\dtben\AppData\Local\Temp\claude\c--Users-dtben-OneDrive---Business-Plans-Plus-BPP-Operations-BPP-Workspace\2087373c-e624-43a3-95f8-23812ac30c64\scratchpad\monthly_data.json"

def f(x):
    if x in (None,"","null"): return 0.0
    try: return float(x)
    except: return 0.0

M=defaultdict(lambda: {"rev":0,"exp":0,"net":0,"revcat":defaultdict(float),
    "wonN":0,"wonV":0,"lostN":0,"lostV":0,
    "ig":{"v":0,"p":0,"e":0,"f":0},"fb":{"v":0,"p":0,"e":0,"f":0},
    "tt":{"v":0,"p":0,"e":0,"f":0},"li":{"v":0,"p":0,"e":0,"f":0},
    "web":{"pv":0,"vis":0}})

# ---- FINANCIAL (DA-004 monthly-pnl) ----
with open(os.path.join(DA4,"monthly-pnl.csv"),encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        m=r["month"]
        M[m]["rev"]=round(f(r["net_revenue"]),2)
        M[m]["exp"]=round(f(r["expenses"]),2)
        M[m]["net"]=round(f(r["net_income"]),2)

# revenue by income account -> collapse to tidy categories
CATMAP={"Marketing Income":"Marketing","Technology Income":"Technology","Consulting Income":"Consulting",
        "Uncategorized Income":"Other","Unapplied Cash Payment Income":"Other"}
with open(os.path.join(DA4,"account-by-month.csv"),encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        if r["is_income"]!="yes": continue
        acct=r["account"]
        if acct in ("Interest earned","Discounts given"): continue
        cat=CATMAP.get(acct)
        if not cat: continue
        M[r["month"]]["revcat"][cat]+=round(f(r["amount"]),2)

# ---- SOCIAL (DA-003 dailies) ----
def month_of(d): return d[:7]  # 2026-04-01 -> 2026-04
def agg_platform(pattern, viewcol, postcol, engcol):
    for path in glob.glob(os.path.join(DA3,pattern)):
        with open(path,encoding="utf-8-sig") as fh:
            rows=list(csv.DictReader(fh))
        # followers = last non-blank per month
        foll={}
        for r in rows:
            m=month_of(r["date"])
            if r.get("followers") not in (None,"",):
                foll[m]=(r["date"], f(r["followers"]))
        by=defaultdict(lambda:{"v":0,"p":0,"e":0})
        for r in rows:
            m=month_of(r["date"])
            by[m]["v"]+=f(r.get(viewcol))
            by[m]["p"]+=f(r.get(postcol))
            by[m]["e"]+=f(r.get(engcol))
        return by, {k:v[1] for k,v in foll.items()}
    return {}, {}

plat_cfg={
 "ig":("instagram-daily-*.csv","views","posts","interactions"),
 "fb":("facebook-daily-*.csv","media_views","posts","interactions"),
 "tt":("tiktok-daily-*.csv","video_views","videos","interactions"),
 "li":("linkedin-daily-*.csv","post_impressions","posts","interactions"),
}
for key,(pat,vc,pc,ec) in plat_cfg.items():
    for path in glob.glob(os.path.join(DA3,pat)):
        with open(path,encoding="utf-8-sig") as fh:
            for r in csv.DictReader(fh):
                m=month_of(r["date"])
                M[m][key]["v"]+=f(r.get(vc)); M[m][key]["p"]+=f(r.get(pc)); M[m][key]["e"]+=f(r.get(ec))
                if r.get("followers") not in (None,""): M[m][key]["f"]=f(r["followers"])  # last wins (files are date-shuffled; fix below)
# fix followers: need max date per month, re-scan
def last_followers(pat):
    out={}
    for path in glob.glob(os.path.join(DA3,pat)):
        with open(path,encoding="utf-8-sig") as fh:
            for r in csv.DictReader(fh):
                if r.get("followers") in (None,""): continue
                m=month_of(r["date"])
                if m not in out or r["date"]>out[m][0]: out[m]=(r["date"],f(r["followers"]))
    return {k:v[1] for k,v in out.items()}
for key,(pat,vc,pc,ec) in plat_cfg.items():
    lf=last_followers(pat)
    for m,val in lf.items(): M[m][key]["f"]=val

# website
for path in glob.glob(os.path.join(DA3,"website-daily-*.csv")):
    with open(path,encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            m=month_of(r["date"]); M[m]["web"]["pv"]+=f(r.get("page_views")); M[m]["web"]["vis"]+=f(r.get("visitors"))

# ---- JULY 2026 social (inline from Metricool pulls 2026-07-22) ----
# FB/TT rows: [FBfoll, FBposts, FBmediaviews, FBinteractions, TTfoll, TTvideos, TTviews, TTinteractions, date]
fbtt=[["1156.0",None,"8.0",None,"86.0",None,"3.0",None,"20260704"],["1159.0",None,"26.0",None,"85.0",None,"5.0",None,"20260715"],["1157.0","1.0","13.0","2.0","86.0",None,"2.0",None,"20260703"],["1158.0",None,"0.0",None,"85.0",None,"5.0",None,"20260714"],["1156.0",None,"0.0",None,"86.0",None,"10.0",None,"20260706"],["1159.0",None,"2.0",None,"85.0",None,"7.0",None,"20260717"],["1159.0","1.0","19.0","1.0","85.0",None,"6.0",None,"20260716"],["1156.0",None,"4.0",None,"86.0",None,"4.0",None,"20260705"],["1161.0",None,"3.0",None,"85.0","0.0",None,"0.0","20260722"],["1158.0","1.0","7.0",None,"85.0",None,"3.0",None,"20260711"],["1158.0","1.0","24.0","16.0","85.0",None,"2.0",None,"20260710"],["1161.0",None,"17.0",None,"85.0",None,"2.0",None,"20260721"],["1157.0",None,"1.0",None,"86.0",None,"2.0",None,"20260702"],["1158.0",None,"6.0",None,"85.0",None,"4.0",None,"20260713"],["1157.0",None,"15.0",None,"86.0",None,"5.0",None,"20260701"],["1158.0",None,"19.0",None,"85.0",None,"5.0",None,"20260712"],["1161.0",None,"13.0",None,"85.0",None,"3.0",None,"20260720"],["1158.0",None,"38.0",None,"85.0",None,"4.0",None,"20260709"],["1160.0","1.0","24.0","13.0","85.0",None,"3.0",None,"20260719"],["1156.0",None,"11.0",None,"85.0",None,"4.0",None,"20260708"],["1156.0",None,"1.0",None,"85.0",None,"7.0",None,"20260707"],["1159.0",None,"2.0",None,"85.0",None,"2.0",None,"20260718"]]
for r in fbtt:
    M["2026-07"]["fb"]["v"]+=f(r[2]); M["2026-07"]["fb"]["p"]+=f(r[1]); M["2026-07"]["fb"]["e"]+=f(r[3])
    M["2026-07"]["tt"]["v"]+=f(r[6]); M["2026-07"]["tt"]["p"]+=f(r[5]); M["2026-07"]["tt"]["e"]+=f(r[7])
M["2026-07"]["fb"]["f"]=1161; M["2026-07"]["tt"]["f"]=85
# LI/web rows: [LIfoll, LIposts, LIimpr, LIinter, WEBpv, WEBvisits, WEBvisitors, date]
liweb=[["202.0",None,"1.0",None,"0.0","0.0","0.0","20260709"],["202.0",None,None,None,"8.0","3.0","2.0","20260708"],["202.0",None,None,None,"0.0","0.0","0.0","20260719"],["202.0",None,None,None,"0.0","0.0","0.0","20260707"],["202.0",None,None,None,"1.0","1.0","1.0","20260718"],["202.0",None,None,None,"0.0","0.0","0.0","20260704"],["202.0",None,None,None,"8.0","5.0","4.0","20260715"],["202.0",None,None,None,"1.0","1.0","1.0","20260703"],["202.0",None,None,None,"3.0","2.0","2.0","20260706"],["202.0",None,"2.0",None,"2.0","2.0","2.0","20260714"],["202.0",None,None,None,"4.0","3.0","3.0","20260717"],["202.0","0.0",None,"0.0","35.0","16.0","16.0","20260722"],["202.0",None,"8.0",None,"5.0","5.0","5.0","20260720"],["202.0",None,"2.0",None,"1.0","1.0","1.0","20260705"],["202.0",None,"1.0",None,"4.0","4.0","4.0","20260702"],["202.0",None,None,None,"28.0","11.0","9.0","20260716"],["202.0",None,"10.0",None,"10.0","8.0","8.0","20260711"],["202.0",None,None,None,"0.0","0.0","0.0","20260713"],["202.0",None,None,None,"9.0","9.0","9.0","20260701"],["202.0",None,"2.0",None,"11.0","10.0","10.0","20260721"],["202.0",None,None,None,"0.0","0.0","0.0","20260712"],["202.0",None,None,None,"1.0","1.0","1.0","20260710"]]
for r in liweb:
    M["2026-07"]["li"]["v"]+=f(r[2]); M["2026-07"]["li"]["p"]+=f(r[1]); M["2026-07"]["li"]["e"]+=f(r[3])
    M["2026-07"]["web"]["pv"]+=f(r[4]); M["2026-07"]["web"]["vis"]+=f(r[6])
M["2026-07"]["li"]["f"]=202
# IG July: [IGfoll, IGnetnew, IGposts, IGviews, IGreach, IGinter, IGreels, IGreelsviews, date]
igj=[["184.0","-1.0","1.0","154.0","61.0",None,None,None,"20260708"],["188.0","0.0",None,"12.0","1.0",None,None,None,"20260720"],["185.0","0.0",None,"1.0","1.0",None,None,None,"20260704"],["184.0","0.0",None,"25.0","4.0",None,None,None,"20260709"],["188.0","0.0",None,"17.0","5.0",None,None,None,"20260719"],["184.0","-1.0",None,"6.0","3.0",None,None,None,"20260706"],["187.0","1.0",None,"11.0","1.0",None,None,None,"20260715"],["185.0","0.0",None,"5.0","2.0",None,None,None,"20260717"],["185.0","1.0",None,"17.0","4.0",None,None,None,"20260707"],["185.0","0.0",None,"2.0","2.0",None,None,None,"20260705"],["187.0","2.0",None,"360.0","140.0",None,None,None,"20260711"],["185.0","1.0",None,"8.0","2.0",None,None,None,"20260702"],["185.0","0.0",None,"16.0","3.0",None,None,None,"20260703"],["188.0","1.0",None,"20.0","2.0",None,None,None,"20260716"],["188.0","0.0",None,"10.0","0.0",None,None,None,"20260718"],["188.0","0.0",None,"19.0","2.0",None,None,None,"20260721"],["186.0","-1.0",None,"129.0","97.0",None,None,None,"20260713"],["186.0","0.0",None,"20.0","1.0",None,None,None,"20260714"],["185.0","1.0",None,"38.0","3.0",None,None,None,"20260710"],["184.0","0.0",None,"17.0","4.0",None,None,None,"20260701"],["187.0","0.0","2.0","667.0","377.0",None,None,None,"20260712"]]
for r in igj:
    M["2026-07"]["ig"]["v"]+=f(r[3]); M["2026-07"]["ig"]["p"]+=f(r[2]); M["2026-07"]["ig"]["e"]+=f(r[5])
M["2026-07"]["ig"]["f"]=188

# ---- SALES (HubSpot, by close date as recorded) ----
won=[("2025-06",2337.5),("2025-06",678),("2025-07",3750),("2025-08",599),("2025-08",998),
("2025-10",1248),("2025-12",2000),("2025-12",3315),("2025-12",599),("2025-12",1500),
("2026-02",500),("2026-02",500),("2026-02",500),("2026-02",3200),("2026-03",1000),
("2026-04",4500),("2026-04",500),("2026-04",1649),("2026-04",449.25),("2026-01",3350)]
lost=[("2025-08",599),("2025-08",550),("2025-09",3463),("2025-09",1200),("2025-10",1247),("2025-10",200),
("2025-10",599),("2025-10",0),("2025-10",200),("2025-11",3563),("2025-11",599),("2025-12",1747),
("2025-12",2000),("2025-12",599),("2026-01",2823),("2026-02",1398),("2026-02",1000),("2026-02",3440),
("2026-02",0),("2026-02",1000),("2026-02",1997),("2026-03",509.15),("2026-03",2248),("2026-04",3599),
("2026-04",0),("2026-04",5197),("2026-04",599),("2026-05",4500),("2026-05",3000),("2026-05",2000),
("2026-05",4500),("2026-05",1799),("2026-05",1000),("2026-06",0),("2026-06",2000),("2026-07",599),
("2026-07",4500),("2026-07",1799),("2026-07",0)]
for m,a in won: M[m]["wonN"]+=1; M[m]["wonV"]+=a
for m,a in lost: M[m]["lostN"]+=1; M[m]["lostV"]+=a

# ---- emit ----
months=sorted(M.keys())
data={}
for m in months:
    d=M[m]
    data[m]={"rev":round(d["rev"],2),"exp":round(d["exp"],2),"net":round(d["net"],2),
        "revcat":{k:round(v,2) for k,v in d["revcat"].items()},
        "wonN":d["wonN"],"wonV":round(d["wonV"],2),"lostN":d["lostN"],"lostV":round(d["lostV"],2),
        "ig":{k:round(v,2) for k,v in d["ig"].items()},"fb":{k:round(v,2) for k,v in d["fb"].items()},
        "tt":{k:round(v,2) for k,v in d["tt"].items()},"li":{k:round(v,2) for k,v in d["li"].items()},
        "web":{k:round(v,2) for k,v in d["web"].items()}}
out={"generated":"2026-07-23","months":months,"data":data}
open(OUT,"w",encoding="utf-8").write(json.dumps(out,separators=(",",":")))
# sanity print
print("months:",months[0],"->",months[-1],"count",len(months))
for m in ["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07"]:
    d=data.get(m,{})
    print(f'{m} rev {d.get("rev")} net {d.get("net")} wonV {d.get("wonV")} lostV {d.get("lostV")} '
          f'IGv {d["ig"]["v"]:.0f} TTv {d["tt"]["v"]:.0f} web {d["web"]["pv"]:.0f}')
print("bytes:",os.path.getsize(OUT))
