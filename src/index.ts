import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import FormData from "form-data";
import fs from "fs";
import mongoose, { Document, Schema, model } from "mongoose";
import multer from "multer";

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to enable CORS
app.use(cors());

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image."));
    }
  },
});

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
  rating: number;
  image_url: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    category: { type: String, required: true },
    rating: { type: Number, required: true },
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

// Define the order schema and model
interface IOrderItem {
  product: Schema.Types.ObjectId;
  quantity: number;
}

interface IOrder extends Document {
  customerName: string;
  phoneNumber: string;
  address: string;
  items: IOrderItem[];
  totalAmount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
}

const orderSchema = new Schema<IOrder>(
  {
    customerName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Order = model<IOrder>("Order", orderSchema);

// API endpoints

// Products
app.get(
  "/api/products",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query;
      const queryObj = { ...query };
      const searchAbleFields = ["name", "description"];

      // Searching
      let searchTerm = (query?.searchTerm as string) || "";
      const SearchQuery = Product.find({
        $or: searchAbleFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
        })),
      });

      // Filtering
      const excludeField = ["searchTerm", "page", "limit"];
      excludeField.forEach((el) => delete queryObj[el]);

      const FilterQuery = SearchQuery.find(queryObj);

      // Sorting
      const sort =
        (query?.sort as string)?.split(",").join(" ") || "-createdAt";
      const SortQuery = FilterQuery.sort(sort);

      // Pagination
      const page = Number(query?.page) || 1;
      const limit = Number(query?.limit) || 10;
      const skip = (page - 1) * limit;

      const products = await SortQuery.skip(skip).limit(limit);

      res.status(200).json({
        success: true,
        statusCode: 200,
        data: products,
      });
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
        res.status(200).json({
          success: true,
          statusCode: 200,
          data: product,
        });
      } else {
        res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Product not found",
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/products",
  upload.single("image_url"),
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, price, stock, category, rating } = req.body;
    let image_url = "";
    if (req.file) {
      const formData = new FormData();
      formData.append("image", fs.createReadStream(req.file.path));

      try {
        const imgbbResponse = await axios.post(
          "https://api.imgbb.com/1/upload",
          formData,
          {
            headers: formData.getHeaders(),
            params: {
              key: process.env.IMAGE_BB_API_KEY,
            },
          }
        );

        image_url = imgbbResponse.data.data.url;

        // Delete the temporary file
        fs.unlinkSync(req.file.path);
      } catch (error) {
        return next(error);
      }
    }

    const product = new Product({
      name,
      description,
      price,
      stock,
      category,
      rating,
      image_url,
    });

    try {
      const savedProduct = await product.save();
      res.status(201).json({
        success: true,
        statusCode: 201,
        data: savedProduct,
      });
    } catch (error) {
      console.error("Error in POST /api/products:", error);
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
        res.status(200).json({
          success: true,
          statusCode: 200,
          data: updatedProduct,
        });
      } else {
        res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Product not found",
        });
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
        res.status(200).json({
          success: true,
          statusCode: 200,
          message: "Product removed",
        });
      } else {
        res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Product not found",
        });
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
      res.status(200).json({
        success: true,
        statusCode: 200,
        data: categories,
      });
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
      res.status(201).json({
        success: true,
        statusCode: 201,
        data: savedCategory,
      });
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
        res.status(200).json({
          success: true,
          statusCode: 200,
          data: updatedCategory,
        });
      } else {
        res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Category not found",
        });
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
        res.status(200).json({
          success: true,
          statusCode: 200,
          message: "Category removed",
        });
      } else {
        res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Category not found",
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Orders
app.post(
  "/api/orders",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerName, phoneNumber, address, items } = req.body;

      // Check stock and calculate total amount
      let totalAmount = 0;
      for (let item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({
            success: false,
            statusCode: 404,
            message: `Product with id ${item.product} not found`,
          });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            message: `Insufficient stock for product ${product.name}`,
          });
        }
        totalAmount += product.price * item.quantity;
      }

      // Create order
      const order = new Order({
        customerName,
        phoneNumber,
        address,
        items,
        totalAmount,
      });

      // Save order and update product stock
      const savedOrder = await order.save();
      for (let item of items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      res.status(201).json({
        success: true,
        statusCode: 201,
        data: savedOrder,
      });
    } catch (error) {
      next(error);
    }
  }
);

// get all order
app.get(
  "/api/orders",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await Order.find().populate("items.product");
      res.status(200).json({
        success: true,
        statusCode: 200,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }
);

// get a specific order
app.get(
  "/api/orders/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await Order.findById(req.params.id).populate(
        "items.product"
      );
      if (order) {
        res.status(200).json({
          success: true,
          statusCode: 200,
          data: order,
        });
      } else {
        res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Order not found",
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// update the order status
app.put(
  "/api/orders/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      );
      if (updatedOrder) {
        res.status(200).json({
          success: true,
          statusCode: 200,
          data: updatedOrder,
        });
      } else {
        res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Order not found",
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Handle Multer error
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err);
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: err.message,
    });
  }
  next(err);
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    statusCode: 500,
    message: err.message,
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: "Route not found",
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
