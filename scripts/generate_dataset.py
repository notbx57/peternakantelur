import json
import random
from datetime import datetime, timedelta

random.seed(43)

# Setup farm IDs
farm_ids = ["FARM_001", "FARM_002", "FARM_003"]

# Kategori dengan rentang normal (min, max)
categories = {
    # Kategori pengeluaran
    "Pakan": (5_000_000, 30_000_000),
    "Obat & Vaksin": (200_000, 15_000_000),
    "Gas Elpiji": (300_000, 2_000_000),
    "Gaji Karyawan": (3_000_000, 25_000_000),
    "Listrik": (500_000, 5_000_000),
    "Transportasi": (100_000, 1_000_000),
    "Peralatan": (300_000, 5_000_000),
    "Admin Bank": (2_000, 15_000),
    "Pullet/DOC": (10_000_000, 100_000_000),
    "Pembangunan": (5_000_000, 100_000_000),
    "Lain-lain": (50_000, 3_000_000),
    # Kategori pemasukan
    "Investasi": (10_000_000, 200_000_000),
    "Penjualan Telur": (1_000_000, 10_000_000),
    "Penjualan Ayam": (500_000, 10_000_000),
    "Bunga Bank": (1_000, 15_000),
    "Lainnya": (100_000, 5_000_000),
}

# Batas anomali
anomaly_thresholds = {
    "Pullet/DOC": 100_000_000,
    "Pembangunan": 100_000_000,
    "Investasi": 200_000_000,
    "Penjualan Telur": 10_000_000,
    "Penjualan Ayam": 10_000_000,
    "Bunga Bank": 15_000,
}

# Tipe transaksi per kategori
category_types = {
    "Pakan": "expense",
    "Obat & Vaksin": "expense",
    "Gas Elpiji": "expense",
    "Gaji Karyawan": "expense",
    "Listrik": "expense",
    "Transportasi": "expense",
    "Peralatan": "expense",
    "Admin Bank": "expense",
    "Pullet/DOC": "expense",
    "Pembangunan": "expense",
    "Lain-lain": "expense",
    "Investasi": "income",
    "Penjualan Telur": "income",
    "Penjualan Ayam": "income",
    "Bunga Bank": "income",
    "Lainnya": "income",
}

def random_date_in_range(start_date, end_date):
    """Generate random timestamp between start and end date"""
    time_between = end_date - start_date
    random_seconds = random.randint(0, int(time_between.total_seconds()))
    random_dt = start_date + timedelta(seconds=random_seconds)
    return int(random_dt.timestamp() * 1000)

# Range tanggal: 1 September 2025 - 31 Januari 2026
start_date = datetime(2025, 9, 1)
end_date = datetime(2026, 1, 31, 23, 59, 59)

data = {
    "farm_ids": farm_ids,
    "date_range": {
        "start": "2025-09-01",
        "end": "2026-01-31"
    },
    "anomaly_thresholds": anomaly_thresholds,
    "transactions": []
}

TOTAL_TRANSACTIONS = 1500
ANOMALY_RATIO = 0.08

