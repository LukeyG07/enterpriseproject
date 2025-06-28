-- Drop existing tables
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS categories;

-- Categories
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);
INSERT INTO categories(name) VALUES
  ('CPU'),('GPU'),('Motherboard'),('RAM'),
  ('PSU'),('Case'),('Fan'),('CPU Cooler')
ON CONFLICT DO NOTHING;

-- Products with image URL and specific attributes
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INT NOT NULL REFERENCES categories(id),
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  socket TEXT,
  ram_type TEXT,
  memory_size INT,
  chipset TEXT,
  form_factor TEXT,
  capacity INT,
  wattage INT,
  efficiency TEXT,
  case_size TEXT,
  fan_size INT,
  cooler_type TEXT
);

-- Inventory
CREATE TABLE inventory (
  product_id INT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  stock INT NOT NULL DEFAULT 0
);

-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders and items
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id) ON DELETE SET NULL,
  quantity INT NOT NULL,
  price NUMERIC(10,2) NOT NULL
);
