#!/usr/bin/env python3
import glob
import os
import sys

# pandas is an optional dep (only needed for the Thai TMT step) — degrade with a hint instead of a traceback
try:
    import pandas as pd
except ImportError:
    sys.exit("pandas + xlrd required: pip install pandas xlrd")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMT_DIR = os.path.join(ROOT, "data", "TMT")

# pick the first MasterTMT xls; the filename carries a date so sorted() takes the earliest/expected one
matches = sorted(glob.glob(os.path.join(TMT_DIR, "MasterTMT_*.xls")))
if not matches:
    sys.exit(f"No MasterTMT_*.xls found in {TMT_DIR}")

src = matches[0]
dst = os.path.splitext(src)[0] + ".csv"

# TPUCode as nullable Int64 so codes stay integers (no 12345.0) and blanks survive as NA
df = pd.read_excel(src, dtype={"TPUCode": "Int64"})
# rename the vendor columns to the snake_case schema the loader expects; country is a constant for this dataset
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
# drop rows with no TPU code — they can't be keyed/joined downstream
out = out.dropna(subset=["tpu_code"])
out.to_csv(dst, index=False)
print(f"{len(out)} rows -> {dst}")
