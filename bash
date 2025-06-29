# Clone repo
git clone <repo-url>
cd pc_parts_retail

# Virtualenv & install
env/bin/python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Env vars for Railway
export DATABASE_URL=<railway-db-url>
export SECRET_KEY=<your-secret>

# Apply migrations
flask db init
flask db migrate
flask db upgrade

# Run
env/bin/python run.py
```

## Usage
- `/register` to create a user account
- `/login` to sign in
- `/admin` (admin only) to add and view products
- `/` to browse categories and products

## Deployment
1. Push this repo to GitHub.
2. Create a new Railway project and connect to GitHub repo.
3. Set Railway environment variables `DATABASE_URL` and `SECRET_KEY`.
4. Enable automatic deploys; Railway will detect Flask and run `python run.py` by default.
