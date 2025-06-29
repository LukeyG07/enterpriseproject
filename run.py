from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from config import Config

env = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')
env.config.from_object(Config)

# Extensions
 db = SQLAlchemy(env)
 migrate = Migrate(env, db)
 login = LoginManager(env)
 login.login_view = 'login'

# Models must be imported before routes\ nimport models, routes

# Initialize DB and default admin
with env.app_context():
    db.create_all()
    from models import User
    if not User.query.filter_by(username='admin').first():
        admin = User(username='admin', is_admin=True)
        admin.set_password('password')
        db.session.add(admin)
        db.session.commit()

if __name__ == '__main__':
    env.run(debug=True)
