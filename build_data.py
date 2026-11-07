#!/usr/bin/env python
"""Extract everything the dashboard needs from the Code Ocean capsule into one JSON.

Reads capsule/results (the capsule's own published model output) and
capsule/data/Observed (for the historical record extremes), and writes
dashboard_data.json. Nothing is re-trained: the capsule's published results are
the source of truth, and the aggregation here mirrors the capsule's own
plotting code (code/Codes for main manuscript plots/).

Run:  python build_data.py
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parent

CFS_TO_M3S = 0.028316847
FT_TO_M = 0.3048

# Critical Period Management stages. Triggers are Supplementary Table S2; the
# capsule code carries the same values in cfs / ft.
STAGES = [
    {"id": "CS1", "comal": 225 * CFS_TO_M3S, "j17": 660 * FT_TO_M, "cutback": 20},
    {"id": "CS2", "comal": 200 * CFS_TO_M3S, "j17": 650 * FT_TO_M, "cutback": 30},
    {"id": "CS3", "comal": 150 * CFS_TO_M3S, "j17": 640 * FT_TO_M, "cutback": 35},
    {"id": "CS4", "comal": 100 * CFS_TO_M3S, "j17": 630 * FT_TO_M, "cutback": 40},
    {"id": "CS5", "comal": 45 * CFS_TO_M3S, "j17": 625 * FT_TO_M, "cutback": 44},
]

# Comal projection files carry only Q; J17 files carry both Q and GWL.
COL = {
    "comal": "$Q_{min}^{pred}$ [$m^3/s$]",
    "j17": "$GWL_{min}^{pred}$ [m]",
}
OBS_COL = {"comal": "$Q_{min}$ [$m^3/s$]", "j17": "$GWL_{min}$ [m]"}
SITE_FILE = {"comal": "Comal", "j17": "J17"}

CMIP5 = ["CMCC-CM", "HadGEM2-CC", "inmcm4"]
CMIP6 = ["EC-Earth3", "INM-CM4-8", "INM-CM5-0", "KACE-1-0-G", "KIOST-ESM", "MPI-ESM1-2-HR"]
SCENARIOS = {
    "CMIP5": [("rcp45", "RCP 4.5"), ("rcp85", "RCP 8.5")],
    "CMIP6": [("ssp245", "SSP 2-4.5"), ("ssp585", "SSP 5-8.5")],
}
DECADE_STARTS = list(range(2023, 2099, 10))  # matches the capsule's Fig 3/4 code

r3 = lambda x: None if pd.isna(x) else round(float(x), 3)


def proj_series(proj, site, gcm, scenario, mit):
    """Weekly projected series, aggregated exactly as the capsule's Fig 3/4 code does."""
    path = proj / f"{SITE_FILE[site]}_{gcm}_df_GCM_{scenario}_xgb_T_{mit}_Tr.xlsx"
    d = pd.read_excel(path)
    d["time"] = pd.to_datetime(d["time"])
    s = d.set_index("time")[COL[site]].resample("W").min()
    s[s < 0] = 0  # capsule clips negative predictions to zero
    return s


def box_stats(v):
    """Tukey boxplot summary — the components defined in the paper's Fig. 2 legend."""
    v = np.asarray(v, dtype=float)
    v = v[~np.isnan(v)]
    if v.size == 0:
        return None
    q1, med, q3 = np.percentile(v, [25, 50, 75])
    iqr = q3 - q1
    lo = v[v >= q1 - 1.5 * iqr]
    hi = v[v <= q3 + 1.5 * iqr]
    return {
        "q1": round(float(q1), 3),
        "med": round(float(med), 3),
        "q3": round(float(q3), 3),
        "lo": round(float(lo.min() if lo.size else v.min()), 3),
        "hi": round(float(hi.max() if hi.size else v.max()), 3),
        "n": int(v.size),
        "zero": round(float((v <= 0).mean() * 100), 1),  # % of weeks at no-flow
    }


def build_historical(cai):
    """Fig 1 + Fig 2: observed (factual) vs counterfactual, per site and period."""
    out = {}
    dates = {}
    for period, tag in [("validation", "Test"), ("counterfactual", "Pred")]:
        for site in ("comal", "j17"):
            d = pd.read_excel(cai / f"{SITE_FILE[site]}_min_df_AI_{tag}.xlsx")
            d["DATE"] = pd.to_datetime(d["DATE"])
            obs, pred = d[OBS_COL[site]], d[COL[site]]
            dates.setdefault(period, [x.strftime("%Y-%m-%d") for x in d["DATE"]])
            out[f"{site}_{period}"] = {
                "observed": [r3(x) for x in obs],
                "counterfactual": [r3(x) for x in pred],
                "r2": round(float(r2_score(obs, pred)), 3),
                "rmse": round(float(np.sqrt(mean_squared_error(obs, pred))), 3),
                "obs_median": r3(obs.median()),
                "cf_median": r3(pred.median()),
                "obs_min": r3(obs.min()),
                "cf_min": r3(pred.min()),
                "years": [int(d["DATE"].dt.year.min()), int(d["DATE"].dt.year.max())],
            }
    return {"dates": dates, "series": out}


