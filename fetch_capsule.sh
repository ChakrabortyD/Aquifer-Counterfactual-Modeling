#!/usr/bin/env bash
# Downloads the published Code Ocean capsule 1967889 (v1.0) artifacts that the
# dashboard is built from. Code itself comes from:
#   git clone https://git.codeocean.com/capsule-1967889.git
# but /data and /results are not in that git repo, so they are fetched here.
set -eu
cd "$(dirname "$0")"
BASE="https://files.codeocean.com/files/verified/188e89f9-d30e-470c-ae40-93d23c111555_v1.0"
RES="$BASE/results.70ff2d9f-2e7e-4f6a-97bf-c4a37f74b807"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
get () ( # get <url> <dest>
  [ -s "$2" ] && return 0
  mkdir -p "$(dirname "$2")"
  tmp=$(mktemp "$2.XXXXXX")
  trap 'rm -f -- "$tmp"' EXIT
  curl -fsSL -A "$UA" -H "Referer: https://codeocean.com/" -o "$tmp" "$1"
  mv -f -- "$tmp" "$2"
)

GCM5="CMCC-CM HadGEM2-CC inmcm4"
GCM6="EC-Earth3 INM-CM4-8 INM-CM5-0 KACE-1-0-G KIOST-ESM MPI-ESM1-2-HR"

for s in Comal J17; do
  for k in Pred Test; do
    get "$RES/Results%20CAI%20Predictions/${s}_min_df_AI_${k}.xlsx" \
        "capsule/results/Results CAI Predictions/${s}_min_df_AI_${k}.xlsx"
  done
done

for s in Comal J17; do
  for g in $GCM5 $GCM6; do
    case " $GCM5 " in *" $g "*) SC="rcp45 rcp85";; *) SC="ssp245 ssp585";; esac
    for sc in $SC; do
      for m in M NM; do
        f="${s}_${g}_df_GCM_${sc}_xgb_T_${m}_Tr.xlsx"
        get "$RES/Results%20Projections/${f}" "capsule/results/Results Projections/${f}"
      done
    done
  done
done

for f in "Comal_Spring_until_6_15_2023.xlsx" \
         "J17_Index_well_until_6_15_2023.xlsx"; do
  get "$BASE/data/Obs_GCM_Data/Observed/${f// /%20}" "capsule/data/Observed/$f"
done

echo "done"