for i in range(TOTAL_TRANSACTIONS):
    is_anomaly = random.random() < ANOMALY_RATIO
    farm_id = random.choice(farm_ids)
    category = random.choice(list(categories.keys()))
    low, high = categories[category]
    txn_type = category_types[category]
    anomaly_type = None
    
    if is_anomaly:
        # Jenis-jenis anomali
        anomaly_choices = ["amount_outlier", "duplicate", "category_mismatch", "time_pattern"]
        anomaly_type = random.choice(anomaly_choices)
        
        if anomaly_type == "amount_outlier":
            # Anomali berdasarkan threshold yang ditentukan
            if category in anomaly_thresholds:
                threshold = anomaly_thresholds[category]
                amount = threshold * random.uniform(1.5, 5.0)
            else:
                # Untuk kategori tanpa threshold khusus, buat outlier ekstrem
                amount = high * random.uniform(10, 50)
        
        elif anomaly_type == "duplicate" and len(data["transactions"]) > 50:
            # Duplikasi transaksi yang sudah ada
            dup = random.choice(data["transactions"][-50:])
            txn = dup.copy()
            txn["is_anomaly"] = 1
            txn["anomaly_type"] = "duplicate"
            txn["date"] = random_date_in_range(start_date, end_date)
            data["transactions"].append(txn)
            continue
        
        elif anomaly_type == "category_mismatch":
            # Kategori tidak sesuai dengan tipe transaksi
            if txn_type == "expense":
                # Pengeluaran jadi pemasukan (aneh)
                txn_type = "income"
            else:
                # Pemasukan jadi pengeluaran (aneh)
                txn_type = "expense"
            amount = random.randint(low, high)
        
        else:  # time_pattern
            # Transaksi besar di waktu tidak biasa (tengah malam) salah satu anomali juga, mengerikan
            amount = high * random.uniform(5, 15)
            
    else:
        # Transaksi normal
        amount = random.randint(low, high)
    
    # Generate timestamp
    if anomaly_type == "time_pattern":
        # Transaksi tengah malam (00:00 - 04:00)
        random_dt = datetime.fromtimestamp(random_date_in_range(start_date, end_date) / 1000)
        random_dt = random_dt.replace(hour=random.randint(0, 3), minute=random.randint(0, 59))
        timestamp = int(random_dt.timestamp() * 1000)
    else:
        timestamp = random_date_in_range(start_date, end_date)
    
    txn = {
        "id": f"TXN_{i+1:05d}",
        "farm_id": farm_id,
        "description": f"Transaksi {category}",
        "amount": float(amount),
        "type": txn_type,
        "category": category,
        "date": timestamp,
        "date_readable": datetime.fromtimestamp(timestamp / 1000).strftime("%Y-%m-%d %H:%M:%S"),
        "is_anomaly": 1 if is_anomaly else 0
    }
    
    if anomaly_type:
        txn["anomaly_type"] = anomaly_type
    
    data["transactions"].append(txn)

# Sort berdasarkan tanggal
data["transactions"].sort(key=lambda x: x["date"])

# Statistik
total_anomalies = sum(1 for t in data["transactions"] if t["is_anomaly"])
data["statistics"] = {
    "total_transactions": len(data["transactions"]),
    "total_anomalies": total_anomalies,
    "anomaly_percentage": round(total_anomalies / len(data["transactions"]) * 100, 2),
    "anomaly_types": {}
}

# Hitung per jenis anomali
for txn in data["transactions"]:
    if txn.get("anomaly_type"):
        atype = txn["anomaly_type"]
        data["statistics"]["anomaly_types"][atype] = data["statistics"]["anomaly_types"].get(atype, 0) + 1

# Export ke JSON
output_json = json.dumps(data, ensure_ascii=False, indent=2)

print("=" * 60)
print("DATASET ANOMALI PETERNAKAN GENERATED")
print("=" * 60)
print(f"Periode: {data['date_range']['start']} s/d {data['date_range']['end']}")
print(f"Total Transaksi: {data['statistics']['total_transactions']}")
print(f"Total Anomali: {data['statistics']['total_anomalies']} ({data['statistics']['anomaly_percentage']}%)")
print("\nJenis Anomali:")
for atype, count in data["statistics"]["anomaly_types"].items():
    print(f"  - {atype}: {count}")
print("\n" + "=" * 60)
print("\nContoh 5 transaksi pertama:")
print("=" * 60)
for txn in data["transactions"][:5]:
    print(f"\n{txn['id']} - {txn['category']}")
    print(f"  Amount: Rp {txn['amount']:,.0f}")
    print(f"  Type: {txn['type']}")
    print(f"  Date: {txn['date_readable']}")
    print(f"  Anomaly: {'YA (' + txn.get('anomaly_type', '') + ')' if txn['is_anomaly'] else 'TIDAK'}")

print("\n" + "=" * 60)
print("Dataset siap disimpan sebagai JSON!")
print("=" * 60)

# Simpan ke file (uncomment jika ingin save)
# with open("farm_anomaly_dataset_sep2025_jan2026.json", "w", encoding="utf-8") as f:
#     f.write(output_json)import json
import random
from datetime import datetime, timedelta

