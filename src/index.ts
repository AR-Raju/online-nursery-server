import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import FormData from "form-data";
import mongoose, { Document, Schema, model } from "mongoose";

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Apply CORS middleware before defining routes
const corsOptions = {
  origin: "http://localhost:5173",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Apply JSON and URL-encoded parsing middleware
app.use(express.json({ limit: "10mb" })); // Increase limit if necessary
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
  rating?: number;
  image_url: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    category: { type: String, required: true },
    rating: { type: Number },
    image_url: { type: String, required: true },
  },
  { timestamps: true }
);

const Product = model<IProduct>("Product", productSchema);

// Define the category schema and model
interface ICategory extends Document {
  name: string;
  cover_img: string;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    cover_img: { type: String, required: true },
  },
  { timestamps: true }
);

const Category = model<ICategory>("Category", categorySchema);

// Define the order schema and model
interface IOrderItem {
  productId: Schema.Types.ObjectId;
  quantity: number;
}

interface IOrder extends Document {
  name: string;
  phoneNumber: string;
  address: string;
  products: IOrderItem[];
  totalAmount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
}

const orderSchema = new Schema<IOrder>(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
    products: [
      {
        productId: {
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
      const searchTerm = (query?.searchTerm as string) || "";
      const searchQuery = Product.find({
        $or: searchAbleFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
        })),
      });

      // Filtering
      const excludeFields = [
        "searchTerm",
        "page",
        "limit",
        "sortTerm",
        "sortOrder",
        "minPrice",
        "maxPrice",
        "categories",
        "minRating",
      ];
      excludeFields.forEach((el) => delete queryObj[el]);

      // Additional filters
      const filterConditions: any = { ...queryObj };

      // Price filter
      if (query.minPrice !== undefined || query.maxPrice !== undefined) {
        filterConditions.price = {};
        if (query.minPrice !== undefined)
          filterConditions.price.$gte = Number(query.minPrice);
        if (query.maxPrice !== undefined)
          filterConditions.price.$lte = Number(query.maxPrice);
      }

      // Categories filter
      if (query.categories) {
        filterConditions.categories = {
          $in: (query.categories as string).split(","),
        };
      }

      // Rating filter - only apply if you have implemented ratings
      if (query.minRating !== undefined) {
        filterConditions.rating = { $gte: Number(query.minRating) };
      }

      console.log("Filter conditions:", filterConditions); // Add this line for debugging
      const filterQuery = searchQuery.find(filterConditions);

      // Sorting
      const sortTerm = (query?.sortTerm as string) || "createdAt";
      const sortOrder = (query?.sortOrder as string) === "desc" ? -1 : 1;
      const sortQuery = filterQuery.sort({ [sortTerm]: sortOrder });

      // Pagination
      const page = Number(query?.page) || 1;
      const limit = Number(query?.limit) || 10;
      const skip = (page - 1) * limit;

      const products = await sortQuery.skip(skip).limit(limit);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Products are retrieved successfully!",
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
          message: "Product is retrieved successfully!",
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
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, price, stock, category, rating, image_base64 } =
      req.body;
    let image_url = "";

    if (image_base64) {
      try {
        const formData = new FormData();
        formData.append("image", image_base64);

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
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Product added successfully!",
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
          message: "Product updated successfully!",
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
        message: "Categories are retrieved successfully!",
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
    const { name, image_base64 } = req.body;
    let image_url = "";

    if (image_base64) {
      try {
        const formData = new FormData();
        formData.append("image", image_base64);

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
      } catch (error) {
        return next(error);
      }
    }
    const category = new Category({ name, cover_img: image_url });
    try {
      const savedCategory = await category.save();
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Category added successfully!",
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
          message: "Category updated successfully!",
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
      const { name, phoneNumber, address, products } = req.body;
      // Check stock and calculate total amount
      let totalAmount = 0;
      for (let item of products) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            statusCode: 404,
            message: `Product with id ${item.productId} not found`,
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
        name,
        phoneNumber,
        address,
        products,
        totalAmount,
      });

      // Save order and update product stock
      const savedOrder = await order.save();
      for (let item of products) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        });
      }

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Order created successfully!",
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
      const orders = await Order.find().populate("products.product");
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Orders are retrived successfully!",
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
        "products.product"
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
