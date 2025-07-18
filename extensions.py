from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

# instantiate extensions without app

db = SQLAlchemy()
migrate = Migrate()
login = LoginManager()
login.login_view = 'login'
