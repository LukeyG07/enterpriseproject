import os
from flask import Flask
from config import Config
from extensions import db, migrate, login

# create app
app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')
app.config.from_object(Config)

# initialize extensions with app
db.init_app(app)
migrate.init_app(app, db)
login.init_app(app)

# import modules that use extensions
import models  # noqa: F401
import routes  # noqa: F401

# initialize DB & create default admin
with app.app_context():
    db.create_all()
    from models import User
    if not User.query.filter_by(username='admin').first():
        admin = User(username='admin', is_admin=True)
        admin.set_password('password')
        db.session.add(admin)
        db.session.commit()

# run server
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
