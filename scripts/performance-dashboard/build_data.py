# -*- coding: utf-8 -*-
"""Build the monthly data model JSON for the dynamic BPP performance dashboard."""
import argparse, csv, json, os, glob
from collections import defaultdict
from pathlib import Path

from build_utils import serialize_for_script, validate_source_families

SCRIPT_DIR = Path(__file__).resolve().parent


def discover_source_dir(explicit: Path | None, env_name: str, relative_dir: Path) -> Path | None:
    """Use a CLI path, an environment path, or a workspace-relative discovery result."""
    if explicit:
        return explicit.expanduser()
    if os.getenv(env_name):
        return Path(os.environ[env_name]).expanduser()
    seen = set()
    for anchor in (Path.cwd(), SCRIPT_DIR, *Path.cwd().parents, *SCRIPT_DIR.parents):
        candidate = anchor / relative_dir
        if candidate in seen:
            continue
        seen.add(candidate)
        if candidate.is_dir():
            return candidate
    return None

parser = argparse.ArgumentParser(description="Build and optionally render the BPP Performance Dashboard.")
parser.add_argument("--social-dir", type=Path, help="DA-003 social and website CSV directory. Overrides BPP_DASHBOARD_SOCIAL_DIR.")
parser.add_argument("--financial-dir", type=Path, help="DA-004 financial CSV directory. Overrides BPP_DASHBOARD_FINANCIAL_DIR.")
parser.add_argument("--output", type=Path, default=SCRIPT_DIR / "monthly_data.json", help="Monthly data JSON output path.")
parser.add_argument("--render", action="store_true", help="Render the final dashboard HTML after building data.")
parser.add_argument("--template", type=Path, default=SCRIPT_DIR / "template.html", help="Dashboard template path.")
parser.add_argument("--render-output", type=Path, default=SCRIPT_DIR.parents[1] / "pages" / "performance-dashboard.html", help="Final dashboard HTML output path.")
parser.add_argument("--validate-sources", action="store_true", help="Fail when required source files are missing or stale.")
parser.add_argument("--max-source-age-days", type=int, default=31, help="Maximum age for the newest CSV source when validating.")
args = parser.parse_args()
args.social_dir = discover_source_dir(args.social_dir, "BPP_DASHBOARD_SOCIAL_DIR", Path("1. Internal Operations") / "7. Data Analytics" / "DA-003 - Social Media Database")
args.financial_dir = discover_source_dir(args.financial_dir, "BPP_DASHBOARD_FINANCIAL_DIR", Path("1. Internal Operations") / "7. Data Analytics" / "DA-004 - Financial Database")
if not args.social_dir or not args.financial_dir:
    parser.error("Provide --social-dir and --financial-dir, set BPP_DASHBOARD_SOCIAL_DIR and BPP_DASHBOARD_FINANCIAL_DIR, or run from a BPP workspace descendant.")
DA3 = str(args.social_dir)
DA4 = str(args.financial_dir)
OUT = str(args.output)

def validate_sources():
    try:
        ages = validate_source_families(args.financial_dir, args.social_dir, args.max_source_age_days)
    except ValueError as error:
        raise SystemExit(f"Source validation failed: {error}") from error
    print("Source validation passed: financial {:.1f} days, social {:.1f} days.".format(ages["financial_age_days"], ages["social_age_days"]))

if args.validate_sources:
    validate_sources()

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

