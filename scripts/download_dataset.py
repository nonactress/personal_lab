"""
nonactress/Nemotron-Personas-Korea-bucket -> data/nemotron_full.parquet
실행: python scripts/download_dataset.py
소요: 수 분 (HF_TOKEN 필요)
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("HF_TOKEN")
if not token:
    raise SystemExit("HF_TOKEN이 .env에 없습니다.")

Path("data").mkdir(exist_ok=True)
out = Path("data/nemotron_full.parquet")

if out.exists():
    print(f"이미 존재: {out} ({out.stat().st_size / 1e9:.2f} GB)")
    raise SystemExit(0)

print("데이터셋 로드 중…")
from datasets import load_dataset

ds = load_dataset(
    "nonactress/Nemotron-Personas-Korea-bucket",
    split="train",
    token=token,
)
print(f"  행 수: {len(ds):,}")
print("parquet 저장 중…")
ds.to_parquet(str(out))
print(f"완료: {out} ({out.stat().st_size / 1e9:.2f} GB)")
