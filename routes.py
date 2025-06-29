from flask import render_template, redirect, url_for, flash, request
from flask_login import current_user, login_user, logout_user, login_required
from run import env, db, login
from forms import RegistrationForm, LoginForm, ProductForm
from models import User, Product, Category

@login.user_loader
def load_user(id):
    return User.query.get(int(id))

@env.route('/')
def index():
    cats = Category.query.all()
    return render_template('index.html', categories=cats)

@env.route('/register', methods=['GET','POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Registration successful.')
        return redirect(url_for('login'))
    return render_template('register.html', form=form)

@env.route('/login', methods=['GET','POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember_me.data)
            return redirect(request.args.get('next') or url_for('index'))
        flash('Invalid credentials.')
    return render_template('login.html', form=form)

@env.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

@env.route('/admin')
@login_required
def admin_dashboard():
    if not current_user.is_admin:
        flash('Access denied.')
        return redirect(url_for('index'))
    products = Product.query.all()
    return render_template('admin.html', products=products)

@env.route('/admin/product/add', methods=['GET','POST'])
@login_required
def add_product():
    if not current_user.is_admin:
        flash('Access denied.')
        return redirect(url_for('index'))
    form = ProductForm()
    if form.validate_on_submit():
        p = Product(
            name=form.name.data,
            description=form.description.data,
            price=form.price.data,
            stock=form.stock.data,
            category_id=form.category.data
        )
        db.session.add(p)
        db.session.commit()
        flash('Product added.')
        return redirect(url_for('admin_dashboard'))
    return render_template('add_product.html', form=form)
