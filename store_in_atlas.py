import pandas as pd
from pymongo import MongoClient
import os

from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "barbeque_nation_nosql")

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    print(f"🔌 Connected to MongoDB Atlas Cloud Database: '{DB_NAME}'!")
except Exception as e:
    print(f"❌ Connection Error: {e}")
    exit()

# 1. Push Instagram Data
if os.path.exists('instagramclean.csv'):
    df_insta = pd.read_csv('instagramclean.csv')
    records = df_insta.to_dict(orient='records')
    db['instagram_posts'].drop()
    db['instagram_posts'].insert_many(records)
    print(f"✅ Uploaded {len(records)} Instagram posts to Atlas!")

# 2. Push Reddit Data
if os.path.exists('reddit.csv'):
    df_reddit = pd.read_csv('reddit.csv')
    records = df_reddit.to_dict(orient='records')
    db['reddit_comments'].drop()
    db['reddit_comments'].insert_many(records)
    print(f"✅ Uploaded {len(records)} Reddit comments to Atlas!")

# 3. Push Outlets Data
if os.path.exists('barbeque.csv'):
    df_outlets = pd.read_csv('barbeque.csv')
    records = df_outlets.to_dict(orient='records')
    db['barbeque_outlets'].drop()
    db['barbeque_outlets'].insert_many(records)
    print(f"✅ Uploaded {len(records)} Outlets to Atlas!")

print("\n🎉 ALL SOCIAL MEDIA DATA STORED IN MONGODB ATLAS SUCCESSFULLY!")