random.seed(43)

# Setup farm IDs
farm_ids = ["FARM_001", "FARM_002", "FARM_003"]

# Kategori dengan rentang normal (min, max)
categories = {
    # Kategori pengeluaran
    "Pakan": (5_000_000, 30_000_000),
    "Obat & Vaksin": (200_000, 15_000_000),
    "Gas Elpiji": (300_000, 2_000_000),
    "Gaji Karyawan": (3_000_000, 25_000_000),
    "Listrik": (500_000, 5_000_000),
    "Transportasi": (100_000, 1_000_000),
    "Peralatan": (300_000, 5_000_000),
    "Admin Bank": (2_000, 15_000),
    "Pullet/DOC": (10_000_000, 100_000_000),
    "Pembangunan": (5_000_000, 100_000_000),
    "Lain-lain": (50_000, 3_000_000),
    # Kategori pemasukan
    "Investasi": (10_000_000, 200_000_000),
    "Penjualan Telur": (1_000_000, 10_000_000),
    "Penjualan Ayam": (500_000, 10_000_000),
    "Bunga Bank": (1_000, 15_000),
    "Lainnya": (100_000, 5_000_000),
}

# Batas anomali
anomaly_thresholds = {
    "Pullet/DOC": 100_000_000,
    "Pembangunan": 100_000_000,
    "Investasi": 200_000_000,
    "Penjualan Telur": 10_000_000,
    "Penjualan Ayam": 10_000_000,
    "Bunga Bank": 15_000,
}

# Tipe transaksi per kategori
category_types = {
    "Pakan": "expense",
    "Obat & Vaksin": "expense",
    "Gas Elpiji": "expense",
    "Gaji Karyawan": "expense",
    "Listrik": "expense",
    "Transportasi": "expense",
    "Peralatan": "expense",
    "Admin Bank": "expense",
    "Pullet/DOC": "expense",
    "Pembangunan": "expense",
    "Lain-lain": "expense",
    "Investasi": "income",
    "Penjualan Telur": "income",
    "Penjualan Ayam": "income",
    "Bunga Bank": "income",
    "Lainnya": "income",
}

def random_date_in_range(start_date, end_date):
    """Generate random timestamp between start and end date"""
    time_between = end_date - start_date
    random_seconds = random.randint(0, int(time_between.total_seconds()))
    random_dt = start_date + timedelta(seconds=random_seconds)
    return int(random_dt.timestamp() * 1000)

# Range tanggal: 1 September 2025 - 31 Januari 2026
start_date = datetime(2025, 9, 1)
end_date = datetime(2026, 1, 31, 23, 59, 59)

data = {
    "farm_ids": farm_ids,
    "date_range": {
        "start": "2025-09-01",
        "end": "2026-01-31"
    },
    "anomaly_thresholds": anomaly_thresholds,
    "transactions": []
}

TOTAL_TRANSACTIONS = 1500
ANOMALY_RATIO = 0.08

