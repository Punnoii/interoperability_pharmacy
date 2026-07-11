#!/usr/bin/env python3
import glob
import os
import sys

try:
    import pandas as pd
except ImportError:
    sys.exit("pandas + xlrd required: pip install pandas xlrd")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMT_DIR = os.path.join(ROOT, "data", "TMT")

matches = sorted(glob.glob(os.path.join(TMT_DIR, "MasterTMT_*.xls")))
if not matches:
    sys.exit(f"No MasterTMT_*.xls found in {TMT_DIR}")

src = matches[0]
dst = os.path.splitext(src)[0] + ".csv"

df = pd.read_excel(src, dtype={"TPUCode": "Int64"})
out = pd.DataFrame({
    "tpu_code": df["TPUCode"],
    "active_ingredient": df["ActiveIngredient"],
    "strength": df["Strength"],
    "dosage_form": df["Dosageform"],
    "cont_value": df["Contvalue"],
    "cont_unit": df["Contunit"],
    "disp_unit": df["DispUnit"],
    "trade_name": df["TradeName"],
    "manufacturer": df["Manufacturer"],
    "fsn": df["FSN"],
    "status": df["Status"],
    "country": "Thailand",
})
out = out.dropna(subset=["tpu_code"])
out.to_csv(dst, index=False)
print(f"{len(out)} rows -> {dst}")
