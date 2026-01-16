"""
Training Script for Price Forecasting Models

Usage:
    python train_price_forecast_models.py --product "Red Onion" --lookback 365
    python train_price_forecast_models.py --all-products
"""

import argparse
import sys
from pathlib import Path
from datetime import date, datetime
import logging

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "delivery-map-app" / "backend"))

from services.model_training import train_models_for_product
from services.seasonality_forecast import SEASONALITY_INDEX

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def train_all_products(forecast_date: date, lookback_days: int = 365):
    """Train models for all products with seasonality data."""
    products = list(SEASONALITY_INDEX.keys())
    
    logger.info(f"Training models for {len(products)} products...")
    
    results = {}
    
    for product in products:
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"Training models for: {product}")
            logger.info(f"{'='*60}")
            
            result = train_models_for_product(
                product_name=product,
                forecast_date=forecast_date,
                lookback_days=lookback_days
            )
            
            results[product] = {
                'status': 'success',
                'metrics': result['metrics'],
                'model_paths': result['model_paths']
            }
            
            logger.info(f"✅ Successfully trained models for {product}")
            
        except Exception as e:
            logger.error(f"❌ Failed to train models for {product}: {e}")
            results[product] = {
                'status': 'error',
                'error': str(e)
            }
    
    # Summary
    logger.info(f"\n{'='*60}")
    logger.info("Training Summary")
    logger.info(f"{'='*60}")
    
    successful = sum(1 for r in results.values() if r['status'] == 'success')
    failed = len(results) - successful
    
    logger.info(f"✅ Successful: {successful}")
    logger.info(f"❌ Failed: {failed}")
    
    if successful > 0:
        logger.info("\nSuccessful products:")
        for product, result in results.items():
            if result['status'] == 'success':
                logger.info(f"  - {product}")
                if 'metrics' in result:
                    if 'xgboost' in result['metrics']:
                        xgb_mae = result['metrics']['xgboost'].get('val_mae', 'N/A')
                        logger.info(f"    XGBoost Val MAE: {xgb_mae:.2f}" if isinstance(xgb_mae, float) else f"    XGBoost: {xgb_mae}")
                    if 'sarima' in result['metrics']:
                        sarima_mae = result['metrics']['sarima'].get('mae', 'N/A')
                        logger.info(f"    SARIMA MAE: {sarima_mae:.2f}" if isinstance(sarima_mae, float) else f"    SARIMA: {sarima_mae}")
    
    if failed > 0:
        logger.info("\nFailed products:")
        for product, result in results.items():
            if result['status'] == 'error':
                logger.info(f"  - {product}: {result.get('error', 'Unknown error')}")
    
    return results


def main():
    parser = argparse.ArgumentParser(description='Train price forecasting models')
    parser.add_argument(
        '--product',
        type=str,
        help='Product name to train (e.g., "Red Onion")'
    )
    parser.add_argument(
        '--all-products',
        action='store_true',
        help='Train models for all products with seasonality data'
    )
    parser.add_argument(
        '--forecast-date',
        type=str,
        default=None,
        help='Forecast date (YYYY-MM-DD), defaults to today'
    )
    parser.add_argument(
        '--lookback',
        type=int,
        default=365,
        help='Number of days to look back for training data (default: 365)'
    )
    
    args = parser.parse_args()
    
    # Parse forecast date
    if args.forecast_date:
        forecast_date = datetime.strptime(args.forecast_date, '%Y-%m-%d').date()
    else:
        forecast_date = date.today()
    
    if args.all_products:
        train_all_products(forecast_date, args.lookback)
    elif args.product:
        try:
            logger.info(f"Training models for: {args.product}")
            result = train_models_for_product(
                product_name=args.product,
                forecast_date=forecast_date,
                lookback_days=args.lookback
            )
            
            logger.info("\n✅ Training complete!")
            logger.info(f"Metrics: {result['metrics']}")
            logger.info(f"Models saved to: {result['model_paths']}")
            
        except Exception as e:
            logger.error(f"❌ Training failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