for i in range(TOTAL_TRANSACTIONS):
    is_anomaly = random.random() < ANOMALY_RATIO
    farm_id = random.choice(farm_ids)
    category = random.choice(list(categories.keys()))
    low, high = categories[category]
    txn_type = category_types[category]
    anomaly_type = None
    
    if is_anomaly:
        # Jenis-jenis anomali
        anomaly_choices = ["amount_outlier", "duplicate", "category_mismatch", "time_pattern"]
        anomaly_type = random.choice(anomaly_choices)
        
        if anomaly_type == "amount_outlier":
            # Anomali berdasarkan threshold yang ditentukan
            if category in anomaly_thresholds:
                threshold = anomaly_thresholds[category]
                amount = threshold * random.uniform(1.5, 5.0)
            else:
                # Untuk kategori tanpa threshold khusus, buat outlier ekstrem
                amount = high * random.uniform(10, 50)
        
        elif anomaly_type == "duplicate" and len(data["transactions"]) > 50:
            # Duplikasi transaksi yang sudah ada
            dup = random.choice(data["transactions"][-50:])
            txn = dup.copy()
            txn["is_anomaly"] = 1
            txn["anomaly_type"] = "duplicate"
            txn["date"] = random_date_in_range(start_date, end_date)
            data["transactions"].append(txn)
            continue
        
        elif anomaly_type == "category_mismatch":
            # Kategori tidak sesuai dengan tipe transaksi
            if txn_type == "expense":
                # Pengeluaran jadi pemasukan (aneh)
                txn_type = "income"
            else:
                # Pemasukan jadi pengeluaran (aneh)
                txn_type = "expense"
            amount = random.randint(low, high)
        
        else:  # time_pattern
            # Transaksi besar di waktu tidak biasa (tengah malam)
            amount = high * random.uniform(5, 15)
            
    else:
        # Transaksi normal
        amount = random.randint(low, high)
    
    # Generate timestamp
    if anomaly_type == "time_pattern":
        # Transaksi tengah malam (00:00 - 04:00)
        random_dt = datetime.fromtimestamp(random_date_in_range(start_date, end_date) / 1000)
        random_dt = random_dt.replace(hour=random.randint(0, 3), minute=random.randint(0, 59))
        timestamp = int(random_dt.timestamp() * 1000)
    else:
        timestamp = random_date_in_range(start_date, end_date)
    
    txn = {
        "id": f"TXN_{i+1:05d}",
        "farm_id": farm_id,
        "description": f"Transaksi {category}",
        "amount": float(amount),
        "type": txn_type,
        "category": category,
        "date": timestamp,
        "date_readable": datetime.fromtimestamp(timestamp / 1000).strftime("%Y-%m-%d %H:%M:%S"),
        "is_anomaly": 1 if is_anomaly else 0
    }
    
    if anomaly_type:
        txn["anomaly_type"] = anomaly_type
    
    data["transactions"].append(txn)

# Sort berdasarkan tanggal
data["transactions"].sort(key=lambda x: x["date"])

# Statistik
total_anomalies = sum(1 for t in data["transactions"] if t["is_anomaly"])
data["statistics"] = {
    "total_transactions": len(data["transactions"]),
    "total_anomalies": total_anomalies,
    "anomaly_percentage": round(total_anomalies / len(data["transactions"]) * 100, 2),
    "anomaly_types": {}
}

# Hitung per jenis anomali
for txn in data["transactions"]:
    if txn.get("anomaly_type"):
        atype = txn["anomaly_type"]
        data["statistics"]["anomaly_types"][atype] = data["statistics"]["anomaly_types"].get(atype, 0) + 1

# Export ke JSON
output_json = json.dumps(data, ensure_ascii=False, indent=2)

print("=" * 60)
print("DATASET ANOMALI PETERNAKAN GENERATED")
print("=" * 60)
print(f"Periode: {data['date_range']['start']} s/d {data['date_range']['end']}")
print(f"Total Transaksi: {data['statistics']['total_transactions']}")
print(f"Total Anomali: {data['statistics']['total_anomalies']} ({data['statistics']['anomaly_percentage']}%)")
print("\nJenis Anomali:")
for atype, count in data["statistics"]["anomaly_types"].items():
    print(f"  - {atype}: {count}")
print("\n" + "=" * 60)
print("\nContoh 5 transaksi pertama:")
print("=" * 60)
for txn in data["transactions"][:5]:
    print(f"\n{txn['id']} - {txn['category']}")
    print(f"  Amount: Rp {txn['amount']:,.0f}")
    print(f"  Type: {txn['type']}")
    print(f"  Date: {txn['date_readable']}")
    print(f"  Anomaly: {'YA (' + txn.get('anomaly_type', '') + ')' if txn['is_anomaly'] else 'TIDAK'}")

print("\n" + "=" * 60)
print("Dataset siap disimpan sebagai JSON!")
print("=" * 60)

#Simpan ke file (uncomment jika ingin save)
with open("kandang_anomaly_dataset_sep2025_jan2026.json", "w", encoding="utf-8") as f:
    f.write(output_json)