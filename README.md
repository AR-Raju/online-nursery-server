# online-nursery-server

This is a RESTful API for an e-commerce platform built with Express.js, MongoDB, and TypeScript. It provides endpoints for managing products, categories, and orders.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
  - [Products](#products)
  - [Categories](#categories)
  - [Orders](#orders)
- [Error Handling](#error-handling)
- [File Upload](#file-upload)

## Prerequisites

- Node.js
- MongoDB
- TypeScript

## Installation

1. Clone the repository:
   git clone https://github.com/yourusername/your-repo-name.git

2. Navigate to the project directory:
   cd your-repo-name
   Copy
3. Install dependencies:
   npm install
   Copy

## Environment Variables

Create a `.env` file in the root directory and add the following variables:
PORT=5000
MONGO_URI=your_mongodb_connection_string
IMAGE_BB_API_KEY=your_imgbb_api_key
Copy

## Running the Server

To start the server, run:
npm start
Copy
The server will start on the port specified in your `.env` file (default is 5000).

## API Endpoints

### Products

- **GET /api/products**

  - Description: Retrieve all products
  - Query Parameters:
    - `searchTerm`: Search products by name or description
    - `page`: Page number for pagination
    - `limit`: Number of items per page
    - `sort`: Field to sort by (prefix with `-` for descending order)
  - Example: `GET /api/products?searchTerm=phone&page=1&limit=10&sort=-price`

- **GET /api/products/:id**

  - Description: Retrieve a specific product by ID

- **POST /api/products**

  - Description: Create a new product
  - Body:
    - `name`: String (required)
    - `description`: String (required)
    - `price`: Number (required)
    - `stock`: Number (required)
    - `category`: String (required)
    - `rating`: Number (required)
    - `image_url`: File upload (optional)

- **PUT /api/products/:id**

  - Description: Update a product

- **DELETE /api/products/:id**
  - Description: Delete a product

### Categories

- **GET /api/categories**

  - Description: Retrieve all categories

- **POST /api/categories**

  - Description: Create a new category
  - Body:
    - `name`: String (required)

- **PUT /api/categories/:id**

  - Description: Update a category

- **DELETE /api/categories/:id**
  - Description: Delete a category

### Orders

- **GET /api/orders**

  - Description: Retrieve all orders

- **GET /api/orders/:id**

  - Description: Retrieve a specific order by ID

- **POST /api/orders**

  - Description: Create a new order
  - Body:
    - `customerName`: String (required)
    - `phoneNumber`: String (required)
    - `address`: String (required)
    - `items`: Array of objects (required)
      - `product`: Product ID (required)
      - `quantity`: Number (required)

- **PUT /api/orders/:id**
  - Description: Update an order status
  - Body:
    - `status`: String (required) - One of: 'pending', 'processing', 'shipped', 'delivered', 'cancelled'

## Error Handling

The API uses a global error handling middleware to catch and respond to errors. All error responses follow this format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message"
}
```

## File Upload

The API supports image upload for products using the multer middleware. Images are uploaded to ImgBB using their API.