def build_decadal(proj):
    """Fig 3 + Fig 4: decadal boxplots per GCM, scenario and mitigation state."""
    out = {}
    for gen, gcms in (("CMIP5", CMIP5), ("CMIP6", CMIP6)):
        for gcm in gcms:
            for scenario, _ in SCENARIOS[gen]:
                for site in ("comal", "j17"):
                    for mit in ("NM", "M"):
                        s = proj_series(proj, site, gcm, scenario, mit)
                        boxes = []
                        for y in DECADE_STARTS:
                            seg = s[str(y) : str(y + 9)]
                            boxes.append(box_stats(seg.values))
                        out[f"{site}|{gcm}|{scenario}|{mit}"] = boxes
                        print(f"  decadal {site:5s} {gcm:14s} {scenario:6s} {mit:2s}")
    return out


def build_envelope(proj):
    """Figs S5-S8: across-GCM ensemble mean and bounds, shown as annual averages."""
    out = {}
    years = None
    for gen, gcms in (("CMIP5", CMIP5), ("CMIP6", CMIP6)):
        for scenario, _ in SCENARIOS[gen]:
            for site in ("comal", "j17"):
                for mit in ("NM", "M"):
                    frame = pd.DataFrame(
                        {g: proj_series(proj, site, g, scenario, mit) for g in gcms}
                    )
                    # Envelope is the spread ACROSS models at each week, then
                    # averaged to years so the chart stays readable.
                    weekly = pd.DataFrame(
                        {
                            "mean": frame.mean(axis=1),
                            "lo": frame.min(axis=1),
                            "hi": frame.max(axis=1),
                        }
                    )
                    annual = weekly.resample("YE").mean()
                    annual = annual[(annual.index.year >= 2023) & (annual.index.year <= 2099)]
                    if years is None:
                        years = [int(y) for y in annual.index.year]
                    out[f"{site}|{gen}|{scenario}|{mit}"] = {
                        k: [r3(x) for x in annual[k]] for k in ("mean", "lo", "hi")
                    }
                    print(f"  envelope {site:5s} {gen} {scenario:6s} {mit:2s}")
    return {"years": years, "data": out}


def build_observed_extremes(obs):
    """Lowest values in the instrumental record — the LR-Q / LR-GWL reference lines."""
    comal = pd.read_excel(obs / "Comal_Spring_until_6_15_2023.xlsx", thousands=",", skiprows=30)
    q = pd.to_numeric(comal["14n"], errors="coerce").dropna() * CFS_TO_M3S
    cq = comal[["DATE"]].copy()
    cq["q"] = pd.to_numeric(comal["14n"], errors="coerce") * CFS_TO_M3S
    cq["DATE"] = pd.to_datetime(cq["DATE"], errors="coerce")
    no_flow_days = int((cq["q"] <= 0).sum())

    j17 = pd.read_excel(obs / "J17_Index_well_until_6_15_2023.xlsx", thousands=",")
    gwl = pd.to_numeric(j17["Water Level Elevation"], errors="coerce").dropna() * FT_TO_M

    return {
        "comal_min": r3(q.min()),
        "comal_no_flow_days": no_flow_days,
        "comal_record_start": str(cq["DATE"].min().date()),
        "j17_min": r3(gwl.min()),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capsule-dir", type=Path, default=ROOT / "capsule")
    parser.add_argument("--output", type=Path, default=ROOT / "dashboard_data.json")
    args = parser.parse_args()
    cai = args.capsule_dir / "results" / "Results CAI Predictions"
    proj = args.capsule_dir / "results" / "Results Projections"
    obs = args.capsule_dir / "data" / "Observed"

    print("historical (Fig 1/2)...")
    historical = build_historical(cai)
    print("decadal (Fig 3/4)...")
    decadal = build_decadal(proj)
    print("ensemble envelope (Fig S5-S8)...")
    envelope = build_envelope(proj)
    print("observed extremes...")
    extremes = build_observed_extremes(obs)

    payload = {
        "meta": {
            "title": "Efficacy of mitigation strategies for aquifer sustainability under climate change",
            "journal": "Nature Sustainability 8, 44-53 (2025)",
            "doi": "10.1038/s41893-024-01477-6",
            "capsule": "https://codeocean.com/capsule/1967889/tree/v1",
            "capsule_doi": "10.24433/CO.1405116.v1",
        },
        "stages": STAGES,
        "cmip5": CMIP5,
        "cmip6": CMIP6,
        "scenarios": SCENARIOS,
        "decadeStarts": DECADE_STARTS,
        "historical": historical,
        "decadal": decadal,
        "envelope": envelope,
        "extremes": extremes,
    }

    data = json.dumps(payload, separators=(",", ":"), allow_nan=False)
    args.output.write_text(data, encoding="utf-8", newline="\n")
    print(f"\nwrote {args.output}  ({args.output.stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
