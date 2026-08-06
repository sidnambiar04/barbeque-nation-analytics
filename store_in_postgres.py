import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME")

# Create SQLAlchemy Engine connection string for PostgreSQL
connection_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

try:
    engine = create_engine(connection_url)
    print(f"🔌 Connected to PostgreSQL Database: '{DB_NAME}' successfully!")
except Exception as e:
    print(f"❌ Connection Error: {e}")
    exit()


# ==========================================
# 2. STORE OUTLETS DATA (barbeque.csv)
# ==========================================
if os.path.exists('barbeque.csv'):
    print("\n📦 Reading 'barbeque.csv'...")
    df_outlets = pd.read_csv('barbeque.csv')
    
    # Store in PostgreSQL table 'barbeque_outlets'
    df_outlets.to_sql('barbeque_outlets', engine, if_exists='replace', index=False)
    print(f"✅ Stored {len(df_outlets)} records in Relational Table 'barbeque_outlets'!")
else:
    print("⚠️ 'barbeque.csv' not found.")


# ==========================================
# 3. STORE INSTAGRAM ANALYTICS DATA (instagramclean.csv)
# ==========================================
if os.path.exists('instagramclean.csv'):
    print("\n📦 Reading 'instagramclean.csv'...")
    df_insta = pd.read_csv('instagramclean.csv')
    
    # Store in PostgreSQL table 'instagram_analytics'
    df_insta.to_sql('instagram_analytics', engine, if_exists='replace', index=False)
    print(f"✅ Stored {len(df_insta)} records in Relational Table 'instagram_analytics'!")
else:
    print("⚠️ 'instagramclean.csv' not found.")


# ==========================================
# 4. STORE REDDIT FEEDBACK DATA (reddit.csv)
# ==========================================
if os.path.exists('reddit.csv'):
    print("\n📦 Reading 'reddit.csv'...")
    df_reddit = pd.read_csv('reddit.csv')
    
    # Store in PostgreSQL table 'reddit_feedback'
    df_reddit.to_sql('reddit_feedback', engine, if_exists='replace', index=False)
    print(f"✅ Stored {len(df_reddit)} records in Relational Table 'reddit_feedback'!")
else:
    print("⚠️ 'reddit.csv' not found.")


# ==========================================
# 5. VERIFY STORED DATA WITH SQL QUERY
# ==========================================
print("\n" + "="*60)
print("🔍 VERIFYING RELATIONAL DATA IN POSTGRESQL")
print("="*60)

query = "SELECT outlet_title, city, pincode, average_rating, total_reviews FROM barbeque_outlets LIMIT 5;"
relational_sample = pd.read_sql_query(query, engine)
print(relational_sample)

print("\n🎉 ALL SOCIAL MEDIA & BUSINESS DATA STORED IN POSTGRESQL SUCCESSFULLY!")