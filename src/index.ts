import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import mongoose, { Document, Schema, model } from "mongoose";

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define the product schema and model
interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    category: { type: String, required: true },
    image_url: { type: String, required: true },
  },
  { timestamps: true }
);

const Product = model<IProduct>("Product", productSchema);

// Define the category schema and model
interface ICategory extends Document {
  name: string;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

const Category = model<ICategory>("Category", categorySchema);

// API endpoints

// Products
app.get(
  "/api/products",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await Product.find();
      res.json(products);
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/products/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await Product.findById(req.params.id);
      if (product) {
        res.json(product);
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/products",
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, price, stock, category, image_url } = req.body;
    const product = new Product({
      name,
      description,
      price,
      stock,
      category,
      image_url,
    });
    try {
      const savedProduct = await product.save();
      res.status(201).json(savedProduct);
    } catch (error) {
      next(error);
    }
  }
);

app.put(
  "/api/products/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (updatedProduct) {
        res.json(updatedProduct);
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/products/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deletedProduct = await Product.findByIdAndDelete(req.params.id);
      if (deletedProduct) {
        res.json({ message: "Product removed" });
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Categories
app.get(
  "/api/categories",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await Category.find();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/categories",
  async (req: Request, res: Response, next: NextFunction) => {
    const { name } = req.body;
    const category = new Category({ name });
    try {
      const savedCategory = await category.save();
      res.status(201).json(savedCategory);
    } catch (error) {
      next(error);
    }
  }
);

app.put(
  "/api/categories/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updatedCategory = await Category.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (updatedCategory) {
        res.json(updatedCategory);
      } else {
        res.status(404).json({ message: "Category not found" });
      }
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/categories/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deletedCategory = await Category.findByIdAndDelete(req.params.id);
      if (deletedCategory) {
        res.json({ message: "Category removed" });
      } else {
        res.status(404).json({ message: "Category not found" });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: err.message });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