# ---- REVENUE BY OFFERING (keyword-first, client fallback) ----
def offering(name, desc):
    d=(desc or "").lower(); nm=(name or "").lower()
    if any(k in d for k in ["crm","hubspot pipeline","honeybook","ai workflow","automation"]): return "Systems & CRM"
    if any(k in d for k in ["website","landing page","ecommerce","google voice"]) or "form" in d and "optimiz" in d: return "Website & Digital"
    if any(k in d for k in ["brand","logo","visual foundation","guideline","print","collateral"]): return "Brand & Design"
    if "business plan" in d: return "Business Planning"
    if any(k in d for k in ["google business profile","google my business","gmb"," seo"]): return "Local SEO / GMB"
    if any(k in d for k in ["quickbooks","chart of accounts"]): return "Finance / QuickBooks"
    if "social media strategy" in d: return "Marketing & Social"
    if any(k in d for k in ["state filing","compliance"]): return "Consulting & Other"
    # client fallback for milestone / bare payments
    if "phil tirado" in nm: return "Systems & CRM"           # Lois Operator System
    if "halo" in nm: return "Website & Digital"               # HALO Launch Pad
    if "jeannette" in nm or "seed folk" in nm: return "Business Planning"  # SEEDFOLKids strategic planning
    if "wedelia" in nm or "mable" in nm: return "Business Planning"
    if "stack all profits" in nm or "fawwwkk" in nm or "legacy roof" in nm or "darnel felix" in nm: return "Marketing & Social"
    if "roberts brothers" in nm: return "Website & Digital"
    return "Consulting & Other"
