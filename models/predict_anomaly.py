#!/usr/bin/env python3

import sys
import json
import math
import os
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def load_models():
    """Load semua model dan encoder yang dibutuhin"""
    try:
        import joblib
        
        model = joblib.load(os.path.join(SCRIPT_DIR, 'anomaly_detector_rf.joblib'))
        scaler = joblib.load(os.path.join(SCRIPT_DIR, 'scaler.joblib'))
        le_category = joblib.load(os.path.join(SCRIPT_DIR, 'le_category.joblib'))
        le_farm = joblib.load(os.path.join(SCRIPT_DIR, 'le_farm.joblib'))
        le_type = joblib.load(os.path.join(SCRIPT_DIR, 'le_type.joblib'))
        
        with open(os.path.join(SCRIPT_DIR, 'model_config.json'), 'r') as f:
            config = json.load(f)
        
        return {
            'model': model,
            'scaler': scaler,
            'le_category': le_category,
            'le_farm': le_farm,
            'le_type': le_type,
            'config': config
        }
    except Exception as e:
        return {'error': str(e)}


def engineer_features(tx, config, le_category, le_type):
    """Hitung semua fitur yang dipengenin model"""
    amount = float(tx.get('amount', 0))
    tx_type = tx.get('type', 'expense')
    category = tx.get('category', 'Lain-lain')
    date_ms = tx.get('date', 0)
    farm_id = tx.get('farm_id', 'KANDANG1')
    
    # Parse tanggal dulu
    try:
        dt = datetime.fromtimestamp(date_ms / 1000)
    except:
        dt = datetime.now()
    
    # Fitur jumlah dasar
    amount_log = math.log1p(amount)
    
    # Fitur waktu
    day_of_week = dt.weekday()
    day_of_month = dt.day
    hour_of_day = dt.hour
    month = dt.month
    is_weekend = 1 if day_of_week >= 5 else 0
    is_month_end = 1 if day_of_month >= 28 else 0
    is_night_time = 1 if 0 <= hour_of_day <= 4 else 0
    
    # Cek kategori vs tipe nyambung ga
    expense_categories = config.get('expense_categories', [])
    income_categories = config.get('income_categories', [])
    
    category_type_mismatch = 0
    if category in expense_categories and tx_type == 'income':
        category_type_mismatch = 1
    elif category in income_categories and tx_type == 'expense':
        category_type_mismatch = 1
    
    # Cek bates wajar
    thresholds = config.get('anomaly_thresholds', {})
    exceeds_threshold = 0
    if category in thresholds and amount > thresholds[category]:
        exceeds_threshold = 1
    
    # Encode variabel kategori
    try:
        category_encoded = le_category.transform([category])[0]
    except:
        category_encoded = config.get('category_mapping', {}).get(category, 0)
    
    try:
        type_encoded = le_type.transform([tx_type])[0]
    except:
        type_encoded = 0 if tx_type == 'expense' else 1
    
    # Encode kandang - pake mapping dari config soalnya data asli bisa beda
    farm_mapping = {'KANDANG1': 0, 'KANDANG2': 1, 'KANDANG3': 2, 
                   'AYAM PERTAMA': 0, 'AYAM KEDUA': 1, 'Kandang KEVIN': 2}
    farm_encoded = farm_mapping.get(farm_id, 0)
    
    # Nilai placeholder buat fitur yang butuh konteks historis
    # Kalo udah live, ini diitung dari history transaksi beneran
    amount_zscore_category = 0  # Butuh statistik kategori
    amount_zscore_farm = 0  # Butuh statistik kandang
    amount_to_category_median = 1  # Butuh, median kategori
    category_frequency = 0.1  # Butuh frekuensi
    daily_transaction_count = 1  # Butuh hitungan harian
    is_potential_duplicate = 0  # Butuh deteksi duplikat
    
    # Vektor fitur urutannya(dari model_config.json)
    features = [
        amount_log,
        amount_zscore_category,
        amount_zscore_farm,
        amount_to_category_median,
        category_type_mismatch,
        is_weekend,
        is_month_end,
        is_night_time,
        category_frequency,
        daily_transaction_count,
        is_potential_duplicate,
        exceeds_threshold,
        category_encoded,
        farm_encoded,
        type_encoded,
        day_of_week,
        day_of_month,
        hour_of_day,
        month
    ]
    
    return features


def predict_single(tx, models):
    """Tebak anomali buat satu transaksi"""
    if 'error' in models:
        return {
            'is_anomaly': False,
            'confidence': 0,
            'anomaly_reasons': [],
            'error': models['error']
        }
    
    try:
        features = engineer_features(
            tx, 
            models['config'], 
            models['le_category'], 
            models['le_type']
        )
        
        # Skalain fitur
        import numpy as np
        features_array = np.array(features).reshape(1, -1)
        features_scaled = models['scaler'].transform(features_array)
        
        # Predict model
        prediction = models['model'].predict(features_scaled)[0]
        
        # Ambil probabilitas
        if hasattr(models['model'], 'predict_proba'):
            proba = models['model'].predict_proba(features_scaled)[0]
            confidence = float(max(proba))
        else:
            confidence = 1.0 if prediction == 1 else 0.0
        
        # Alasan anomali
        anomaly_reasons = []
        if prediction == 1:
            # Cek apa yang bikin jadi anomali
            dt = datetime.fromtimestamp(tx.get('date', 0) / 1000)
            if 0 <= dt.hour <= 4:
                anomaly_reasons.append('time_pattern')
            
            category = tx.get('category', '')
            tx_type = tx.get('type', '')
            config = models['config']
            
            if category in config.get('expense_categories', []) and tx_type == 'income':
                anomaly_reasons.append('category_mismatch')
            elif category in config.get('income_categories', []) and tx_type == 'expense':
                anomaly_reasons.append('category_mismatch')
            
            thresholds = config.get('anomaly_thresholds', {})
            if category in thresholds and tx.get('amount', 0) > thresholds[category]:
                anomaly_reasons.append('amount_outlier')
            
            if not anomaly_reasons:
                anomaly_reasons.append('model_detected')
        
        return {
            'is_anomaly': bool(prediction == 1),
            'confidence': round(confidence, 3),
            'anomaly_reasons': anomaly_reasons
        }
        
    except Exception as e:
        return {
            'is_anomaly': False,
            'confidence': 0,
            'anomaly_reasons': [],
            'error': str(e)
        }


def main():
    """Pintu masuk utama - baca dari stdin, keluar ke stdout"""
    try:
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        # Load model-modelnya
        models = load_models()
        
        transactions = data.get('transactions', [])
        
        if not transactions:
            # Mode satu transaksi doang
            result = predict_single(data, models)
            print(json.dumps(result))
        else:
            # Mode borongan (batch)
            results = []
            for tx in transactions:
                prediction = predict_single(tx, models)
                results.append({
                    **tx,
                    'anomaly': prediction
                })
            
            anomaly_count = sum(1 for r in results if r['anomaly']['is_anomaly'])
            
            output = {
                'total': len(results),
                'anomaly_count': anomaly_count,
                'anomaly_percentage': round(anomaly_count / len(results) * 100, 2) if results else 0,
                'transactions': results
            }
            print(json.dumps(output))
            
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Geje nih input JSON-nya: {str(e)}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