_inc={"Consulting Income","Technology Income","Marketing Income","Uncategorized Income","Unapplied Cash Payment Income"}
with open(os.path.join(DA4,"transactions-all.csv"),encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        if r["account"] not in _inc: continue
        amt=f(r["amount"])
        if amt<=0: continue
        m=r["month"]; M[m].setdefault("revoff",defaultdict(float))
        M[m]["revoff"][offering(r["name"],r["description"])]+=amt

# ---- EXPENSES BY CATEGORY ----
EXPMAP={"Software & apps":"Software","Content Creation & Management":"Content & Marketing",
 "Promotional Materials":"Content & Marketing","Events & Sponsorships":"Content & Marketing",
 "Partners Guaranteed Payments":"Owner Pay","Prior Owner Revenue Share (5%)":"Rodney Rev-Share",
 "Contract labor":"Contract Labor","Bank fees & service charges":"Fees","QuickBooks Payments Fees":"Fees"}
with open(os.path.join(DA4,"account-by-month.csv"),encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        if r["is_income"]!="no": continue
        amt=f(r["amount"]);
        if amt==0: continue
        cat=EXPMAP.get(r["account"])
        if not cat:
            cat="Client Costs" if "Reimbursable" in r["account"] else "Other"
        m=r["month"]; M[m].setdefault("expcat",defaultdict(float))
        M[m]["expcat"][cat]+=amt

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
won=[("2025-06",2337.5,"Eli"),("2025-06",678,"Eli"),("2025-07",3750,"Daunte"),("2025-08",599,"Kenny"),("2025-08",998,"Kenny"),
("2025-10",1248,"Daunte"),("2025-12",2000,"Eli"),("2025-12",3315,"Kenny"),("2025-12",599,"Kenny"),("2025-12",1500,"Eli"),
("2026-02",500,"Daunte"),("2026-02",500,"Daunte"),("2026-02",500,"Eli"),("2026-02",3200,"Eli"),("2026-03",1000,"Eli"),
("2026-04",4500,"Eli"),("2026-04",500,"Daunte"),("2026-04",1649,"Eli"),("2026-04",449.25,"Kenny"),("2026-01",3350,"Daunte")]
lost=[("2025-08",599),("2025-08",550),("2025-09",3463),("2025-09",1200),("2025-10",1247),("2025-10",200),
("2025-10",599),("2025-10",0),("2025-10",200),("2025-11",3563),("2025-11",599),("2025-12",1747),
("2025-12",2000),("2025-12",599),("2026-01",2823),("2026-02",1398),("2026-02",1000),("2026-02",3440),
("2026-02",0),("2026-02",1000),("2026-02",1997),("2026-03",509.15),("2026-03",2248),("2026-04",3599),
("2026-04",0),("2026-04",5197),("2026-04",599),("2026-05",4500),("2026-05",3000),("2026-05",2000),
("2026-05",4500),("2026-05",1799),("2026-05",1000),("2026-06",0),("2026-06",2000),("2026-07",599),
("2026-07",4500),("2026-07",1799),("2026-07",0)]
for m,a,o in won: M[m]["wonN"]+=1; M[m]["wonV"]+=a; M[m].setdefault("wonOwner",defaultdict(float))[o]+=a
for m,a in lost: M[m]["lostN"]+=1; M[m]["lostV"]+=a

# ---- IG REELS (monthly aggregate) — rows: date, views, reach, saved, shares, avgWatch ----
reels=[["20260530190246",59,39,0,0,5.779],["20260529150400",80,56,0,0,5.003],["20260527150402",248,180,0,0,4.931],["20260523190305",79,52,0,0,5.911],["20260522150539",241,164,0,1,9.464],["20260520140855",126,77,1,0,8.331],["20260516070241",294,173,0,0,7.411],["20260515150551",1684,1041,1,6,8.479],["20260513150307",177,132,0,0,5.446],["20260511150350",172,125,0,0,5.284],["20260509190402",173,125,0,1,11.922],["20260508150402",623,372,0,7,7.7],["20260506190252",113,66,0,0,10.594],["20260504160508",204,166,0,0,3.859],["20260501150930",180,128,0,0,5.572],["20260429190236",67,41,1,0,3.341],["20260429150458",300,248,0,0,6.135],["20260427150459",272,203,0,1,5.295],["20260425210217",155,137,2,1,9.294],["20260424150411",325,254,0,2,6.44],["20260422190245",65,38,0,0,9.326],["20260422150505",251,174,0,1,4.919],["20260420150357",579,414,0,2,5.925],["20260418210214",290,233,1,1,5.693],["20260417140420",443,298,0,1,4.142],["20260415190228",236,208,0,0,3.374],["20260415150326",343,223,0,0,6.199],["20260413150606",820,530,0,1,7.148],["20260411230329",178,154,5,2,5.337],["20260410180356",542,361,0,2,5.762],["20260408160449",187,135,0,0,6.209],["20260406193146",2115,1299,1,3,7.175],["20260402160654",445,344,0,2,7.409],["20260324160807",445,340,0,1,6.295],["20260123150703",1147,621,5,4,8.938],["20260121160646",533,338,0,0,6.507],["20260114150328",1160,696,0,5,7.577],["20260107150337",619,414,1,3,6.199],["20260102150331",313,242,0,2,6.047],["20260101150556",81,62,0,0,3.65],["20251231150516",251,187,0,1,7.066],["20251230150237",232,178,0,0,4.23],["20251229150508",185,137,0,0,6.816],["20251226150213",206,162,1,0,4.613],["20251224150239",214,205,0,0,4.558],["20251223150454",225,195,0,0,2.765],["20251222150558",281,216,0,0,7.312],["20251219150327",200,151,0,0,5.529],["20251217150226",225,189,0,0,3.796],["20251216150500",345,256,1,1,8.134],["20251215150628",398,328,0,1,4.799],["20251214150305",135,83,0,2,10.164],["20251212173701",1381,872,0,13,7.97],["20251212150624",1907,1162,4,7,8.488],["20251210191936",466,355,0,1,6.298],["20251210150313",324,284,0,0,3.2],["20251205150415",386,314,0,1,4.898],["20251203150241",214,180,0,0,7.737],["20251130150215",585,460,0,4,5.322],["20251129150252",219,185,0,2,6.039],["20251127150424",215,185,0,1,2.437],["20251124150345",117,95,0,0,3.874],["20251123150345",464,350,0,2,8.696],["20251122150330",190,154,1,1,4.958],["20251121150752",123,101,0,0,4.71],["20251117150335",162,132,0,1,6.004],["20251115150215",204,164,0,0,9.797],["20251114150628",223,176,0,0,6.403],["20251112160351",108,80,0,0,3.935],["20251110150319",125,92,0,0,5.545],["20251108150217",202,172,0,0,5.784],["20251107150337",94,70,0,0,3.836],["20251105170250",154,134,0,0,2.199],["20251103150417",129,90,0,1,8.308],["20251101140300",110,89,0,0,3.512],["20251031140340",173,130,0,1,5.348],["20251029160305",247,190,0,1,4.105],["20251027160322",967,654,0,5,5.622],["20251015133725",314,210,0,1,7.935],["20250930000908",140,84,0,0,7.222],["20250926152217",64,41,0,1,5.126],["20250917113224",118,72,0,0,10.034],["20250908184844",405,273,0,2,7.65],["20250901121306",43,32,0,0,2.695]]
_rw=defaultdict(lambda:{"n":0,"v":0,"r":0,"s":0,"sh":0,"wt":0.0})
for row in reels:
    m=f"{row[0][:4]}-{row[0][4:6]}"; d=_rw[m]
    d["n"]+=1; d["v"]+=row[1]; d["r"]+=row[2]; d["s"]+=row[3]; d["sh"]+=row[4]; d["wt"]+=row[5]
for m,d in _rw.items():
    M[m]["reels"]={"n":d["n"],"v":d["v"],"r":d["r"],"s":d["s"],"sh":d["sh"],"wt":round(d["wt"]/d["n"],1) if d["n"] else 0}

# ---- DEAL LISTS (won + lost, by close month; FA attributed to Q1) ----
DEALS=[("2025-06","Remember Wynn Foundations",2337.5,"Eli",1),("2025-06","SEEDFOLKids Foundations",678,"Eli",1),
("2025-07","Tier 1 Foundations",3750,"Daunte",1),("2025-08","Mable Blueprinting",599,"Kenny",1),("2025-08","Stack All Profits",998,"Kenny",1),
("2025-10","Wedelia Wellness",1248,"Daunte",1),("2025-12","Roberts Brothers - Mktg & Legal",2000,"Eli",1),("2025-12","Xtremely Clean - Automation/CRM",3315,"Kenny",1),
("2025-12","Fawwwkk",599,"Kenny",1),("2025-12","Legacy Roofing",1500,"Eli",1),("2026-02","Xtremely Clean - Hourly",500,"Daunte",1),
("2026-02","Xtremely Clean - 10hrs",500,"Daunte",1),("2026-02","MAA - 10hrs",500,"Eli",1),("2026-02","SEEDFOLKids - Strategic Planning",3200,"Eli",1),
("2026-03","SEEDFOLKids - Brand Guideline",1000,"Eli",1),("2026-04","Lois Marketing - Operator System",4500,"Eli",1),("2026-04","Xtremely Clean - Proposal Dev",500,"Daunte",1),
("2026-04","HALO Commons - Launch Pad",1649,"Eli",1),("2026-04","De Dior Studios - BP",449.25,"Kenny",1),("2026-01","Financial Acuity - Growth Package",3350,"Daunte",1),
("2025-08","MGP Business Plan",599,"",0),("2025-08","Invitation to a Wedding",550,"",0),("2025-09","Heart & Soul",3463,"",0),("2025-09","For The Girls Tampa",1200,"",0),
("2025-10","Squeaky Whips",1247,"",0),("2025-10","Mattie Mae's Fixings",200,"",0),("2025-10","E&M Beautiful Me",599,"",0),("2025-10","Courtesy Office Cleaning",0,"",0),
("2025-10","Stack all Profits - Consult",200,"",0),("2025-11","RIVR",3563,"",0),("2025-11","The About Group",599,"",0),("2025-12","Revive Realty",1747,"",0),
("2025-12","African Learning Temple",2000,"",0),("2025-12","Troops in Treatment",599,"",0),("2026-01","G. Roberts Logistics",2823,"",0),("2026-02","Stack All Profit - Web/QB",1398,"",0),
("2026-02","Prime Pulse Logistics",1000,"",0),("2026-02","Carlo Thompson - RE CRM",3440,"",0),("2026-02","VoltAir Consulting",0,"",0),("2026-02","B5 ReAffirm",1000,"",0),
("2026-02","For the Girls - Start",1997,"",0),("2026-03","Sterling Diversified",509.15,"",0),("2026-03","Richard's Funeral Home",2248,"",0),("2026-04","Clinical Research Specialist",3599,"",0),
("2026-04","Noisey Creative",0,"",0),("2026-04","Twanda Bradley - Campaign",5197,"",0),("2026-04","Cleaning Top To Bottom",599,"",0),("2026-05","Replace It Auto Glass",4500,"",0),
("2026-05","StudentCrowd - Focus Group",3000,"",0),("2026-05","Zing Juice Bar",2000,"",0),("2026-05","Rare Hues Collective",4500,"",0),("2026-05","Love Your Beauty",1799,"",0),
("2026-05","Cape to the Bay",1000,"",0),("2026-06","Curbology",0,"",0),("2026-06","Hyacinthe Property Mgmt",2000,"",0),("2026-07","TwentyTen Motors",599,"",0),
("2026-07","Merge Pro",4500,"",0),("2026-07","RW Events",1799,"",0),("2026-07","Spring Circle",0,"",0)]
DEAL_ROWS=[{"ym":m,"n":n,"a":a,"o":o,"w":w} for (m,n,a,o,w) in DEALS]

# ---- CURRENT PIPELINE (point-in-time, as of 2026-07-22) ----
PIPELINE=[{"n":"Flava Meets Fusion","a":4497,"stage":"Proposal","o":"Kenny"},{"n":"HALO Retainer","a":3000,"stage":"Proposal","o":"Eli"},
{"n":"Sipsies Lemonade - Custom","a":2500,"stage":"Proposal","o":"Eli"},{"n":"Legacy B. Studio - Website","a":1500,"stage":"Qualified","o":"Eli"},
{"n":"All State (Felicia Russell)","a":0,"stage":"Qualified","o":"Kenny"},{"n":"Aurelia Tech","a":0,"stage":"Lead","o":"Kenny"}]

# ---- emit ----
months=sorted(M.keys())
data={}
for m in months:
    d=M[m]
    data[m]={"rev":round(d["rev"],2),"exp":round(d["exp"],2),"net":round(d["net"],2),
        "revcat":{k:round(v,2) for k,v in d["revcat"].items()},
        "revoff":{k:round(v,2) for k,v in d.get("revoff",{}).items()},
        "expcat":{k:round(v,2) for k,v in d.get("expcat",{}).items()},
        "wonN":d["wonN"],"wonV":round(d["wonV"],2),"lostN":d["lostN"],"lostV":round(d["lostV"],2),
        "wonOwner":{k:round(v,2) for k,v in d.get("wonOwner",{}).items()},
        "ig":{k:round(v,2) for k,v in d["ig"].items()},"fb":{k:round(v,2) for k,v in d["fb"].items()},
        "tt":{k:round(v,2) for k,v in d["tt"].items()},"li":{k:round(v,2) for k,v in d["li"].items()},
        "web":{k:round(v,2) for k,v in d["web"].items()},
        "reels":d.get("reels",{})}
out={"generated":"2026-07-24","months":months,"data":data,"deals":DEAL_ROWS,"pipeline":PIPELINE}
args.output.parent.mkdir(parents=True, exist_ok=True)
serialized=serialize_for_script(out)
args.output.write_text(serialized,encoding="utf-8")
if args.render:
    template=args.template.read_text(encoding="utf-8")
    if "__DATA__" not in template:
        raise SystemExit("Render failed: template does not contain the __DATA__ placeholder.")
    args.render_output.parent.mkdir(parents=True, exist_ok=True)
    args.render_output.write_text(template.replace("__DATA__",serialized),encoding="utf-8")
    print(f"Rendered dashboard: {args.render_output}")
# sanity print
print("months:",months[0],"->",months[-1],"count",len(months))
for m in ["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07"]:
    d=data.get(m,{})
    print(f'{m} rev {d.get("rev")} net {d.get("net")} wonV {d.get("wonV")} lostV {d.get("lostV")} '
          f'IGv {d["ig"]["v"]:.0f} TTv {d["tt"]["v"]:.0f} web {d["web"]["pv"]:.0f}')
print("bytes:",args.output.stat().st_size)
